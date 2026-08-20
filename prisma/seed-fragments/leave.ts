// Seed fragment for the Leave / Workload / Auto-assign feature slice.
// Idempotent: skips entirely if any LeaveRequest already exists.
// Expects org (User/Team/TeamMembership) and project/task data to already be
// seeded — looks everything up via findMany rather than hardcoded ids, and
// degrades gracefully (logs + returns) if the prerequisites aren't there yet.

import type { PrismaClient, TaskStatus } from "@prisma/client";

const LEAVE_TYPES = ["ANNUAL", "SICK", "PUBLIC_HOLIDAY", "UNPAID", "OTHER"] as const;
const CLOSED_TASK_STATUSES: TaskStatus[] = ["DONE", "CANCELLED"];

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  r.setHours(0, 0, 0, 0);
  return r;
}

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, arr.length));
}

// Weighted toward the two most common leave types (ANNUAL, SICK), with the
// remaining LEAVE_TYPES appearing occasionally for variety.
function randomLeaveType(): (typeof LEAVE_TYPES)[number] {
  const weighted: (typeof LEAVE_TYPES)[number][] = [
    ...Array(5).fill("ANNUAL"),
    ...Array(3).fill("SICK"),
    ...LEAVE_TYPES.filter((t) => t !== "ANNUAL" && t !== "SICK"),
  ];
  return pick(weighted);
}

interface Spec {
  userId: string;
  type: (typeof LEAVE_TYPES)[number];
  startDate: Date;
  endDate: Date;
  halfDay: boolean;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reason: string | null;
  approverId: string | null;
  backupUserIds: string[];
}

const REASONS = [
  "Family trip",
  "Recharging",
  "Medical appointment",
  "Not feeling well",
  "Wedding — attending as a guest",
  "Moving apartments",
  "Visiting family",
  null,
  null,
];

export default async function seedLeave(prisma: PrismaClient) {
  const existing = await prisma.leaveRequest.count();
  if (existing > 0) {
    console.log(`[seed:leave] ${existing} leave request(s) already exist — skipping.`);
    return;
  }

  const users = await prisma.user.findMany({
    where: { active: true },
    select: { id: true, name: true, managerId: true, level: true },
  });
  if (users.length === 0) {
    console.log("[seed:leave] no users found — run the org seed first. Skipping.");
    return;
  }

  const cio = users.find((u) => u.level === "CIO") ?? null;
  const byId = new Map(users.map((u) => [u.id, u]));

  function approverFor(userId: string): string | null {
    const u = byId.get(userId);
    if (u?.managerId && byId.has(u.managerId)) return u.managerId;
    if (cio && cio.id !== userId) return cio.id;
    return null;
  }

  const memberships = await prisma.teamMembership.findMany({ select: { userId: true, teamId: true } });
  const teamsByUser = new Map<string, string[]>();
  const usersByTeam = new Map<string, string[]>();
  for (const m of memberships) {
    teamsByUser.set(m.userId, [...(teamsByUser.get(m.userId) ?? []), m.teamId]);
    usersByTeam.set(m.teamId, [...(usersByTeam.get(m.teamId) ?? []), m.userId]);
  }
  function teammatesOf(userId: string): string[] {
    const teamIds = teamsByUser.get(userId) ?? [];
    const set = new Set<string>();
    for (const t of teamIds) for (const u of usersByTeam.get(t) ?? []) if (u !== userId) set.add(u);
    return [...set];
  }

  // People with at least one active (non-DONE/CANCELLED) task assignment —
  // used to make sure the coverage-suggestion queue has real cases to show.
  const activeAssignments = await prisma.taskAssignment.findMany({
    where: { task: { status: { notIn: CLOSED_TASK_STATUSES } } },
    select: { userId: true },
  });
  const usersWithActiveTasksSet = new Set(activeAssignments.map((a) => a.userId));
  const usersWithActiveTasks = users.filter((u) => usersWithActiveTasksSet.has(u.id));

  const nonCio = users.filter((u) => !cio || u.id !== cio.id);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const specs: Spec[] = [];

  function maybeBackups(userId: string): string[] {
    if (Math.random() > 0.4) return [];
    const mates = teammatesOf(userId);
    if (mates.length === 0) return [];
    return pickN(mates, randInt(1, Math.min(2, mates.length)));
  }

  // --- 1. Currently active leave (spans today) ---------------------------
  // At least 4 of these are people who also carry active task assignments,
  // so the coverage-suggestion review queue has real work to reason about.
  const currentLeavePool = usersWithActiveTasks.length >= 4 ? usersWithActiveTasks : nonCio;
  const currentLeaveCount = Math.max(4, Math.min(6, currentLeavePool.length));
  const currentLeaveUsers = pickN(currentLeavePool, currentLeaveCount);

  for (const u of currentLeaveUsers) {
    const start = addDays(today, -randInt(0, 3));
    const end = addDays(today, randInt(1, 6));
    specs.push({
      userId: u.id,
      type: randomLeaveType(),
      startDate: start,
      endDate: end,
      halfDay: false,
      status: "APPROVED",
      reason: pick(REASONS),
      approverId: approverFor(u.id),
      backupUserIds: maybeBackups(u.id),
    });
  }

  // --- 2. Past leave, already over, all APPROVED --------------------------
  const pastCount = 7;
  for (let i = 0; i < pastCount; i++) {
    const u = pick(nonCio);
    const start = addDays(today, -randInt(20, 150));
    const end = addDays(start, randInt(0, 5));
    specs.push({
      userId: u.id,
      type: randomLeaveType(),
      startDate: start,
      endDate: end,
      halfDay: Math.random() < 0.15,
      status: "APPROVED",
      reason: pick(REASONS),
      approverId: approverFor(u.id),
      backupUserIds: [],
    });
  }

  // --- 3. Future leave — mix of PENDING and APPROVED, occasional REJECTED -
  const futureCount = 11;
  for (let i = 0; i < futureCount; i++) {
    const u = pick(nonCio);
    const start = addDays(today, randInt(3, 90));
    const end = addDays(start, randInt(0, 7));
    const roll = Math.random();
    const status: Spec["status"] = roll < 0.55 ? "PENDING" : roll < 0.9 ? "APPROVED" : "REJECTED";
    specs.push({
      userId: u.id,
      type: randomLeaveType(),
      startDate: start,
      endDate: end,
      halfDay: Math.random() < 0.1,
      status,
      reason: pick(REASONS),
      approverId: status === "PENDING" ? null : approverFor(u.id),
      backupUserIds: maybeBackups(u.id),
    });
  }

  for (const s of specs) {
    await prisma.leaveRequest.create({
      data: {
        userId: s.userId,
        type: s.type,
        startDate: s.startDate,
        endDate: s.endDate,
        halfDay: s.halfDay,
        status: s.status,
        reason: s.reason,
        approverId: s.approverId,
        backupUserIds: s.backupUserIds.length ? JSON.stringify(s.backupUserIds) : null,
      },
    });
  }

  console.log(
    `[seed:leave] created ${specs.length} leave requests (${currentLeaveUsers.length} currently active, ${pastCount} past, ${futureCount} future).`
  );
}
