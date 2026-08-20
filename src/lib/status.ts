// Shared display metadata for every enum in the Prisma schema.
// Import from here instead of re-declaring labels/colors in each module.

export const TASK_STATUS: Record<string, { label: string; tone: "neutral" | "accent" | "success" | "warning" | "danger" | "info" }> = {
  BACKLOG: { label: "Backlog", tone: "neutral" },
  TODO: { label: "To Do", tone: "info" },
  IN_PROGRESS: { label: "In Progress", tone: "accent" },
  BLOCKED: { label: "Blocked", tone: "danger" },
  IN_REVIEW: { label: "In Review", tone: "warning" },
  DONE: { label: "Done", tone: "success" },
  CANCELLED: { label: "Cancelled", tone: "neutral" },
};

export const PROJECT_STATUS: Record<string, { label: string; tone: "neutral" | "accent" | "success" | "warning" | "danger" | "info" }> = {
  PLANNING: { label: "Planning", tone: "neutral" },
  ACTIVE: { label: "Active", tone: "accent" },
  ON_HOLD: { label: "On Hold", tone: "warning" },
  AT_RISK: { label: "At Risk", tone: "warning" },
  DELAYED: { label: "Delayed", tone: "danger" },
  COMPLETED: { label: "Completed", tone: "success" },
  CANCELLED: { label: "Cancelled", tone: "neutral" },
};

export const PRIORITY: Record<string, { label: string; tone: "neutral" | "accent" | "success" | "warning" | "danger" | "info"; weight: number }> = {
  LOW: { label: "Low", tone: "neutral", weight: 0 },
  MEDIUM: { label: "Medium", tone: "info", weight: 1 },
  HIGH: { label: "High", tone: "warning", weight: 2 },
  CRITICAL: { label: "Critical", tone: "danger", weight: 3 },
};

export const BLOCKER_STATUS: Record<string, { label: string; tone: "neutral" | "accent" | "success" | "warning" | "danger" | "info" }> = {
  OPEN: { label: "Open", tone: "danger" },
  IN_PROGRESS: { label: "In Progress", tone: "warning" },
  RESOLVED: { label: "Resolved", tone: "success" },
};

export const BLOCKER_SEVERITY: Record<string, { label: string; tone: "neutral" | "accent" | "success" | "warning" | "danger" | "info" }> = {
  LOW: { label: "Low", tone: "neutral" },
  MEDIUM: { label: "Medium", tone: "info" },
  HIGH: { label: "High", tone: "warning" },
  CRITICAL: { label: "Critical", tone: "danger" },
};

export const LEAVE_STATUS: Record<string, { label: string; tone: "neutral" | "accent" | "success" | "warning" | "danger" | "info" }> = {
  PENDING: { label: "Pending", tone: "warning" },
  APPROVED: { label: "Approved", tone: "success" },
  REJECTED: { label: "Rejected", tone: "danger" },
  CANCELLED: { label: "Cancelled", tone: "neutral" },
};

export const LEAVE_TYPE: Record<string, { label: string }> = {
  ANNUAL: { label: "Annual Leave" },
  SICK: { label: "Sick Leave" },
  PUBLIC_HOLIDAY: { label: "Public Holiday" },
  UNPAID: { label: "Unpaid Leave" },
  OTHER: { label: "Other" },
};

export const UPDATE_FREQUENCY: Record<string, { label: string }> = {
  DAILY: { label: "Daily" },
  WEEKLY: { label: "Weekly" },
  BIWEEKLY: { label: "Bi-weekly" },
  MONTHLY: { label: "Monthly" },
};

export const KPI_FREQUENCY: Record<string, { label: string }> = {
  DAILY: { label: "Daily" },
  WEEKLY: { label: "Weekly" },
  MONTHLY: { label: "Monthly" },
  QUARTERLY: { label: "Quarterly" },
};

export const ORG_LEVEL: Record<string, { label: string; tone: "neutral" | "accent" | "success" | "warning" | "danger" | "info" }> = {
  CIO: { label: "CIO", tone: "accent" },
  DIRECTOR: { label: "Director", tone: "info" },
  HEAD_OF_DEPARTMENT: { label: "Head of Department", tone: "warning" },
  MANAGER: { label: "Manager", tone: "success" },
  LEAD: { label: "Lead", tone: "neutral" },
  STAFF: { label: "Staff", tone: "neutral" },
};

export const NOTIFICATION_TYPE: Record<string, { label: string }> = {
  ASSIGNMENT: { label: "Assignment" },
  DELEGATION: { label: "Delegation" },
  STATUS_CHANGE: { label: "Status change" },
  MENTION: { label: "Mention" },
  BLOCKER: { label: "Blocker" },
  UPDATE_REQUEST: { label: "Update request" },
  LEAVE: { label: "Leave" },
  KPI: { label: "KPI" },
  DEADLINE: { label: "Deadline" },
  SYSTEM: { label: "System" },
};
