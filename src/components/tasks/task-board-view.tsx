"use client";

import { useState } from "react";
import { Plus, LayoutGrid, List as ListIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { TASK_STATUS } from "@/lib/status";
import { KANBAN_STATUSES } from "@/lib/task-utils";
import { TaskCard, TaskCardData } from "./task-card";
import { TaskRow } from "./task-row";
import { AddTaskModal } from "./add-task-modal";
import { PickablePerson } from "./people-picker";

export function TaskBoardView({
  tasks,
  projectId,
  people,
  canAddTask,
}: {
  tasks: TaskCardData[];
  projectId: string;
  people: PickablePerson[];
  canAddTask: boolean;
}) {
  const [view, setView] = useState<"board" | "list">("board");
  const [addOpen, setAddOpen] = useState(false);

  const cancelled = tasks.filter((t) => t.status === "CANCELLED");
  const active = tasks.filter((t) => t.status !== "CANCELLED");

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="inline-flex items-center rounded-[10px] bg-black/[0.04] dark:bg-white/[0.06] p-0.5">
          <button
            onClick={() => setView("board")}
            className={`flex items-center gap-1.5 rounded-[8px] px-3 py-1.5 text-[12.5px] font-medium transition-all ${view === "board" ? "bg-surface shadow-[var(--shadow-xs)] text-foreground" : "text-muted hover:text-foreground"}`}
          >
            <LayoutGrid className="h-3.5 w-3.5" /> Board
          </button>
          <button
            onClick={() => setView("list")}
            className={`flex items-center gap-1.5 rounded-[8px] px-3 py-1.5 text-[12.5px] font-medium transition-all ${view === "list" ? "bg-surface shadow-[var(--shadow-xs)] text-foreground" : "text-muted hover:text-foreground"}`}
          >
            <ListIcon className="h-3.5 w-3.5" /> List
          </button>
        </div>
        {canAddTask && (
          <Button size="sm" variant="primary" onClick={() => setAddOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> Add task
          </Button>
        )}
      </div>

      {view === "board" ? (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {KANBAN_STATUSES.map((status) => {
            const colTasks = active.filter((t) => t.status === status);
            return (
              <div key={status} className="w-[268px] shrink-0">
                <div className="mb-2.5 flex items-center justify-between px-0.5">
                  <StatusBadge map={TASK_STATUS} value={status} />
                  <span className="text-[11.5px] text-muted-2">{colTasks.length}</span>
                </div>
                <div className="space-y-2">
                  {colTasks.map((t) => (
                    <TaskCard key={t.id} task={t} />
                  ))}
                  {colTasks.length === 0 && (
                    <div className="rounded-[12px] border border-dashed border-border-soft px-3 py-6 text-center text-[11.5px] text-muted-2">
                      Empty
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {cancelled.length > 0 && (
            <div className="w-[268px] shrink-0">
              <div className="mb-2.5 flex items-center justify-between px-0.5">
                <StatusBadge map={TASK_STATUS} value="CANCELLED" />
                <span className="text-[11.5px] text-muted-2">{cancelled.length}</span>
              </div>
              <div className="space-y-2">
                {cancelled.map((t) => (
                  <TaskCard key={t.id} task={t} />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-[var(--radius-lg)] border border-border bg-surface px-3">
          {tasks.length === 0 && <p className="py-8 text-center text-[13px] text-muted">No tasks yet.</p>}
          {tasks.map((t) => (
            <TaskRow key={t.id} task={t} />
          ))}
        </div>
      )}

      {canAddTask && (
        <AddTaskModal open={addOpen} onClose={() => setAddOpen(false)} projectId={projectId} people={people} />
      )}
    </div>
  );
}
