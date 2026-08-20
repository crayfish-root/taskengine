// Shared helpers for the Projects & Tasks module.
import { Priority, TaskStatus } from "@prisma/client";

/** Kanban column order (CANCELLED is intentionally excluded from the board). */
export const KANBAN_STATUSES: TaskStatus[] = [
  "BACKLOG",
  "TODO",
  "IN_PROGRESS",
  "BLOCKED",
  "IN_REVIEW",
  "DONE",
];

export const ALL_TASK_STATUSES: TaskStatus[] = [...KANBAN_STATUSES, "CANCELLED"];

export const TERMINAL_STATUSES: TaskStatus[] = ["DONE", "CANCELLED"];

export function isTaskOverdue(dueDate: Date | string | null | undefined, status: TaskStatus) {
  if (!dueDate) return false;
  if (TERMINAL_STATUSES.includes(status)) return false;
  const d = typeof dueDate === "string" ? new Date(dueDate) : dueDate;
  return d.getTime() < Date.now();
}

export function isProjectOverdue(targetDate: Date | string | null | undefined, status: string) {
  if (!targetDate) return false;
  if (status === "COMPLETED" || status === "CANCELLED") return false;
  const d = typeof targetDate === "string" ? new Date(targetDate) : targetDate;
  return d.getTime() < Date.now();
}

export function computeProgress(tasks: { status: TaskStatus }[]) {
  const total = tasks.length;
  const done = tasks.filter((t) => t.status === "DONE").length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return { total, done, pct };
}

export const PRIORITY_WEIGHT: Record<Priority, number> = {
  LOW: 0,
  MEDIUM: 1,
  HIGH: 2,
  CRITICAL: 3,
};

/** Minimal user shape used across pickers/avatars in this module. */
export interface LiteUser {
  id: string;
  name: string;
  email: string;
  title: string | null;
  level: string;
  avatarColor: string;
  avatarEmoji: string | null;
  departmentId: string | null;
  managerId: string | null;
}

export const LITE_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  title: true,
  level: true,
  avatarColor: true,
  avatarEmoji: true,
  departmentId: true,
  managerId: true,
} as const;
