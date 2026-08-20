"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/tabs";
import { FieldGroup, Label, Select } from "@/components/ui/input";
import { PeoplePicker, PickablePerson } from "./people-picker";

export function AssignModal({
  open,
  onClose,
  taskId,
  people,
  teams,
  excludeIds = [],
}: {
  open: boolean;
  onClose: () => void;
  taskId: string;
  people: PickablePerson[];
  teams: { id: string; name: string }[];
  excludeIds?: string[];
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"people" | "team">("people");
  const [selected, setSelected] = useState<string[]>([]);
  const [teamId, setTeamId] = useState(teams[0]?.id ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/tasks/${taskId}/assignments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mode === "people" ? { userIds: selected } : { teamId }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not assign");
      return;
    }
    setSelected([]);
    onClose();
    router.refresh();
  }

  const canSubmit = mode === "people" ? selected.length > 0 : !!teamId;

  return (
    <Modal open={open} onClose={onClose} title="Add assignees" description="Adds collaborators without changing the delegation chain." size="md">
      <div className="space-y-4">
        {teams.length > 0 && (
          <SegmentedControl
            value={mode}
            onChange={(v) => setMode(v as "people" | "team")}
            options={[
              { label: "People", value: "people" },
              { label: "Whole team", value: "team" },
            ]}
          />
        )}
        {mode === "people" ? (
          <PeoplePicker people={people} selected={selected} excludeIds={excludeIds} onToggle={(id) =>
            setSelected((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]))
          } />
        ) : (
          <FieldGroup>
            <Label>Team</Label>
            <Select value={teamId} onChange={(e) => setTeamId(e.target.value)}>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
            <p className="mt-1.5 text-[11.5px] text-muted">Every member of this team will be assigned to the task.</p>
          </FieldGroup>
        )}
        {error && <p className="text-[12.5px] text-danger">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" disabled={!canSubmit || saving} onClick={submit}>
            {saving ? "Assigning…" : "Assign"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
