"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input, Select, Label, FieldGroup } from "@/components/ui/input";
import { ORG_LEVEL } from "@/lib/status";

interface Option {
  id: string;
  name: string;
}

export interface EditableUser {
  id: string;
  name: string;
  email: string;
  title: string | null;
  level: string;
  active: boolean;
  departmentId: string | null;
  managerId: string | null;
  teamIds: string[];
}

export function EditUserModalButton({
  user,
  departments,
  teams,
  managers,
}: {
  user: EditableUser;
  departments: Option[];
  teams: Option[];
  managers: Option[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <Pencil className="h-3.5 w-3.5" />
        Edit
      </Button>
      <EditUserModal open={open} onClose={() => setOpen(false)} user={user} departments={departments} teams={teams} managers={managers} />
    </>
  );
}

function EditUserModal({
  open,
  onClose,
  user,
  departments,
  teams,
  managers,
}: {
  open: boolean;
  onClose: () => void;
  user: EditableUser;
  departments: Option[];
  teams: Option[];
  managers: Option[];
}) {
  const router = useRouter();
  const [name, setName] = useState(user.name);
  const [title, setTitle] = useState(user.title ?? "");
  const [level, setLevel] = useState(user.level);
  const [departmentId, setDepartmentId] = useState(user.departmentId ?? "");
  const [managerId, setManagerId] = useState(user.managerId ?? "");
  const [teamIds, setTeamIds] = useState<string[]>(user.teamIds);
  const [active, setActive] = useState(user.active);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function toggleTeam(id: string) {
    setTeamIds((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/org/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        title: title || null,
        level,
        departmentId: departmentId || null,
        managerId: managerId || null,
        teamIds,
        active,
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

  return (
    <Modal open={open} onClose={onClose} title="Edit user" description={user.email} size="lg">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FieldGroup>
            <Label htmlFor="eu-name">Full name</Label>
            <Input id="eu-name" required value={name} onChange={(e) => setName(e.target.value)} />
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="eu-title">Title</Label>
            <Input id="eu-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </FieldGroup>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FieldGroup>
            <Label htmlFor="eu-level">Level</Label>
            <Select id="eu-level" value={level} onChange={(e) => setLevel(e.target.value)}>
              {Object.entries(ORG_LEVEL).map(([key, meta]) => (
                <option key={key} value={key}>
                  {meta.label}
                </option>
              ))}
            </Select>
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="eu-dept">Department</Label>
            <Select id="eu-dept" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
              <option value="">None</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="eu-manager">Reports to</Label>
            <Select id="eu-manager" value={managerId} onChange={(e) => setManagerId(e.target.value)}>
              <option value="">No manager</option>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </Select>
          </FieldGroup>
        </div>

        {teams.length > 0 && (
          <FieldGroup>
            <Label>Team memberships</Label>
            <div className="flex flex-wrap gap-1.5 rounded-[10px] border border-border p-2.5">
              {teams.map((t) => {
                const isActive = teamIds.includes(t.id);
                return (
                  <button
                    type="button"
                    key={t.id}
                    onClick={() => toggleTeam(t.id)}
                    className={
                      "rounded-full px-2.5 py-1 text-[12px] font-medium transition-colors " +
                      (isActive
                        ? "bg-accent text-white"
                        : "bg-black/[0.04] text-muted hover:text-foreground dark:bg-white/[0.06]")
                    }
                  >
                    {t.name}
                  </button>
                );
              })}
            </div>
          </FieldGroup>
        )}

        <FieldGroup>
          <button
            type="button"
            onClick={() => setActive((v) => !v)}
            className="flex w-full items-center justify-between rounded-[10px] border border-border px-3 py-2.5 text-left transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.04]"
          >
            <span>
              <span className="block text-[13px] font-medium text-foreground">Account active</span>
              <span className="block text-[12px] text-muted">Inactive users can&apos;t sign in.</span>
            </span>
            <span
              className={
                "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors " +
                (active ? "bg-accent" : "bg-black/[0.15] dark:bg-white/[0.2]")
              }
            >
              <span
                className={
                  "inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform " +
                  (active ? "translate-x-[18px]" : "translate-x-[3px]")
                }
              />
            </span>
          </button>
        </FieldGroup>

        {error && <p className="text-[13px] text-danger">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
