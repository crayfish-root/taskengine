"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select, Label, FieldGroup } from "@/components/ui/input";
import { UPDATE_FREQUENCY } from "@/lib/status";
import { Plus } from "lucide-react";

export function RequestUpdateButton({
  people,
  projects,
  tasks,
}: {
  people: { id: string; name: string }[];
  projects: { id: string; name: string; code: string }[];
  tasks: { id: string; title: string; projectId: string | null }[];
}) {
  const [open, setOpen] = useState(false);
  const [requestedOfId, setRequestedOfId] = useState("");
  const [title, setTitle] = useState("");
  const [question, setQuestion] = useState("What is the current status?");
  const [frequency, setFrequency] = useState<keyof typeof UPDATE_FREQUENCY>("WEEKLY");
  const [projectId, setProjectId] = useState("");
  const [taskId, setTaskId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const filteredTasks = useMemo(
    () => (projectId ? tasks.filter((t) => t.projectId === projectId) : tasks),
    [projectId, tasks]
  );

  function reset() {
    setRequestedOfId("");
    setTitle("");
    setQuestion("What is the current status?");
    setFrequency("WEEKLY");
    setProjectId("");
    setTaskId("");
    setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch("/api/updates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        question,
        frequency,
        requestedOfId,
        projectId: projectId || undefined,
        taskId: taskId || undefined,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Could not create request");
      return;
    }
    setOpen(false);
    reset();
    router.refresh();
  }

  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>
        <Plus className="h-3.5 w-3.5" /> Request an update
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Request an update" description="Ask someone for a recurring status update.">
        <form onSubmit={submit} className="space-y-4">
          <FieldGroup>
            <Label htmlFor="requestedOfId">From</Label>
            <Select id="requestedOfId" required value={requestedOfId} onChange={(e) => setRequestedOfId(e.target.value)}>
              <option value="" disabled>
                Select a person
              </option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="title">Title</Label>
            <Input id="title" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Weekly project status" autoFocus />
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="question">Question</Label>
            <Textarea id="question" value={question} onChange={(e) => setQuestion(e.target.value)} />
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="frequency">Frequency</Label>
            <Select id="frequency" value={frequency} onChange={(e) => setFrequency(e.target.value as keyof typeof UPDATE_FREQUENCY)}>
              {Object.entries(UPDATE_FREQUENCY).map(([key, v]) => (
                <option key={key} value={key}>
                  {v.label}
                </option>
              ))}
            </Select>
          </FieldGroup>
          <div className="grid grid-cols-2 gap-3">
            <FieldGroup>
              <Label htmlFor="projectId">Project (optional)</Label>
              <Select
                id="projectId"
                value={projectId}
                onChange={(e) => {
                  setProjectId(e.target.value);
                  setTaskId("");
                }}
              >
                <option value="">None</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} — {p.name}
                  </option>
                ))}
              </Select>
            </FieldGroup>
            <FieldGroup>
              <Label htmlFor="taskId">Task (optional)</Label>
              <Select id="taskId" value={taskId} onChange={(e) => setTaskId(e.target.value)}>
                <option value="">None</option>
                {filteredTasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </Select>
            </FieldGroup>
          </div>
          {error && <p className="text-[12.5px] text-danger">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? "Sending…" : "Send request"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
