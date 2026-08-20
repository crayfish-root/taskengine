"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select, FieldGroup, Label } from "@/components/ui/input";
import { PRIORITY } from "@/lib/status";

export function EditTaskInline({
  taskId,
  initialTitle,
  initialDescription,
  initialPriority,
  initialStartDate,
  initialDueDate,
}: {
  taskId: string;
  initialTitle: string;
  initialDescription: string | null;
  initialPriority: string;
  initialStartDate: string | null;
  initialDueDate: string | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription ?? "");
  const [priority, setPriority] = useState(initialPriority);
  const [startDate, setStartDate] = useState(initialStartDate ? initialStartDate.slice(0, 10) : "");
  const [dueDate, setDueDate] = useState(initialDueDate ? initialDueDate.slice(0, 10) : "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        description: description.trim() || null,
        priority,
        startDate: startDate || null,
        dueDate: dueDate || null,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setEditing(false);
      router.refresh();
    }
  }

  function cancel() {
    setTitle(initialTitle);
    setDescription(initialDescription ?? "");
    setPriority(initialPriority);
    setStartDate(initialStartDate ? initialStartDate.slice(0, 10) : "");
    setDueDate(initialDueDate ? initialDueDate.slice(0, 10) : "");
    setEditing(false);
  }

  if (!editing) {
    return (
      <div>
        <div className="flex items-start justify-between gap-3">
          <p className="whitespace-pre-wrap text-[13.5px] text-foreground/90">
            {initialDescription || <span className="text-muted">No description.</span>}
          </p>
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <FieldGroup>
        <Label>Title</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
      </FieldGroup>
      <FieldGroup>
        <Label>Description</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
      </FieldGroup>
      <div className="grid grid-cols-3 gap-3">
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
          <Label>Start date</Label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </FieldGroup>
        <FieldGroup>
          <Label>Due date</Label>
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </FieldGroup>
      </div>
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={cancel}>
          <X className="h-3.5 w-3.5" /> Cancel
        </Button>
        <Button size="sm" variant="primary" disabled={!title.trim() || saving} onClick={save}>
          <Check className="h-3.5 w-3.5" /> {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}
