"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Loader2 } from "lucide-react";
import { DropdownMenu, MenuItem } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FieldGroup, Label, Input, Select, Textarea } from "@/components/ui/input";
import { TASK_STATUS, BLOCKER_SEVERITY } from "@/lib/status";
import { ALL_TASK_STATUSES } from "@/lib/task-utils";
import { cn } from "@/lib/utils";

type TaskStatusValue = (typeof ALL_TASK_STATUSES)[number];

export function QuickStatus({
  taskId,
  status,
  size = "md",
  onChanged,
}: {
  taskId: string;
  status: string;
  size?: "sm" | "md";
  onChanged?: (newStatus: string) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [blockerPrompt, setBlockerPrompt] = useState<TaskStatusValue | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function applyStatus(toStatus: TaskStatusValue, opts?: { skipBlockerPrompt?: boolean }) {
    if (toStatus === status) return;
    if (toStatus === "BLOCKED" && !opts?.skipBlockerPrompt) {
      setBlockerPrompt(toStatus);
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/tasks/${taskId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toStatus }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Could not update status");
        return;
      }
      onChanged?.(toStatus);
      router.refresh();
    });
  }

  const meta = TASK_STATUS[status] ?? { label: status, tone: "neutral" as const };

  return (
    <>
      <DropdownMenu
        trigger={
          <button
            type="button"
            disabled={pending}
            className={cn(
              "inline-flex items-center gap-1 rounded-full transition-opacity hover:opacity-80 disabled:opacity-50",
              size === "sm" && "text-[11px]"
            )}
          >
            <Badge tone={meta.tone} dot>
              {meta.label}
            </Badge>
            {pending ? (
              <Loader2 className="h-3 w-3 animate-spin text-muted" />
            ) : (
              <ChevronDown className="h-3 w-3 text-muted-2" />
            )}
          </button>
        }
      >
        {(close) => (
          <div className="min-w-[160px]">
            {ALL_TASK_STATUSES.map((s) => {
              const m = TASK_STATUS[s];
              return (
                <MenuItem
                  key={s}
                  onClick={() => {
                    close();
                    applyStatus(s);
                  }}
                  className={cn(s === status && "font-semibold")}
                >
                  <span className={cn("h-1.5 w-1.5 rounded-full")} style={{ background: `var(--${toneVar(m.tone)})` }} />
                  {m.label}
                </MenuItem>
              );
            })}
          </div>
        )}
      </DropdownMenu>
      {error && <p className="mt-1 text-[11px] text-danger">{error}</p>}

      <BlockerPromptModal
        open={blockerPrompt !== null}
        onClose={() => setBlockerPrompt(null)}
        onSkip={() => {
          const s = blockerPrompt;
          setBlockerPrompt(null);
          if (s) applyStatus(s, { skipBlockerPrompt: true });
        }}
        onSubmit={async (blocker) => {
          const s = blockerPrompt;
          setBlockerPrompt(null);
          if (!s) return;
          startTransition(async () => {
            const res = await fetch(`/api/tasks/${taskId}/status`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ toStatus: s, blocker }),
            });
            if (!res.ok) {
              const data = await res.json().catch(() => ({}));
              setError(data.error ?? "Could not update status");
              return;
            }
            onChanged?.(s);
            router.refresh();
          });
        }}
      />
    </>
  );
}

function toneVar(tone: string) {
  switch (tone) {
    case "success":
      return "success";
    case "warning":
      return "warning";
    case "danger":
      return "danger";
    case "info":
      return "info";
    case "accent":
      return "accent";
    default:
      return "muted-2";
  }
}

function BlockerPromptModal({
  open,
  onClose,
  onSkip,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSkip: () => void;
  onSubmit: (blocker: { title: string; description?: string; severity: string }) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState("MEDIUM");

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Marking this task as Blocked"
      description="Optionally log what's blocking it so it shows up on the blockers register."
      size="sm"
    >
      <div className="space-y-4">
        <FieldGroup>
          <Label>What&apos;s blocking it?</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Waiting on vendor API access"
            autoFocus
          />
        </FieldGroup>
        <FieldGroup>
          <Label>Details (optional)</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        </FieldGroup>
        <FieldGroup>
          <Label>Severity</Label>
          <Select value={severity} onChange={(e) => setSeverity(e.target.value)}>
            {Object.entries(BLOCKER_SEVERITY).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </Select>
        </FieldGroup>
        <div className="flex items-center justify-between pt-2">
          <Button variant="ghost" onClick={onSkip}>
            Just change status
          </Button>
          <Button
            variant="primary"
            disabled={!title.trim()}
            onClick={() => onSubmit({ title: title.trim(), description: description.trim() || undefined, severity })}
          >
            Log blocker &amp; update
          </Button>
        </div>
      </div>
    </Modal>
  );
}
