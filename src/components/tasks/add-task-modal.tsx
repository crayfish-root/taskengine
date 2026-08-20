"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FieldGroup, Label, Input, Textarea, Select } from "@/components/ui/input";
import { PeoplePicker, PickablePerson } from "./people-picker";
import { PRIORITY } from "@/lib/status";

export function AddTaskModal({
  open,
  onClose,
  projectId,
  parentTaskId,
  people,
  title = "New task",
}: {
  open: boolean;
  onClose: () => void;
  projectId?: string | null;
  parentTaskId?: string | null;
  people: PickablePerson[];
  title?: string;
}) {
  const router = useRouter();
  const [taskTitle, setTaskTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [dueDate, setDueDate] = useState("");
  const [assignees, setAssignees] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setTaskTitle("");
    setDescription("");
    setPriority("MEDIUM");
    setDueDate("");
    setAssignees([]);
    setError(null);
  }

  async function submit() {
    if (!taskTitle.trim()) return;
    setSaving(true);
    setError(null);
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: taskTitle.trim(),
        description: description.trim() || undefined,
        projectId: projectId || undefined,
        parentTaskId: parentTaskId || undefined,
        priority,
        dueDate: dueDate || undefined,
        assigneeIds: assignees,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not create task");
      return;
    }
    reset();
    onClose();
    router.refresh();
  }

  return (
    <Modal open={open} onClose={onClose} title={title} size="md">
      <div className="space-y-4">
        <FieldGroup>
          <Label>Title</Label>
          <Input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="Task title" autoFocus />
        </FieldGroup>
        <FieldGroup>
          <Label>Description</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
        </FieldGroup>
        <div className="grid grid-cols-2 gap-3">
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
            <Label>Due date</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </FieldGroup>
        </div>
        <FieldGroup>
          <Label>Assignees ({assignees.length})</Label>
          <PeoplePicker
            people={people}
            selected={assignees}
            onToggle={(id) =>
              setAssignees((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]))
            }
          />
        </FieldGroup>
        {error && <p className="text-[12.5px] text-danger">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" disabled={!taskTitle.trim() || saving} onClick={submit}>
            {saving ? "Creating…" : "Create task"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
