"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FieldGroup, Label, Textarea } from "@/components/ui/input";
import { PeoplePicker, PickablePerson } from "./people-picker";

export function DelegateModal({
  open,
  onClose,
  taskId,
  people,
  currentPrimaryId,
}: {
  open: boolean;
  onClose: () => void;
  taskId: string;
  people: PickablePerson[];
  currentPrimaryId?: string | null;
}) {
  const router = useRouter();
  const [toUserId, setToUserId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!toUserId) return;
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/tasks/${taskId}/delegate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toUserId, note: note.trim() || undefined }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not delegate task");
      return;
    }
    setToUserId(null);
    setNote("");
    onClose();
    router.refresh();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Delegate to…"
      description="Hand this task's ownership down the chain. This is recorded distinctly from a plain assignment."
      size="md"
    >
      <div className="space-y-4">
        <FieldGroup>
          <Label>Delegate to</Label>
          <PeoplePicker
            people={people}
            selected={toUserId ? [toUserId] : []}
            onToggle={(id) => setToUserId(id === toUserId ? null : id)}
            multi={false}
            excludeIds={currentPrimaryId ? [currentPrimaryId] : []}
            placeholder="Search people to delegate to…"
          />
        </FieldGroup>
        <FieldGroup>
          <Label>Note (optional)</Label>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Any context for the handoff" />
        </FieldGroup>
        {error && <p className="text-[12.5px] text-danger">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" disabled={!toUserId || saving} onClick={submit}>
            {saving ? "Delegating…" : "Delegate"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
