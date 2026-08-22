"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Select, FieldGroup, Label } from "@/components/ui/input";
import { PeoplePicker, PickablePerson } from "@/components/tasks/people-picker";
import { levelLabel } from "@/lib/utils";

export interface ProjectMemberRow {
  userId: string;
  role: string;
  user: { id: string; name: string; title: string | null; level: string; avatarColor: string; avatarEmoji: string | null };
}
export interface ProjectTeamRow {
  teamId: string;
  team: { id: string; name: string; color: string; members: { user: { id: string; name: string; avatarColor: string; avatarEmoji: string | null } }[] };
}

export function ProjectTeamPanel({
  projectId,
  members,
  teams,
  people,
  allTeams,
  ownerId,
}: {
  projectId: string;
  members: ProjectMemberRow[];
  teams: ProjectTeamRow[];
  people: PickablePerson[];
  allTeams: { id: string; name: string }[];
  ownerId: string;
}) {
  const router = useRouter();
  const [memberModal, setMemberModal] = useState(false);
  const [teamModal, setTeamModal] = useState(false);
  const [pickedUser, setPickedUser] = useState<string | null>(null);
  const [pickedTeam, setPickedTeam] = useState(allTeams[0]?.id ?? "");
  const [busy, setBusy] = useState(false);

  async function addMember() {
    if (!pickedUser) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: pickedUser }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Could not add member");
      }
      setPickedUser(null);
      setMemberModal(false);
      router.refresh();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Could not add member");
    } finally {
      setBusy(false);
    }
  }

  async function removeMember(userId: string) {
    try {
      const res = await fetch(`/api/projects/${projectId}/members?userId=${userId}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Could not remove member");
      }
      router.refresh();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Could not remove member");
    }
  }

  async function addTeam() {
    if (!pickedTeam) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/teams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId: pickedTeam }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Could not add team");
      }
      setTeamModal(false);
      router.refresh();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Could not add team");
    } finally {
      setBusy(false);
    }
  }

  async function removeTeam(teamId: string) {
    try {
      const res = await fetch(`/api/projects/${projectId}/teams?teamId=${teamId}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Could not remove team");
      }
      router.refresh();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Could not remove team");
    }
  }

  const availableTeams = allTeams.filter((t) => !teams.some((pt) => pt.teamId === t.id));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Members</CardTitle>
          <Button size="sm" variant="ghost" onClick={() => setMemberModal(true)}>
            <Plus className="h-3.5 w-3.5" /> Add
          </Button>
        </CardHeader>
        <CardContent className="space-y-2.5 pt-3">
          {members.map((m) => (
            <div key={m.userId} className="flex items-center gap-2.5 group">
              <Avatar name={m.user.name} color={m.user.avatarColor} emoji={m.user.avatarEmoji} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium leading-tight">{m.user.name}</p>
                <p className="truncate text-[11px] text-muted leading-tight">
                  {m.role} · {m.user.title ?? levelLabel(m.user.level)}
                </p>
              </div>
              {m.userId !== ownerId && (
                <button
                  onClick={() => removeMember(m.userId)}
                  className="opacity-0 group-hover:opacity-100 rounded-full p-1 text-muted-2 hover:bg-black/[0.05] hover:text-danger dark:hover:bg-white/[0.08] transition-all"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Teams</CardTitle>
          {availableTeams.length > 0 && (
            <Button size="sm" variant="ghost" onClick={() => setTeamModal(true)}>
              <Plus className="h-3.5 w-3.5" /> Add
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3 pt-3">
          {teams.length === 0 && <p className="text-[13px] text-muted">No teams assigned.</p>}
          {teams.map((pt) => (
            <div key={pt.teamId} className="rounded-[10px] border border-border-soft p-2.5 group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: pt.team.color }} />
                  <p className="text-[13px] font-medium">{pt.team.name}</p>
                </div>
                <button
                  onClick={() => removeTeam(pt.teamId)}
                  className="opacity-0 group-hover:opacity-100 rounded-full p-1 text-muted-2 hover:bg-black/[0.05] hover:text-danger dark:hover:bg-white/[0.08] transition-all"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="mt-1.5 flex -space-x-2">
                {pt.team.members.slice(0, 8).map((m) => (
                  <Avatar key={m.user.id} name={m.user.name} color={m.user.avatarColor} emoji={m.user.avatarEmoji} size="xs" ring />
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Modal open={memberModal} onClose={() => setMemberModal(false)} title="Add member" size="sm">
        <div className="space-y-4">
          <PeoplePicker
            people={people}
            selected={pickedUser ? [pickedUser] : []}
            onToggle={(id) => setPickedUser(id === pickedUser ? null : id)}
            multi={false}
            excludeIds={members.map((m) => m.userId)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setMemberModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" disabled={!pickedUser || busy} onClick={addMember}>
              Add
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={teamModal} onClose={() => setTeamModal(false)} title="Add team" size="sm">
        <div className="space-y-4">
          <FieldGroup>
            <Label>Team</Label>
            <Select value={pickedTeam} onChange={(e) => setPickedTeam(e.target.value)}>
              {availableTeams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </FieldGroup>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setTeamModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" disabled={!pickedTeam || busy} onClick={addTeam}>
              Add
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
