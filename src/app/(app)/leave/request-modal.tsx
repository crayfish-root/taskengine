"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FieldGroup, Input, Label, Select, Textarea } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { LEAVE_TYPE } from "@/lib/status";
import type { LeaveUser } from "./types";

export function RequestLeaveModal({
  open,
  onClose,
  backupCandidates,
}: {
  open: boolean;
  onClose: () => void;
  backupCandidates: LeaveUser[];
}) {
  const router = useRouter();
  const [type, setType] = useState("ANNUAL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [halfDay, setHalfDay] = useState(false);
  const [reason, setReason] = useState("");
  const [backups, setBackups] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleBackup(id: string) {
    setBackups((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 2 ? [...prev, id] : prev));
  }

  function reset() {
    setType("ANNUAL");
    setStartDate("");
    setEndDate("");
    setHalfDay(false);
    setReason("");
    setBackups([]);
    setError(null);
  }

  async function submit() {
    if (!startDate || !endDate) {
      setError("Pick a start and end date.");
      return;
    }
    if (new Date(endDate) < new Date(startDate)) {
      setError("End date can't be before the start date.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/leave/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, startDate, endDate, halfDay, reason: reason || undefined, backupUserIds: backups }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to submit request");
      }
      reset();
      onClose();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Request leave"
      description="Submit a request for your manager to review."
      size="md"
    >
      <div className="space-y-4">
        <FieldGroup>
          <Label>Type</Label>
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            {Object.entries(LEAVE_TYPE).map(([key, meta]) => (
              <option key={key} value={key}>
                {meta.label}
              </option>
            ))}
          </Select>
        </FieldGroup>

        <div className="grid grid-cols-2 gap-3">
          <FieldGroup>
            <Label>Start date</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </FieldGroup>
          <FieldGroup>
            <Label>End date</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} min={startDate || undefined} />
          </FieldGroup>
        </div>

        <label className="flex items-center gap-2 text-[13px] text-foreground">
          <input type="checkbox" checked={halfDay} onChange={(e) => setHalfDay(e.target.checked)} className="h-3.5 w-3.5 rounded accent-[var(--accent)]" />
          Half day
        </label>

        <FieldGroup>
          <Label>Reason (optional)</Label>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Anything your approver should know" />
        </FieldGroup>

        {backupCandidates.length > 0 && (
          <FieldGroup>
            <Label>Backup coverage (optional, up to 2)</Label>
            <div className="flex flex-wrap gap-1.5">
              {backupCandidates.map((u) => {
                const selected = backups.includes(u.id);
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => toggleBackup(u.id)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border px-2 py-1 text-[12px] font-medium transition-colors",
                      selected ? "border-accent bg-accent-soft text-accent" : "border-border text-foreground hover:bg-black/[0.03] dark:hover:bg-white/[0.06]"
                    )}
                  >
                    <Avatar name={u.name} color={u.avatarColor} emoji={u.avatarEmoji} size="xs" />
                    {u.name.split(" ")[0]}
                  </button>
                );
              })}
            </div>
          </FieldGroup>
        )}

        {error && <p className="text-[12.5px] text-danger">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} disabled={submitting}>
            {submitting ? "Submitting…" : "Submit request"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
