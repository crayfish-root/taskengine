"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select, Label, FieldGroup } from "@/components/ui/input";
import { Plus } from "lucide-react";

export interface KpiFormValues {
  id?: string;
  name: string;
  description: string;
  unit: string;
  target: string;
  direction: "HIGHER_IS_BETTER" | "LOWER_IS_BETTER";
  frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY";
  departmentId: string;
  projectId: string;
  ownerId: string;
}

const EMPTY: Omit<KpiFormValues, "ownerId"> = {
  name: "",
  description: "",
  unit: "",
  target: "",
  direction: "HIGHER_IS_BETTER",
  frequency: "MONTHLY",
  departmentId: "",
  projectId: "",
};

function KpiForm({
  initial,
  departments,
  projects,
  users,
  canPickAnyOwner,
  onSaved,
  onCancel,
}: {
  initial: KpiFormValues;
  departments: { id: string; name: string }[];
  projects: { id: string; name: string; code: string }[];
  users: { id: string; name: string }[];
  canPickAnyOwner: boolean;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<KpiFormValues>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof KpiFormValues>(key: K, value: KpiFormValues[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      name: form.name,
      description: form.description || undefined,
      unit: form.unit,
      target: Number(form.target),
      direction: form.direction,
      frequency: form.frequency,
      departmentId: form.departmentId || null,
      projectId: form.projectId || null,
      ownerId: form.ownerId,
    };
    const res = await fetch(form.id ? `/api/kpis/${form.id}` : "/api/kpis", {
      method: form.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Could not save KPI");
      return;
    }
    onSaved();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <FieldGroup>
        <Label htmlFor="name">Name</Label>
        <Input id="name" required value={form.name} onChange={(e) => set("name", e.target.value)} autoFocus />
      </FieldGroup>
      <FieldGroup>
        <Label htmlFor="description">Description (optional)</Label>
        <Textarea id="description" value={form.description} onChange={(e) => set("description", e.target.value)} />
      </FieldGroup>
      <div className="grid grid-cols-2 gap-3">
        <FieldGroup>
          <Label htmlFor="target">Target</Label>
          <Input id="target" type="number" step="any" required value={form.target} onChange={(e) => set("target", e.target.value)} />
        </FieldGroup>
        <FieldGroup>
          <Label htmlFor="unit">Unit (optional)</Label>
          <Input id="unit" placeholder="%, days, $" value={form.unit} onChange={(e) => set("unit", e.target.value)} />
        </FieldGroup>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FieldGroup>
          <Label htmlFor="direction">Direction</Label>
          <Select id="direction" value={form.direction} onChange={(e) => set("direction", e.target.value as KpiFormValues["direction"])}>
            <option value="HIGHER_IS_BETTER">Higher is better</option>
            <option value="LOWER_IS_BETTER">Lower is better</option>
          </Select>
        </FieldGroup>
        <FieldGroup>
          <Label htmlFor="frequency">Frequency</Label>
          <Select id="frequency" value={form.frequency} onChange={(e) => set("frequency", e.target.value as KpiFormValues["frequency"])}>
            <option value="DAILY">Daily</option>
            <option value="WEEKLY">Weekly</option>
            <option value="MONTHLY">Monthly</option>
            <option value="QUARTERLY">Quarterly</option>
          </Select>
        </FieldGroup>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FieldGroup>
          <Label htmlFor="departmentId">Department (optional)</Label>
          <Select id="departmentId" value={form.departmentId} onChange={(e) => set("departmentId", e.target.value)}>
            <option value="">None</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
        </FieldGroup>
        <FieldGroup>
          <Label htmlFor="projectId">Project (optional)</Label>
          <Select id="projectId" value={form.projectId} onChange={(e) => set("projectId", e.target.value)}>
            <option value="">None</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} — {p.name}
              </option>
            ))}
          </Select>
        </FieldGroup>
      </div>
      <FieldGroup>
        <Label htmlFor="ownerId">Owner</Label>
        {canPickAnyOwner ? (
          <Select id="ownerId" required value={form.ownerId} onChange={(e) => set("ownerId", e.target.value)}>
            <option value="" disabled>
              Select an owner
            </option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </Select>
        ) : (
          <div className="flex h-9 items-center rounded-[10px] border border-border-soft bg-black/[0.02] dark:bg-white/[0.03] px-3 text-[13px] text-foreground">
            {users.find((u) => u.id === form.ownerId)?.name ?? "You"}
          </div>
        )}
      </FieldGroup>
      {error && <p className="text-[12.5px] text-danger">{error}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? "Saving…" : form.id ? "Save changes" : "Add KPI"}
        </Button>
      </div>
    </form>
  );
}

export function NewKpiButton({
  departments,
  projects,
  users,
  currentUserId,
  canPickAnyOwner,
}: {
  departments: { id: string; name: string }[];
  projects: { id: string; name: string; code: string }[];
  users: { id: string; name: string }[];
  currentUserId: string;
  canPickAnyOwner: boolean;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>
        <Plus className="h-3.5 w-3.5" /> Add KPI
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Add a KPI" description="Define a new performance indicator to track over time.">
        <KpiForm
          initial={{ ...EMPTY, ownerId: currentUserId }}
          departments={departments}
          projects={projects}
          users={users}
          canPickAnyOwner={canPickAnyOwner}
          onCancel={() => setOpen(false)}
          onSaved={() => {
            setOpen(false);
            router.refresh();
          }}
        />
      </Modal>
    </>
  );
}

export function EditKpiButton({
  kpi,
  departments,
  projects,
  users,
  trigger,
}: {
  kpi: KpiFormValues;
  departments: { id: string; name: string }[];
  projects: { id: string; name: string; code: string }[];
  users: { id: string; name: string }[];
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <span onClick={() => setOpen(true)} className="contents">
        {trigger}
      </span>
      <Modal open={open} onClose={() => setOpen(false)} title="Edit KPI">
        <KpiForm
          initial={kpi}
          departments={departments}
          projects={projects}
          users={users}
          canPickAnyOwner
          onCancel={() => setOpen(false)}
          onSaved={() => {
            setOpen(false);
            router.refresh();
          }}
        />
      </Modal>
    </>
  );
}
