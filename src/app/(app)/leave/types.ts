export interface LeaveUser {
  id: string;
  name: string;
  title: string | null;
  avatarColor: string;
  avatarEmoji: string | null;
  departmentId: string | null;
  managerId: string | null;
  level: string;
}

export interface LeaveRequestDTO {
  id: string;
  userId: string;
  user: { id: string; name: string; avatarColor: string; avatarEmoji: string | null; departmentId: string | null };
  type: string;
  startDate: string;
  endDate: string;
  halfDay: boolean;
  status: string;
  reason: string | null;
  createdAt: string;
  approverId: string | null;
  approver: { id: string; name: string } | null;
  backupUserIds: string | null;
}

// Distinct swatch colors per leave type — kept local to this feature since
// src/lib/status.ts only carries badge tones, not raw colors for bars/legends.
export const LEAVE_TYPE_COLOR: Record<string, string> = {
  ANNUAL: "var(--accent)",
  SICK: "var(--danger)",
  PUBLIC_HOLIDAY: "var(--info)",
  UNPAID: "var(--muted-2)",
  OTHER: "var(--warning)",
};
