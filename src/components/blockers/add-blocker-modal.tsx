"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FieldGroup, Label, Input, Textarea, Select } from "@/components/ui/input";
import { BLOCKER_SEVERITY } from "@/lib/status";

export function AddBlockerModal({
  open,
  onClose,
  projectId,
  taskId,
  taskOptions,
  ownerOptions,
  projectOptions,
}: {
  open: boolean;
  onClose: () => void;
  projectId?: string | null;
  taskId?: string | null;
  taskOptions?: { id: string; title: string }[];
  ownerOptions?: { id: string; name: string }[];
  projectOptions?: { id: string; name: string; code: string }[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState("MEDIUM");
  const [linkedTaskId, setLinkedTaskId] = useState(taskId ?? "");
  const [linkedProjectId, setLinkedProjectId] = useState(projectId ?? projectOptions?.[0]?.id ?? "");
  const [ownerId, setOwnerId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!title.trim()) return;
    setSaving(true);
    setError(null);
    const res = await fetch("/api/blockers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        description: description.trim() || undefined,
        severity,
        projectId: (projectId ?? linkedProjectId) || undefined,
        taskId: linkedTaskId || undefined,
        ownerId: ownerId || undefined,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not create blocker");
      return;
    }
    setTitle("");
    setDescription("");
    setSeverity("MEDIUM");
    onClose();
    router.refresh();
  }

  return (
    <Modal open={open} onClose={onClose} title="Log a blocker" size="md">
      <div className="space-y-4">
        <FieldGroup>
          <Label>What&apos;s blocking progress?</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus placeholder="e.g. Waiting on legal sign-off" />
        </FieldGroup>
        <FieldGroup>
          <Label>Details (optional)</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        </FieldGroup>
        <div className="grid grid-cols-2 gap-3">
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
          {ownerOptions && (
            <FieldGroup>
              <Label>Owner (optional)</Label>
              <Select value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
                <option value="">Unassigned</option>
                {ownerOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </Select>
            </FieldGroup>
          )}
        </div>
        {projectOptions && projectOptions.length > 0 && !projectId && !taskId && (
          <FieldGroup>
            <Label>Project</Label>
            <Select value={linkedProjectId} onChange={(e) => setLinkedProjectId(e.target.value)}>
              {projectOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} · {p.name}
                </option>
              ))}
            </Select>
          </FieldGroup>
        )}
        {taskOptions && taskOptions.length > 0 && !taskId && (
          <FieldGroup>
            <Label>Linked task (optional)</Label>
            <Select value={linkedTaskId} onChange={(e) => setLinkedTaskId(e.target.value)}>
              <option value="">Project-level (no specific task)</option>
              {taskOptions.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </Select>
          </FieldGroup>
        )}
        {error && <p className="text-[12.5px] text-danger">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={!title.trim() || saving || (!projectId && !taskId && !linkedTaskId && !linkedProjectId)}
            onClick={submit}
          >
            {saving ? "Logging…" : "Log blocker"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
