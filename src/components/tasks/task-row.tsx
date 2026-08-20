import Link from "next/link";
import { AvatarStack } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { QuickStatus } from "./quick-status";
import { PRIORITY } from "@/lib/status";
import { cn, formatDateShort } from "@/lib/utils";
import { isTaskOverdue } from "@/lib/task-utils";
import { GitBranch } from "lucide-react";
import { TaskCardData } from "./task-card";

export function TaskRow({ task, showProject = false }: { task: TaskCardData; showProject?: boolean }) {
  const overdue = isTaskOverdue(task.dueDate, task.status as never);
  return (
    <div className="flex items-center gap-3 border-b border-border-soft px-1 py-2.5 last:border-b-0">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Link href={`/tasks/${task.id}`} className="truncate text-[13px] font-medium hover:text-accent transition-colors">
            {task.title}
          </Link>
          {task.delegationDepth > 0 && (
            <span title={`Delegated ${task.delegationDepth}x`} className="flex items-center gap-0.5 shrink-0 text-[10.5px] text-muted-2">
              <GitBranch className="h-3 w-3" /> {task.delegationDepth}
            </span>
          )}
        </div>
        {showProject && task.project && (
          <p className="truncate text-[11px] text-muted-2">{task.project.code} · {task.project.name}</p>
        )}
      </div>
      <Badge tone={PRIORITY[task.priority]?.tone ?? "neutral"} className="shrink-0">
        {PRIORITY[task.priority]?.label}
      </Badge>
      {task.dueDate ? (
        <span className={cn("w-[76px] shrink-0 text-right text-[11.5px]", overdue ? "font-semibold text-danger" : "text-muted")}>
          {formatDateShort(task.dueDate)}
        </span>
      ) : (
        <span className="w-[76px] shrink-0" />
      )}
      <div className="w-[92px] shrink-0">
        {task.assignments.length > 0 ? (
          <AvatarStack users={task.assignments.map((a) => a.user)} max={3} size="xs" />
        ) : (
          <span className="text-[11px] text-muted-2">Unassigned</span>
        )}
      </div>
      <div className="w-[132px] shrink-0">
        <QuickStatus taskId={task.id} status={task.status} size="sm" />
      </div>
    </div>
  );
}
