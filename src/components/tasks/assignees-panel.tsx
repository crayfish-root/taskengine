"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, UserPlus, ArrowRightLeft, Star } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { AssignModal } from "./assign-modal";
import { DelegateModal } from "./delegate-modal";
import { PickablePerson } from "./people-picker";

export interface TaskAssigneeRow {
  id: string; // TaskAssignment id
  isPrimary: boolean;
  autoAssigned: boolean;
  user: { id: string; name: string; avatarColor: string; avatarEmoji: string | null; title: string | null };
}

export function AssigneesPanel({
  taskId,
  assignments,
  people,
  teams,
  canManage,
}: {
  taskId: string;
  assignments: TaskAssigneeRow[];
  people: PickablePerson[];
  teams: { id: string; name: string }[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [assignOpen, setAssignOpen] = useState(false);
  const [delegateOpen, setDelegateOpen] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const primary = assignments.find((a) => a.isPrimary);

  async function remove(assignmentId: string) {
    setRemovingId(assignmentId);
    await fetch(`/api/tasks/${taskId}/assignments?assignmentId=${assignmentId}`, { method: "DELETE" });
    setRemovingId(null);
    router.refresh();
  }

  return (
    <div>
      <div className="space-y-2">
        {assignments.length === 0 && <p className="text-[13px] text-muted">Unassigned</p>}
        {assignments.map((a) => (
          <div key={a.id} className="flex items-center gap-2.5 group">
            <Avatar name={a.user.name} color={a.user.avatarColor} emoji={a.user.avatarEmoji} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium leading-tight">{a.user.name}</p>
              <p className="truncate text-[11px] text-muted leading-tight">{a.user.title ?? ""}</p>
            </div>
            {a.isPrimary && (
              <span title="Primary owner">
                <Star className="h-3.5 w-3.5 fill-warning text-warning" />
              </span>
            )}
            {a.autoAssigned && <span className="text-[10px] text-muted-2">via team</span>}
            {canManage && (
              <button
                onClick={() => remove(a.id)}
                disabled={removingId === a.id}
                className="opacity-0 group-hover:opacity-100 rounded-full p-1 text-muted-2 hover:bg-black/[0.05] hover:text-danger dark:hover:bg-white/[0.08] transition-all disabled:opacity-50"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      {canManage && (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setAssignOpen(true)}>
            <UserPlus className="h-3.5 w-3.5" /> Add
          </Button>
          <Button variant="outline" size="sm" onClick={() => setDelegateOpen(true)}>
            <ArrowRightLeft className="h-3.5 w-3.5" /> Delegate to…
          </Button>
        </div>
      )}

      <AssignModal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        taskId={taskId}
        people={people}
        teams={teams}
        excludeIds={assignments.map((a) => a.user.id)}
      />
      <DelegateModal
        open={delegateOpen}
        onClose={() => setDelegateOpen(false)}
        taskId={taskId}
        people={people}
        currentPrimaryId={primary?.user.id}
      />
    </div>
  );
}
