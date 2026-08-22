"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FieldGroup, Label, Input, Textarea, Select } from "@/components/ui/input";
import { PeoplePicker, PickablePerson } from "@/components/tasks/people-picker";
import { PROJECT_STATUS, PRIORITY } from "@/lib/status";

export interface EditableProject {
  id: string;
  name: string;
  description: string | null;
  status: string;
  priority: string;
  departmentId: string | null;
  ownerId: string;
  startDate: string | null;
  targetDate: string | null;
}

function toDateInput(v: string | null) {
  if (!v) return "";
  return v.slice(0, 10);
}

export function EditProjectModal({
  project,
  people,
  departments,
}: {
  project: EditableProject;
  people: PickablePerson[];
  departments: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? "");
  const [status, setStatus] = useState(project.status);
  const [priority, setPriority] = useState(project.priority);
  const [departmentId, setDepartmentId] = useState(project.departmentId ?? "");
  const [ownerId, setOwnerId] = useState(project.ownerId);
  const [startDate, setStartDate] = useState(toDateInput(project.startDate));
  const [targetDate, setTargetDate] = useState(toDateInput(project.targetDate));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        description: description.trim() || null,
        status,
        priority,
        departmentId: departmentId || null,
        ownerId,
        startDate: startDate || null,
        targetDate: targetDate || null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not save changes");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Pencil className="h-3.5 w-3.5" /> Edit
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Edit project" size="lg">
        <div className="space-y-4">
          <FieldGroup>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </FieldGroup>
          <FieldGroup>
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </FieldGroup>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <FieldGroup>
              <Label>Status</Label>
              <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                {Object.entries(PROJECT_STATUS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </Select>
            </FieldGroup>
            <FieldGroup>
              <Label>Priority</Label>
              <Select value={priority} onChange={(e) => setPriority(e.target.value)}>
                {Object.entries(PRIORITY).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </Select>
            </FieldGroup>
            <FieldGroup>
              <Label>Department</Label>
              <Select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
                <option value="">None</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </Select>
            </FieldGroup>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FieldGroup>
              <Label>Start date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </FieldGroup>
            <FieldGroup>
              <Label>Target date</Label>
              <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
            </FieldGroup>
          </div>
          <FieldGroup>
            <Label>Owner</Label>
            <PeoplePicker
              people={people}
              selected={[ownerId]}
              onToggle={(id) => setOwnerId(id)}
              multi={false}
            />
          </FieldGroup>
          {error && <p className="text-[12.5px] text-danger">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" disabled={!name.trim() || saving} onClick={submit}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
