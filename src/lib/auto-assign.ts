// Auto-assign / reassign-on-leave logic.
//
// Fully automatic silent reassignment is risky (it can move work off someone's
// plate without anyone noticing), so this module is deliberately split in two:
//
//   1. Pure "suggestion" helpers (isUserOnLeave, suggestReassignment,
//      listReassignmentCandidates, buildCoverageQueue) that only read data and
//      compute recommendations. Nothing here writes to the database.
//   2. `applyReassignment`, the single function that actually mutates
//      TaskAssignment rows — and it only runs when a human confirms a
//      suggestion from the review queue (see /workload's "Coverage
//      suggestions while people are away" panel and the
//      /api/workload/reassign route).
//
// `buildCoverageQueue` is the computation that used to be described as
// "autoReassignOnLeave" in the brief — it scans active leave and produces
// actionable suggestions rather than mutating anything on its own.

import { prisma as defaultPrisma } from "@/lib/prisma";
import type { Prisma, PrismaClient } from "@prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;

const ACTIVE_TASK_STATUSES = ["BACKLOG", "TODO", "IN_PROGRESS", "BLOCKED", "IN_REVIEW"] as const;
const CLOSED_TASK_STATUSES = ["DONE", "CANCELLED"] as const;
const HORIZON_DAYS = 14;

export type ReassignReason = "backup" | "team" | "manager";

export interface CandidateUser {
  id: string;
  name: string;
  title: string | null;
  avatarColor: string;
  avatarEmoji: string | null;
  activeLoad: number;
}

export interface Suggestion {
  user: CandidateUser;
  reason: ReassignReason;
}

export interface CoverageItem {
  leaveRequestId: string;
  leaveType: string;
  leaveEndDate: Date;
  onLeaveUser: { id: string; name: string; avatarColor: string; avatarEmoji: string | null; title: string | null };
  assignmentId: string;
  taskId: string;
  taskTitle: string;
  taskStatus: string;
  taskPriority: string;
  taskDueDate: Date | null;
  suggestion: Suggestion | null;
  candidates: CandidateUser[];
}

function parseBackupIds(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/** True if the user has an APPROVED leave request covering `date` (defaults to now). */
export async function isUserOnLeave(userId: string, date: Date = new Date(), db: Db = defaultPrisma): Promise<boolean> {
  const leave = await getActiveLeave(userId, date, db);
  return !!leave;
}

/** The APPROVED leave request (if any) covering `date` for this user. */
export async function getActiveLeave(userId: string, date: Date = new Date(), db: Db = defaultPrisma) {
  return db.leaveRequest.findFirst({
    where: { userId, status: "APPROVED", startDate: { lte: date }, endDate: { gte: date } },
    orderBy: { startDate: "desc" },
  });
}

/** Count of a user's task assignments on tasks that aren't finished — a light workload signal. */
async function activeAssignmentCount(userId: string, db: Db): Promise<number> {
  return db.taskAssignment.count({
    where: { userId, task: { status: { notIn: [...CLOSED_TASK_STATUSES] } } },
  });
}

async function toCandidateUser(userId: string, db: Db): Promise<CandidateUser | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, title: true, avatarColor: true, avatarEmoji: true, active: true },
  });
  if (!user || !user.active) return null;
  const activeLoad = await activeAssignmentCount(userId, db);
  return { id: user.id, name: user.name, title: user.title, avatarColor: user.avatarColor, avatarEmoji: user.avatarEmoji, activeLoad };
}

/**
 * Ranked pool of people who could reasonably cover for `leavingUserId`, excluding
 * anyone already on the task and anyone themselves on leave right now. Ordered by
 * current active workload (lightest first) within each source, but the caller
 * decides which source (backups / team / manager-siblings) to prefer.
 */
async function pool(userIds: string[], exclude: Set<string>, db: Db): Promise<CandidateUser[]> {
  const unique = [...new Set(userIds)].filter((id) => !exclude.has(id));
  const out: CandidateUser[] = [];
  for (const id of unique) {
    if (await isUserOnLeave(id, new Date(), db)) continue;
    const candidate = await toCandidateUser(id, db);
    if (candidate) out.push(candidate);
  }
  return out.sort((a, b) => a.activeLoad - b.activeLoad || a.name.localeCompare(b.name));
}

/**
 * Every reasonable replacement for `leavingUserId` on `taskId`, broadest list first
 * (backups, then teammates, then manager-siblings), deduplicated and capped. Used to
 * populate the "choose someone else" picker in the coverage queue UI.
 */
export async function listReassignmentCandidates(
  taskId: string,
  leavingUserId: string,
  db: Db = defaultPrisma
): Promise<{ backups: CandidateUser[]; teammates: CandidateUser[]; managerSiblings: CandidateUser[] }> {
  const task = await db.task.findUnique({ where: { id: taskId }, select: { assignments: { select: { userId: true } } } });
  const exclude = new Set<string>([leavingUserId, ...(task?.assignments.map((a) => a.userId) ?? [])]);

  const [activeLeave, memberships, leavingUser] = await Promise.all([
    getActiveLeave(leavingUserId, new Date(), db),
    db.teamMembership.findMany({ where: { userId: leavingUserId }, select: { teamId: true } }),
    db.user.findUnique({ where: { id: leavingUserId }, select: { managerId: true } }),
  ]);

  const backupIds = parseBackupIds(activeLeave?.backupUserIds ?? null);

  const teamIds = memberships.map((m) => m.teamId);
  const teammateIds = teamIds.length
    ? (await db.teamMembership.findMany({ where: { teamId: { in: teamIds } }, select: { userId: true } })).map((m) => m.userId)
    : [];

  const managerSiblingIds = leavingUser?.managerId
    ? (await db.user.findMany({ where: { managerId: leavingUser.managerId }, select: { id: true } })).map((u) => u.id)
    : [];

  const [backups, teammates, managerSiblings] = await Promise.all([
    pool(backupIds, exclude, db),
    pool(teammateIds, exclude, db),
    pool(managerSiblingIds, exclude, db),
  ]);

  return { backups, teammates, managerSiblings };
}

