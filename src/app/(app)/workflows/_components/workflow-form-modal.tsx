"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { nanoid } from "nanoid";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label, FieldGroup } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { STATUS_PALETTE, nextPaletteColor } from "./palette";
import { Plus, Trash2, ArrowUp, ArrowDown, CheckCircle2, AlertTriangle } from "lucide-react";

interface StatusDraft {
  _localId: string;
  key: string;
  label: string;
  color: string;
  isTerminal: boolean;
  isDelayFlag: boolean;
}

export interface WorkflowFormValues {
  id?: string;
  name: string;
  description: string;
  isDefault: boolean;
  statuses: { key: string; label: string; color: string; isTerminal: boolean; isDelayFlag: boolean }[];
}

const EMPTY_STATUSES: StatusDraft[] = [
  { _localId: nanoid(), key: "backlog", label: "Backlog", color: nextPaletteColor(0), isTerminal: false, isDelayFlag: false },
  { _localId: nanoid(), key: "in_progress", label: "In Progress", color: nextPaletteColor(1), isTerminal: false, isDelayFlag: false },
  { _localId: nanoid(), key: "done", label: "Done", color: nextPaletteColor(4), isTerminal: true, isDelayFlag: false },
];

function slugify(label: string) {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function WorkflowForm({
  initial,
  onSaved,
  onCancel,
}: {
  initial: WorkflowFormValues;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [isDefault, setIsDefault] = useState(initial.isDefault);
  const [statuses, setStatuses] = useState<StatusDraft[]>(
    initial.statuses.length
      ? initial.statuses.map((s) => ({ ...s, _localId: nanoid() }))
      : EMPTY_STATUSES
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function updateStatus(id: string, patch: Partial<StatusDraft>) {
    setStatuses((list) => list.map((s) => (s._localId === id ? { ...s, ...patch } : s)));
  }

  function addStatus() {
    setStatuses((list) => [
      ...list,
      { _localId: nanoid(), key: "", label: "", color: nextPaletteColor(list.length), isTerminal: false, isDelayFlag: false },
    ]);
  }

  function removeStatus(id: string) {
    setStatuses((list) => list.filter((s) => s._localId !== id));
  }

  function move(id: string, dir: -1 | 1) {
    setStatuses((list) => {
      const i = list.findIndex((s) => s._localId === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= list.length) return list;
      const next = [...list];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (statuses.length === 0) {
      setError("Add at least one status.");
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      name,
      description: description || undefined,
      isDefault,
      statuses: statuses.map((s) => ({
        key: s.key || slugify(s.label),
        label: s.label,
        color: s.color,
        isTerminal: s.isTerminal,
        isDelayFlag: s.isDelayFlag,
      })),
    };
    const res = await fetch(initial.id ? `/api/workflows/${initial.id}` : "/api/workflows", {
      method: initial.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Could not save workflow");
      return;
    }
    onSaved();
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <FieldGroup>
        <Label htmlFor="wf-name">Name</Label>
        <Input id="wf-name" required value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </FieldGroup>
      <FieldGroup>
        <Label htmlFor="wf-desc">Description (optional)</Label>
        <Textarea id="wf-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
      </FieldGroup>
      <label className="flex items-center gap-2 text-[13px] text-foreground">
        <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} className="h-3.5 w-3.5 accent-[var(--accent)]" />
        Make this the default workflow
      </label>

      <div className="border-t border-border-soft pt-4">
        <div className="flex items-center justify-between mb-2.5">
          <Label className="mb-0">Statuses, in order</Label>
          <Button type="button" variant="ghost" size="sm" onClick={addStatus}>
            <Plus className="h-3.5 w-3.5" /> Add status
          </Button>
        </div>
        <div className="space-y-2">
          {statuses.map((s, i) => (
            <div key={s._localId} className="rounded-[12px] border border-border p-3">
              <div className="flex items-start gap-2">
                <div className="flex flex-col gap-0.5 pt-1.5">
                  <button type="button" onClick={() => move(s._localId, -1)} disabled={i === 0} className="text-muted-2 hover:text-foreground disabled:opacity-30">
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" onClick={() => move(s._localId, 1)} disabled={i === statuses.length - 1} className="text-muted-2 hover:text-foreground disabled:opacity-30">
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Label"
                    value={s.label}
                    onChange={(e) => updateStatus(s._localId, { label: e.target.value, key: s.key || slugify(e.target.value) })}
                  />
                  <Input
                    placeholder="key"
                    value={s.key}
                    onChange={(e) => updateStatus(s._localId, { key: e.target.value })}
                    className="font-mono text-[12.5px]"
                  />
                </div>
                <button type="button" onClick={() => removeStatus(s._localId)} className="mt-1.5 text-muted-2 hover:text-danger">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 pl-6">
                <div className="flex items-center gap-1.5">
                  {STATUS_PALETTE.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      title={c.name}
                      onClick={() => updateStatus(s._localId, { color: c.value })}
                      className={cn(
                        "h-5 w-5 rounded-full transition-transform",
                        s.color === c.value && "ring-2 ring-offset-2 ring-offset-surface ring-[var(--ring)] scale-110"
                      )}
                      style={{ background: c.value }}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-[12px] text-muted">
                    <input type="checkbox" checked={s.isDelayFlag} onChange={(e) => updateStatus(s._localId, { isDelayFlag: e.target.checked })} className="h-3.5 w-3.5 accent-[var(--warning)]" />
                    <AlertTriangle className="h-3 w-3" /> Delay flag
                  </label>
                  <label className="flex items-center gap-1.5 text-[12px] text-muted">
                    <input type="checkbox" checked={s.isTerminal} onChange={(e) => updateStatus(s._localId, { isTerminal: e.target.checked })} className="h-3.5 w-3.5 accent-[var(--success)]" />
                    <CheckCircle2 className="h-3 w-3" /> Terminal
                  </label>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {error && <p className="text-[12.5px] text-danger">{error}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? "Saving…" : initial.id ? "Save changes" : "Create workflow"}
        </Button>
      </div>
    </form>
  );
}

export function NewWorkflowButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>
        <Plus className="h-3.5 w-3.5" /> New workflow
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="New workflow" description="Define an ordered status pipeline for projects to use." size="lg">
        <WorkflowForm
          initial={{ name: "", description: "", isDefault: false, statuses: [] }}
          onCancel={() => setOpen(false)}
          onSaved={() => setOpen(false)}
        />
      </Modal>
    </>
  );
}

export function EditWorkflowButton({ workflow, trigger }: { workflow: WorkflowFormValues; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <span onClick={() => setOpen(true)} className="contents">
        {trigger}
      </span>
      <Modal open={open} onClose={() => setOpen(false)} title="Edit workflow" size="lg">
        <WorkflowForm initial={workflow} onCancel={() => setOpen(false)} onSaved={() => setOpen(false)} />
      </Modal>
    </>
  );
}
