"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input, Textarea, Label, FieldGroup } from "@/components/ui/input";

export function CreateDepartmentModalButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        New department
      </Button>
      <DepartmentModal open={open} onClose={() => setOpen(false)} mode="create" />
    </>
  );
}

export interface EditableDepartment {
  id: string;
  name: string;
  description: string | null;
  color: string;
  canDelete: boolean;
}

export function EditDepartmentModalButton({ department }: { department: EditableDepartment }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label={`Edit ${department.name}`}>
        <Pencil className="h-3.5 w-3.5" />
      </Button>
      <DepartmentModal open={open} onClose={() => setOpen(false)} mode="edit" department={department} />
    </>
  );
}

const DEFAULT_COLOR = "#6366f1";

function DepartmentModal({
  open,
  onClose,
  mode,
  department,
}: {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  department?: EditableDepartment;
}) {
  const router = useRouter();
  const [name, setName] = useState(department?.name ?? "");
  const [description, setDescription] = useState(department?.description ?? "");
  const [color, setColor] = useState(department?.color ?? DEFAULT_COLOR);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const url = mode === "create" ? "/api/org/departments" : `/api/org/departments/${department!.id}`;
    const res = await fetch(url, {
      method: mode === "create" ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description: description || null, color }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong");
      return;
    }
    if (mode === "create") {
      setName("");
      setDescription("");
      setColor(DEFAULT_COLOR);
    }
    onClose();
    router.refresh();
  }

  async function onDelete() {
    if (!department) return;
    if (!confirm(`Delete the "${department.name}" department? This can't be undone.`)) return;
    setDeleting(true);
    setError(null);
    const res = await fetch(`/api/org/departments/${department.id}`, { method: "DELETE" });
    setDeleting(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong");
      return;
    }
    onClose();
    router.refresh();
  }

  return (
    <Modal open={open} onClose={onClose} title={mode === "create" ? "New department" : "Edit department"} size="md">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto]">
          <FieldGroup>
            <Label htmlFor="d-name">Name</Label>
            <Input id="d-name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Engineering" />
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="d-color">Color</Label>
            <input
              id="d-color"
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-9 w-14 cursor-pointer rounded-[10px] border border-border bg-surface p-1"
            />
          </FieldGroup>
        </div>
        <FieldGroup>
          <Label htmlFor="d-desc">Description</Label>
          <Textarea id="d-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does this department own?" />
        </FieldGroup>

        {error && <p className="text-[13px] text-danger">{error}</p>}

        <div className="flex items-center justify-between gap-2 pt-2">
          {mode === "edit" && department?.canDelete && (
            <Button type="button" variant="ghost" className="text-danger hover:bg-danger-soft" onClick={onDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          )}
          <div className="ml-auto flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? "Saving…" : mode === "create" ? "Create department" : "Save changes"}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
