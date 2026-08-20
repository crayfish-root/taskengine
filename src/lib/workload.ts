// Workload heatmap data computation — shared between the /workload page and
// the coverage-suggestions API. Pure read/compute, no mutations.

import { prisma } from "@/lib/prisma";
import { addWeeks, startOfWeek, endOfWeek, format } from "date-fns";

const WEEK_COUNT = 8;
/** Hours/week treated as "full" for color-scale purposes. Deliberately below a
 * literal 40 to account for meetings/overhead — most people feel "at capacity"
 * well before every hour is booked. */
const CAPACITY_HOURS = 32;
const DEFAULT_TASK_HOURS = 4;
const OPEN_TASK_STATUSES = ["BACKLOG", "TODO", "IN_PROGRESS", "BLOCKED", "IN_REVIEW"] as const;

export interface WorkloadWeek {
  start: Date;
  end: Date;
  label: string;
}

export interface WorkloadTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: Date | null;
  projectName: string | null;
  estimatedHours: number | null;
}

export interface WorkloadCell {
  hours: number;
  intensity: number; // 0..1, capped
  onLeave: boolean;
  leaveType: string | null;
  tasks: WorkloadTask[];
}

export interface WorkloadRow {
  user: {
    id: string;
    name: string;
    title: string | null;
    avatarColor: string;
    avatarEmoji: string | null;
    departmentId: string | null;
    level: string;
  };
  cells: WorkloadCell[];
}

export interface WorkloadGrid {
  weeks: WorkloadWeek[];
  rows: WorkloadRow[];
}

export function buildWeeks(from: Date = new Date(), count: number = WEEK_COUNT): WorkloadWeek[] {
  const weeks: WorkloadWeek[] = [];
  const firstStart = startOfWeek(from, { weekStartsOn: 1 });
  for (let i = 0; i < count; i++) {
    const start = addWeeks(firstStart, i);
    const end = endOfWeek(start, { weekStartsOn: 1 });
    weeks.push({ start, end, label: format(start, "MMM d") });
  }
  return weeks;
}

export async function buildWorkloadGrid(opts: { departmentId?: string; teamId?: string } = {}): Promise<WorkloadGrid> {
  const weeks = buildWeeks();
  const rangeStart = weeks[0].start;
  const rangeEnd = weeks[weeks.length - 1].end;

  const userWhere: Record<string, unknown> = { active: true };
  if (opts.departmentId) userWhere.departmentId = opts.departmentId;
  if (opts.teamId) userWhere.teamMemberships = { some: { teamId: opts.teamId } };

  const users = await prisma.user.findMany({
    where: userWhere,
    select: { id: true, name: true, title: true, avatarColor: true, avatarEmoji: true, departmentId: true, level: true },
    orderBy: [{ level: "asc" }, { name: "asc" }],
  });
  if (users.length === 0) return { weeks, rows: [] };

  const userIds = users.map((u) => u.id);

  const assignments = await prisma.taskAssignment.findMany({
    where: {
      userId: { in: userIds },
      task: { status: { in: [...OPEN_TASK_STATUSES] }, dueDate: { gte: rangeStart, lte: rangeEnd } },
    },
    select: {
      userId: true,
      task: {
        select: { id: true, title: true, status: true, priority: true, dueDate: true, estimatedHours: true, project: { select: { name: true } } },
      },
    },
  });

  const leave = await prisma.leaveRequest.findMany({
    where: { userId: { in: userIds }, status: "APPROVED", startDate: { lte: rangeEnd }, endDate: { gte: rangeStart } },
    select: { userId: true, startDate: true, endDate: true, type: true },
  });

  // Bucket assignments by userId -> weekIndex
  const byUserWeek = new Map<string, Map<number, WorkloadTask[]>>();
  for (const a of assignments) {
    const due = a.task.dueDate!;
    const weekIndex = weeks.findIndex((w) => due >= w.start && due <= w.end);
    if (weekIndex === -1) continue;
    if (!byUserWeek.has(a.userId)) byUserWeek.set(a.userId, new Map());
    const weekMap = byUserWeek.get(a.userId)!;
    if (!weekMap.has(weekIndex)) weekMap.set(weekIndex, []);
    weekMap.get(weekIndex)!.push({
      id: a.task.id,
      title: a.task.title,
      status: a.task.status,
      priority: a.task.priority,
      dueDate: a.task.dueDate,
      projectName: a.task.project?.name ?? null,
      estimatedHours: a.task.estimatedHours,
    });
  }

  // Bucket leave by userId -> weekIndex -> type (a leave request may span multiple weeks)
  const leaveByUserWeek = new Map<string, Map<number, string>>();
  for (const l of leave) {
    if (!leaveByUserWeek.has(l.userId)) leaveByUserWeek.set(l.userId, new Map());
    const weekMap = leaveByUserWeek.get(l.userId)!;
    weeks.forEach((w, i) => {
      if (l.startDate <= w.end && l.endDate >= w.start) weekMap.set(i, l.type);
    });
  }

  const rows: WorkloadRow[] = users.map((u) => {
    const weekMap = byUserWeek.get(u.id);
    const userLeave = leaveByUserWeek.get(u.id);
    const cells: WorkloadCell[] = weeks.map((_, i) => {
      const tasks = weekMap?.get(i) ?? [];
      const hours = tasks.reduce((sum, t) => sum + (t.estimatedHours ?? DEFAULT_TASK_HOURS), 0);
      return {
        hours,
        intensity: Math.min(1, hours / CAPACITY_HOURS),
        onLeave: userLeave?.has(i) ?? false,
        leaveType: userLeave?.get(i) ?? null,
        tasks,
      };
    });
    return {
      user: { id: u.id, name: u.name, title: u.title, avatarColor: u.avatarColor, avatarEmoji: u.avatarEmoji, departmentId: u.departmentId, level: u.level },
      cells,
    };
  });

  return { weeks, rows };
}