/**
 * The single best suggested replacement for `leavingUserId` (or the first assignee
 * currently on leave, if not given) on `taskId`. Preference order: designated
 * backup on their active leave request, then a teammate who isn't on leave, then
 * another report of the same manager. Returns null if nobody qualifies.
 */
export async function suggestReassignment(taskId: string, leavingUserId?: string, db: Db = defaultPrisma): Promise<Suggestion | null> {
  const task = await db.task.findUnique({
    where: { id: taskId },
    select: { assignments: { select: { userId: true } } },
  });
  if (!task) return null;

  let onLeaveUserId = leavingUserId;
  if (!onLeaveUserId) {
    for (const a of task.assignments) {
      if (await isUserOnLeave(a.userId, new Date(), db)) {
        onLeaveUserId = a.userId;
        break;
      }
    }
  }
  if (!onLeaveUserId) return null;

  const { backups, teammates, managerSiblings } = await listReassignmentCandidates(taskId, onLeaveUserId, db);

  if (backups.length) return { user: backups[0], reason: "backup" };
  if (teammates.length) return { user: teammates[0], reason: "team" };
  if (managerSiblings.length) return { user: managerSiblings[0], reason: "manager" };
  return null;
}

/**
 * Scans every currently-active APPROVED leave request, finds that person's
 * assignments on tasks which aren't finished and are either due within
 * `HORIZON_DAYS` or already in progress, and computes a coverage suggestion for
 * each — without writing anything. This is the data behind the "Coverage
 * suggestions while people are away" review queue.
 */
export async function buildCoverageQueue(db: Db = defaultPrisma): Promise<CoverageItem[]> {
  const now = new Date();
  const horizon = new Date(now.getTime() + HORIZON_DAYS * 24 * 60 * 60 * 1000);

  const activeLeave = await db.leaveRequest.findMany({
    where: { status: "APPROVED", startDate: { lte: now }, endDate: { gte: now } },
    include: { user: { select: { id: true, name: true, avatarColor: true, avatarEmoji: true, title: true, active: true } } },
    orderBy: { startDate: "asc" },
  });

  const items: CoverageItem[] = [];

  for (const leave of activeLeave) {
    if (!leave.user.active) continue;

    const assignments = await db.taskAssignment.findMany({
      where: {
        userId: leave.userId,
        task: { status: { notIn: [...CLOSED_TASK_STATUSES] } },
      },
      include: { task: { select: { id: true, title: true, status: true, priority: true, dueDate: true } } },
    });

    for (const a of assignments) {
      // Only surface tasks that are due soon or already in progress — not the
      // person's entire backlog.
      const dueSoon = a.task.dueDate ? a.task.dueDate.getTime() <= horizon.getTime() : false;
      if (a.task.status !== "IN_PROGRESS" && !dueSoon) continue;

      const suggestion = await suggestReassignment(a.taskId, leave.userId, db);
      const { backups, teammates, managerSiblings } = await listReassignmentCandidates(a.taskId, leave.userId, db);
      const candidates = [...backups, ...teammates, ...managerSiblings]
        .filter((c, i, arr) => arr.findIndex((x) => x.id === c.id) === i)
        .slice(0, 8);

      items.push({
        leaveRequestId: leave.id,
        leaveType: leave.type,
        leaveEndDate: leave.endDate,
        onLeaveUser: { id: leave.user.id, name: leave.user.name, avatarColor: leave.user.avatarColor, avatarEmoji: leave.user.avatarEmoji, title: leave.user.title },
        assignmentId: a.id,
        taskId: a.taskId,
        taskTitle: a.task.title,
        taskStatus: a.task.status,
        taskPriority: a.task.priority,
        taskDueDate: a.task.dueDate,
        suggestion,
        candidates,
      });
    }
  }

  return items;
}

/**
 * Applies a confirmed reassignment: creates a new TaskAssignment for `newUserId`
 * (autoAssigned: true, reassignedFromId pointing at the old assignment) and
 * removes the old assignment so the task doesn't end up double-booked. Only call
 * this after a human has approved the suggestion.
 */
export async function applyReassignment(assignmentId: string, newUserId: string, db: PrismaClient = defaultPrisma) {
  return db.$transaction(async (tx) => {
    const old = await tx.taskAssignment.findUnique({ where: { id: assignmentId } });
    if (!old) throw new Error("Assignment not found");

    const existing = await tx.taskAssignment.findUnique({
      where: { taskId_userId: { taskId: old.taskId, userId: newUserId } },
    });

    let created = existing;
    if (!existing) {
      created = await tx.taskAssignment.create({
        data: {
          taskId: old.taskId,
          userId: newUserId,
          isPrimary: old.isPrimary,
          autoAssigned: true,
          reassignedFromId: old.id,
        },
      });
    }

    await tx.taskAssignment.delete({ where: { id: old.id } });

    const task = await tx.task.findUnique({ where: { id: old.taskId }, select: { title: true } });
    await tx.notification.create({
      data: {
        userId: newUserId,
        type: "ASSIGNMENT",
        title: "New task assignment",
        body: task ? `You were assigned "${task.title}" to cover for a teammate on leave.` : "You were assigned a task to cover for a teammate on leave.",
        link: "/workload",
      },
    });

    return created;
  });
}

export { ACTIVE_TASK_STATUSES };
