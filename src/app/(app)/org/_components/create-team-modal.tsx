"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input, Select, Textarea, Label, FieldGroup } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";

interface Option {
  id: string;
  name: string;
}
interface UserOption extends Option {
  avatarColor?: string | null;
  avatarEmoji?: string | null;
}

export function CreateTeamModalButton({
  departments,
  users,
}: {
  departments: Option[];
  users: UserOption[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        New team
      </Button>
      <CreateTeamModal open={open} onClose={() => setOpen(false)} departments={departments} users={users} />
    </>
  );
}

const DEFAULT_COLOR = "#0ea5e9";

function CreateTeamModal({
  open,
  onClose,
  departments,
  users,
}: {
  open: boolean;
  onClose: () => void;
  departments: Option[];
  users: UserOption[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [departmentId, setDepartmentId] = useState("");
  const [leadId, setLeadId] = useState("");
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function reset() {
    setName("");
    setDescription("");
    setColor(DEFAULT_COLOR);
    setDepartmentId("");
    setLeadId("");
    setMemberIds([]);
    setError(null);
  }

  function toggleMember(id: string) {
    setMemberIds((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/org/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description: description || undefined,
        color,
        departmentId: departmentId || undefined,
        leadId: leadId || undefined,
        memberIds,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong");
      return;
    }
    reset();
    onClose();
    router.refresh();
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        onClose();
        setError(null);
      }}
      title="New team"
      size="lg"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto]">
          <FieldGroup>
            <Label htmlFor="t-name">Team name</Label>
            <Input id="t-name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Platform Engineering" />
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="t-color">Color</Label>
            <input
              id="t-color"
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-9 w-14 cursor-pointer rounded-[10px] border border-border bg-surface p-1"
            />
          </FieldGroup>
        </div>

        <FieldGroup>
          <Label htmlFor="t-desc">Description</Label>
          <Textarea id="t-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does this team own?" />
        </FieldGroup>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FieldGroup>
            <Label htmlFor="t-dept">Department</Label>
            <Select id="t-dept" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
              <option value="">None</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="t-lead">Team lead</Label>
            <Select id="t-lead" value={leadId} onChange={(e) => setLeadId(e.target.value)}>
              <option value="">No lead</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </Select>
          </FieldGroup>
        </div>

        <FieldGroup>
          <Label>Members</Label>
          <div className="max-h-52 space-y-0.5 overflow-y-auto rounded-[10px] border border-border p-2">
            {users.map((u) => {
              const checked = memberIds.includes(u.id);
              return (
                <label
                  key={u.id}
                  className="flex cursor-pointer items-center gap-2.5 rounded-[8px] px-2 py-1.5 transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.05]"
                >
                  <input type="checkbox" checked={checked} onChange={() => toggleMember(u.id)} className="h-3.5 w-3.5 accent-accent" />
                  <Avatar name={u.name} color={u.avatarColor} emoji={u.avatarEmoji} size="xs" />
                  <span className="truncate text-[13px] text-foreground">{u.name}</span>
                </label>
              );
            })}
          </div>
        </FieldGroup>

        {error && <p className="text-[13px] text-danger">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? "Creating…" : "Create team"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
