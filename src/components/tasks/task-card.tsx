import Link from "next/link";
import { AvatarStack } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { QuickStatus } from "./quick-status";
import { PRIORITY } from "@/lib/status";
import { cn, formatDateShort } from "@/lib/utils";
import { isTaskOverdue } from "@/lib/task-utils";
import { GitBranch } from "lucide-react";

export interface TaskCardData {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: Date | string | null;
  delegationDepth: number;
  project?: { id: string; name: string; code: string } | null;
  assignments: { user: { id: string; name: string; avatarColor: string; avatarEmoji: string | null } }[];
  _count?: { subtasks: number };
}

export function TaskCard({ task, showProject = false }: { task: TaskCardData; showProject?: boolean }) {
  const overdue = isTaskOverdue(task.dueDate, task.status as never);
  return (
    <div className="rounded-[12px] border border-border bg-surface p-3 shadow-[var(--shadow-xs)] transition-shadow hover:shadow-[var(--shadow-sm)]">
      <div className="flex items-start justify-between gap-2">
        <Link href={`/tasks/${task.id}`} className="min-w-0 flex-1">
          <p className="text-[13px] font-medium leading-snug hover:text-accent transition-colors">{task.title}</p>
        </Link>
        {task.priority !== "MEDIUM" && (
          <Badge tone={PRIORITY[task.priority]?.tone ?? "neutral"} className="shrink-0">
            {PRIORITY[task.priority]?.label}
          </Badge>
        )}
      </div>
      {showProject && task.project && (
        <p className="mt-1 text-[11px] text-muted-2">{task.project.code} · {task.project.name}</p>
      )}
      <div className="mt-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {task.assignments.length > 0 && (
            <AvatarStack users={task.assignments.map((a) => a.user)} max={3} size="xs" />
          )}
          {task.delegationDepth > 0 && (
            <span title={`Delegated ${task.delegationDepth}x`} className="flex items-center gap-0.5 text-[10.5px] text-muted-2">
              <GitBranch className="h-3 w-3" /> {task.delegationDepth}
            </span>
          )}
        </div>
        {task.dueDate && (
          <span className={cn("text-[11px]", overdue ? "font-semibold text-danger" : "text-muted-2")}>
            {formatDateShort(task.dueDate)}
          </span>
        )}
      </div>
      <div className="mt-2.5 flex items-center justify-between border-t border-border-soft pt-2.5">
        <QuickStatus taskId={task.id} status={task.status} size="sm" />
      </div>
    </div>
  );
}
