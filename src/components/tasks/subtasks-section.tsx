"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AvatarStack } from "@/components/ui/avatar";
import { QuickStatus } from "./quick-status";
import { AddTaskModal } from "./add-task-modal";
import { PickablePerson } from "./people-picker";
import { cn, formatDateShort } from "@/lib/utils";
import { isTaskOverdue } from "@/lib/task-utils";

export interface SubtaskRow {
  id: string;
  title: string;
  status: string;
  dueDate: string | Date | null;
  assignments: { user: { id: string; name: string; avatarColor: string; avatarEmoji: string | null } }[];
}

export function SubtasksSection({
  parentTaskId,
  projectId,
  subtasks,
  people,
}: {
  parentTaskId: string;
  projectId?: string | null;
  subtasks: SubtaskRow[];
  people: PickablePerson[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-2">
      {subtasks.length === 0 && <p className="text-[13px] text-muted">No subtasks yet.</p>}
      {subtasks.map((s) => (
        <div
          key={s.id}
          className="flex items-center gap-3 rounded-[10px] border border-border-soft px-3 py-2"
        >
          <Link href={`/tasks/${s.id}`} className="min-w-0 flex-1">
            <p className={cn("truncate text-[13px] font-medium hover:text-accent transition-colors")}>{s.title}</p>
            <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-2">
              {s.dueDate && (
                <span className={cn(isTaskOverdue(s.dueDate, s.status as never) && "text-danger font-medium")}>
                  Due {formatDateShort(s.dueDate)}
                </span>
              )}
            </div>
          </Link>
          {s.assignments.length > 0 && (
            <AvatarStack users={s.assignments.map((a) => a.user)} max={3} size="xs" />
          )}
          <QuickStatus taskId={s.id} status={s.status} size="sm" />
        </div>
      ))}
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)} className="mt-1">
        <Plus className="h-3.5 w-3.5" /> Add subtask
      </Button>
      <AddTaskModal
        open={open}
        onClose={() => setOpen(false)}
        projectId={projectId}
        parentTaskId={parentTaskId}
        people={people}
        title="New subtask"
      />
    </div>
  );
}
