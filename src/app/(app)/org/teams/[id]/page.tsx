import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ORG_LEVEL } from "@/lib/status";
import { levelLabel } from "@/lib/utils";
import { EditTeamModalButton } from "../../_components/edit-team-modal";

export default async function TeamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const team = await prisma.team.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      description: true,
      color: true,
      departmentId: true,
      department: { select: { id: true, name: true, color: true } },
      leadId: true,
      lead: { select: { id: true, name: true, title: true, avatarColor: true, avatarEmoji: true, level: true } },
      members: {
        select: { user: { select: { id: true, name: true, title: true, level: true, avatarColor: true, avatarEmoji: true, active: true } } },
      },
    },
  });
  if (!team) notFound();

  const [departments, users] = await Promise.all([
    prisma.department.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.user.findMany({ where: { active: true }, select: { id: true, name: true, avatarColor: true, avatarEmoji: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-1 text-[12.5px] text-muted">
        <Link href="/org/teams" className="transition-colors hover:text-foreground">
          Teams
        </Link>
        <ChevronRight className="h-3 w-3 text-muted-2" />
        <span className="font-medium text-foreground">{team.name}</span>
      </div>

      <PageHeader
        title={team.name}
        description={team.description ?? undefined}
        actions={
          <EditTeamModalButton
            team={{
              id: team.id,
              name: team.name,
              description: team.description,
              color: team.color,
              departmentId: team.departmentId,
              leadId: team.leadId,
              memberIds: team.members.map((m) => m.user.id),
            }}
            departments={departments}
            users={users}
          />
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Department</CardTitle>
            </CardHeader>
            <CardContent>
              {team.department ? (
                <Badge tone="neutral" dot>
                  {team.department.name}
                </Badge>
              ) : (
                <p className="text-[13px] text-muted">No department assigned.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Team lead</CardTitle>
            </CardHeader>
            <CardContent>
              {team.lead ? (
                <Link
                  href={`/org/users/${team.lead.id}`}
                  className="-m-1.5 flex items-center gap-3 rounded-[10px] p-1.5 transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.05]"
                >
                  <Avatar name={team.lead.name} color={team.lead.avatarColor} emoji={team.lead.avatarEmoji} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-foreground">{team.lead.name}</p>
                    <p className="truncate text-[11.5px] text-muted">{team.lead.title ?? levelLabel(team.lead.level)}</p>
                  </div>
                </Link>
              ) : (
                <p className="text-[13px] text-muted">No lead assigned.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Members</CardTitle>
            </CardHeader>
            <CardContent>
              {team.members.length === 0 ? (
                <EmptyState title="No members yet" description="Add people to this team from the Edit team dialog." />
              ) : (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {team.members.map(({ user }) => (
                    <Link
                      key={user.id}
                      href={`/org/users/${user.id}`}
                      className={`flex items-center gap-3 rounded-[10px] border border-border p-2.5 transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.04] ${
                        !user.active ? "opacity-60" : ""
                      }`}
                    >
                      <Avatar name={user.name} color={user.avatarColor} emoji={user.avatarEmoji} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-foreground">{user.name}</p>
                        <p className="truncate text-[11.5px] text-muted">{user.title ?? levelLabel(user.level)}</p>
                      </div>
                      <StatusBadge map={ORG_LEVEL} value={user.level} dot={false} />
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
