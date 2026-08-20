"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
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

export interface EditableTeam {
  id: string;
  name: string;
  description: string | null;
  color: string;
  departmentId: string | null;
  leadId: string | null;
  memberIds: string[];
}

export function EditTeamModalButton({
  team,
  departments,
  users,
}: {
  team: EditableTeam;
  departments: Option[];
  users: UserOption[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <Pencil className="h-3.5 w-3.5" />
        Edit team
      </Button>
      <EditTeamModal open={open} onClose={() => setOpen(false)} team={team} departments={departments} users={users} />
    </>
  );
}

function EditTeamModal({
  open,
  onClose,
  team,
  departments,
  users,
}: {
  open: boolean;
  onClose: () => void;
  team: EditableTeam;
  departments: Option[];
  users: UserOption[];
}) {
  const router = useRouter();
  const [name, setName] = useState(team.name);
  const [description, setDescription] = useState(team.description ?? "");
  const [color, setColor] = useState(team.color);
  const [departmentId, setDepartmentId] = useState(team.departmentId ?? "");
  const [leadId, setLeadId] = useState(team.leadId ?? "");
  const [memberIds, setMemberIds] = useState<string[]>(team.memberIds);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function toggleMember(id: string) {
    setMemberIds((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/org/teams/${team.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description: description || null,
        color,
        departmentId: departmentId || null,
        leadId: leadId || null,
        memberIds,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong");
      return;
    }
    onClose();
    router.refresh();
  }

  async function onDelete() {
    if (!confirm(`Delete the "${team.name}" team? This can't be undone.`)) return;
    setDeleting(true);
    setError(null);
    const res = await fetch(`/api/org/teams/${team.id}`, { method: "DELETE" });
    setDeleting(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong");
      return;
    }
    router.push("/org/teams");
    router.refresh();
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit team" size="lg">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto]">
          <FieldGroup>
            <Label htmlFor="et-name">Team name</Label>
            <Input id="et-name" required value={name} onChange={(e) => setName(e.target.value)} />
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="et-color">Color</Label>
            <input
              id="et-color"
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-9 w-14 cursor-pointer rounded-[10px] border border-border bg-surface p-1"
            />
          </FieldGroup>
        </div>

        <FieldGroup>
          <Label htmlFor="et-desc">Description</Label>
          <Textarea id="et-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
        </FieldGroup>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FieldGroup>
            <Label htmlFor="et-dept">Department</Label>
            <Select id="et-dept" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
              <option value="">None</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="et-lead">Team lead</Label>
            <Select id="et-lead" value={leadId} onChange={(e) => setLeadId(e.target.value)}>
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

        <div className="flex items-center justify-between gap-2 pt-2">
          <Button type="button" variant="ghost" className="text-danger hover:bg-danger-soft" onClick={onDelete} disabled={deleting}>
            {deleting ? "Deleting…" : "Delete team"}
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
