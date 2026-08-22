"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input, Select, Label, FieldGroup } from "@/components/ui/input";
import { CopyField } from "@/components/ui/copy-field";
import { ORG_LEVEL } from "@/lib/status";

interface Option {
  id: string;
  name: string;
}

export function CreateUserModalButton({
  departments,
  teams,
  managers,
}: {
  departments: Option[];
  teams: Option[];
  managers: Option[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>
        <UserPlus className="h-4 w-4" />
        Invite person
      </Button>
      <CreateUserModal open={open} onClose={() => setOpen(false)} departments={departments} teams={teams} managers={managers} />
    </>
  );
}

function CreateUserModal({
  open,
  onClose,
  departments,
  teams,
  managers,
}: {
  open: boolean;
  onClose: () => void;
  departments: Option[];
  teams: Option[];
  managers: Option[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [level, setLevel] = useState("STAFF");
  const [departmentId, setDepartmentId] = useState("");
  const [managerId, setManagerId] = useState("");
  const [teamIds, setTeamIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [invitedName, setInvitedName] = useState("");

  function reset() {
    setName("");
    setEmail("");
    setTitle("");
    setLevel("STAFF");
    setDepartmentId("");
    setManagerId("");
    setTeamIds([]);
    setError(null);
    setInviteLink(null);
  }

  function toggleTeam(id: string) {
    setTeamIds((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  }

  function handleClose() {
    const wasInvited = inviteLink !== null;
    reset();
    onClose();
    if (wasInvited) router.refresh();
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/org/users/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        title: title || undefined,
        level,
        departmentId: departmentId || undefined,
        managerId: managerId || undefined,
        teamIds,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong");
      return;
    }
    const data = await res.json();
    setInvitedName(name);
    setInviteLink(`${window.location.origin}/accept-invite?token=${data.token}`);
  }

  if (inviteLink) {
    return (
      <Modal open={open} onClose={handleClose} title="Invite sent" size="lg">
        <div className="space-y-4">
          <p className="text-[13.5px] text-foreground">
            {invitedName}&apos;s account has been created and is pending activation. Share this link with them — it expires in 7 days:
          </p>
          <CopyField value={inviteLink} />
          <div className="flex justify-end pt-2">
            <Button variant="primary" onClick={handleClose}>
              Done
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        onClose();
        setError(null);
      }}
      title="Invite person"
      description="Creates a pending account and gives you a one-time link to set them up with — no email is sent automatically."
      size="lg"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FieldGroup>
            <Label htmlFor="u-name">Full name</Label>
            <Input id="u-name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Jordan Reyes" />
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="u-email">Email</Label>
            <Input id="u-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jordan.reyes@taskengine.io" />
          </FieldGroup>
        </div>

        <FieldGroup>
          <Label htmlFor="u-title">Title</Label>
          <Input id="u-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Product Manager" />
        </FieldGroup>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FieldGroup>
            <Label htmlFor="u-level">Level</Label>
            <Select id="u-level" value={level} onChange={(e) => setLevel(e.target.value)}>
              {Object.entries(ORG_LEVEL).map(([key, meta]) => (
                <option key={key} value={key}>
                  {meta.label}
                </option>
              ))}
            </Select>
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="u-dept">Department</Label>
            <Select id="u-dept" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
              <option value="">None</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="u-manager">Reports to</Label>
            <Select id="u-manager" value={managerId} onChange={(e) => setManagerId(e.target.value)}>
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
                const active = teamIds.includes(t.id);
                return (
                  <button
                    type="button"
                    key={t.id}
                    onClick={() => toggleTeam(t.id)}
                    className={
                      "rounded-full px-2.5 py-1 text-[12px] font-medium transition-colors " +
                      (active
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

        {error && <p className="text-[13px] text-danger">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? "Creating…" : "Create invite"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
