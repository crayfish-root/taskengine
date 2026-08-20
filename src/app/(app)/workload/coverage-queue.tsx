"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { UserCheck } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateShort } from "@/lib/utils";
import { LEAVE_TYPE, PRIORITY } from "@/lib/status";

interface CandidateUser {
  id: string;
  name: string;
  title: string | null;
  avatarColor: string;
  avatarEmoji: string | null;
  activeLoad: number;
}

interface CoverageItemDTO {
  leaveRequestId: string;
  leaveType: string;
  leaveEndDate: string;
  onLeaveUser: { id: string; name: string; avatarColor: string; avatarEmoji: string | null; title: string | null };
  assignmentId: string;
  taskId: string;
  taskTitle: string;
  taskStatus: string;
  taskPriority: string;
  taskDueDate: string | null;
  suggestion: { user: CandidateUser; reason: "backup" | "team" | "manager" } | null;
  candidates: CandidateUser[];
}

const REASON_LABEL: Record<string, string> = {
  backup: "requested backup",
  team: "teammate, available",
  manager: "reports to same manager",
};

export function CoverageQueue({ initialItems }: { initialItems: CoverageItemDTO[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [chosen, setChosen] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const visible = items.filter((i) => !dismissed.has(i.assignmentId));

  async function reassign(item: CoverageItemDTO, userId: string) {
    setBusy(item.assignmentId);
    try {
      const res = await fetch("/api/workload/reassign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignmentId: item.assignmentId, newUserId: userId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        alert(body.error || "Couldn't reassign that task");
        return;
      }
      setItems((prev) => prev.filter((i) => i.assignmentId !== item.assignmentId));
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <UserCheck className="h-[18px] w-[18px] text-accent" />
          <h2 className="text-[16px] font-semibold tracking-[-0.01em]">Coverage suggestions while people are away</h2>
        </div>
        <p className="mt-1 text-[13px] text-muted max-w-2xl">
          People currently on approved leave with active work due soon. Nothing is reassigned automatically — review each
          suggestion and confirm, or leave it as is.
        </p>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={UserCheck}
          title="Nothing needs coverage right now"
          description="Everyone on leave either has no time-sensitive tasks, or their work is already covered."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {visible.map((item) => {
            const selectedId = chosen[item.assignmentId] ?? item.suggestion?.user.id ?? "";
            const selectedCandidate = item.candidates.find((c) => c.id === selectedId) ?? item.suggestion?.user;
            return (
              <div key={item.assignmentId} className="rounded-[var(--radius-lg)] border border-border bg-surface p-4">
                <div className="flex items-start gap-2.5">
                  <Avatar name={item.onLeaveUser.name} color={item.onLeaveUser.avatarColor} emoji={item.onLeaveUser.avatarEmoji} size="sm" />
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium">
                      {item.onLeaveUser.name} is on {LEAVE_TYPE[item.leaveType]?.label.toLowerCase() ?? "leave"}
                    </p>
                    <p className="text-[11.5px] text-muted-2">Back {formatDateShort(item.leaveEndDate)}</p>
                  </div>
                </div>

                <div className="mt-3 rounded-[10px] bg-black/[0.02] dark:bg-white/[0.03] p-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[12.5px] font-medium leading-snug">{item.taskTitle}</p>
                    <Badge tone={PRIORITY[item.taskPriority]?.tone ?? "neutral"}>{PRIORITY[item.taskPriority]?.label}</Badge>
                  </div>
                  {item.taskDueDate && <p className="mt-1 text-[11px] text-muted-2">Due {formatDateShort(item.taskDueDate)}</p>}
                </div>

                <div className="mt-3">
                  {item.candidates.length === 0 ? (
                    <p className="text-[12px] text-muted-2">No obvious replacement found — reassign manually from the task.</p>
                  ) : (
                    <>
                      <p className="mb-1.5 text-[11.5px] text-muted-2">
                        Suggested: <span className="font-medium text-foreground">{selectedCandidate?.name}</span>
                        {item.suggestion && selectedCandidate?.id === item.suggestion.user.id && (
                          <span> · {REASON_LABEL[item.suggestion.reason]}</span>
                        )}
                      </p>
                      <div className="flex items-center gap-2">
                        <Select
                          className="h-8 flex-1 text-[12.5px]"
                          value={selectedId}
                          onChange={(e) => setChosen((prev) => ({ ...prev, [item.assignmentId]: e.target.value }))}
                        >
                          {item.candidates.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} — {c.activeLoad} active task{c.activeLoad === 1 ? "" : "s"}
                            </option>
                          ))}
                        </Select>
                        <Button
                          size="sm"
                          variant="primary"
                          disabled={busy === item.assignmentId || !selectedId}
                          onClick={() => reassign(item, selectedId)}
                        >
                          Reassign
                        </Button>
                      </div>
                    </>
                  )}
                </div>

                <button
                  className="mt-2.5 text-[11.5px] text-muted hover:text-foreground transition-colors"
                  onClick={() => setDismissed((prev) => new Set(prev).add(item.assignmentId))}
                >
                  Leave as is for now
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
