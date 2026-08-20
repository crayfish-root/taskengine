"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FieldGroup, Label, Input, Textarea, Select } from "@/components/ui/input";
import { PeoplePicker, PickablePerson } from "@/components/tasks/people-picker";
import { PROJECT_STATUS, PRIORITY } from "@/lib/status";

function slugCode(name: string) {
  const letters = name
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, "")
    .split(" ")
    .filter(Boolean);
  if (letters.length === 0) return "";
  if (letters.length === 1) return letters[0].slice(0, 6);
  return letters.map((w) => w[0]).join("").slice(0, 6);
}

export function CreateProjectModal({
  open,
  onClose,
  people,
  departments,
  teams,
}: {
  open: boolean;
  onClose: () => void;
  people: PickablePerson[];
  departments: { id: string; name: string }[];
  teams: { id: string; name: string; departmentId: string | null }[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [codeTouched, setCodeTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("PLANNING");
  const [priority, setPriority] = useState("MEDIUM");
  const [departmentId, setDepartmentId] = useState("");
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [teamIds, setTeamIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName("");
    setCode("");
    setCodeTouched(false);
    setDescription("");
    setStatus("PLANNING");
    setPriority("MEDIUM");
    setDepartmentId("");
    setOwnerId(null);
    setStartDate("");
    setTargetDate("");
    setMemberIds([]);
    setTeamIds([]);
    setError(null);
  }

  async function submit() {
    if (!name.trim() || !code.trim() || !ownerId) return;
    setSaving(true);
    setError(null);
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        description: description.trim() || undefined,
        status,
        priority,
        departmentId: departmentId || undefined,
        ownerId,
        startDate: startDate || undefined,
        targetDate: targetDate || undefined,
        memberIds,
        teamIds,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not create project");
      return;
    }
    const { project } = await res.json();
    reset();
    onClose();
    router.push(`/projects/${project.id}`);
    router.refresh();
  }

  const relevantTeams = departmentId ? teams.filter((t) => t.departmentId === departmentId) : teams;

  return (
    <Modal open={open} onClose={onClose} title="New project" size="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-[1fr_140px] gap-3">
          <FieldGroup>
            <Label>Name</Label>
            <Input
              value={name}
              autoFocus
              onChange={(e) => {
                setName(e.target.value);
                if (!codeTouched) setCode(slugCode(e.target.value));
              }}
              placeholder="e.g. Core Banking Upgrade"
            />
          </FieldGroup>
          <FieldGroup>
            <Label>Code</Label>
            <Input
              value={code}
              onChange={(e) => {
                setCodeTouched(true);
                setCode(e.target.value.toUpperCase());
              }}
              placeholder="CBU"
            />
          </FieldGroup>
        </div>
        <FieldGroup>
          <Label>Description</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        </FieldGroup>
        <div className="grid grid-cols-3 gap-3">
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
            selected={ownerId ? [ownerId] : []}
            onToggle={(id) => setOwnerId(id === ownerId ? null : id)}
            multi={false}
            placeholder="Search for an owner…"
          />
        </FieldGroup>
        <FieldGroup>
          <Label>Additional members ({memberIds.length})</Label>
          <PeoplePicker
            people={people}
            selected={memberIds}
            onToggle={(id) => setMemberIds((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]))}
            excludeIds={ownerId ? [ownerId] : []}
          />
        </FieldGroup>
        {relevantTeams.length > 0 && (
          <FieldGroup>
            <Label>Teams</Label>
            <div className="flex flex-wrap gap-1.5">
              {relevantTeams.map((t) => {
                const active = teamIds.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() =>
                      setTeamIds((prev) => (prev.includes(t.id) ? prev.filter((id) => id !== t.id) : [...prev, t.id]))
                    }
                    className={
                      active
                        ? "rounded-full bg-accent px-3 py-1 text-[12px] font-medium text-white"
                        : "rounded-full border border-border px-3 py-1 text-[12px] font-medium text-foreground hover:bg-black/[0.03] dark:hover:bg-white/[0.06]"
                    }
                  >
                    {t.name}
                  </button>
                );
              })}
            </div>
          </FieldGroup>
        )}
        {error && <p className="text-[12.5px] text-danger">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" disabled={!name.trim() || !code.trim() || !ownerId || saving} onClick={submit}>
            {saving ? "Creating…" : "Create project"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
