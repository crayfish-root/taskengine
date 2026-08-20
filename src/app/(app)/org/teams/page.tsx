import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarStack } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { Building2 } from "lucide-react";
import { OrgSubnav } from "../_components/org-subnav";
import { CreateTeamModalButton } from "../_components/create-team-modal";

export default async function TeamsPage() {
  const [teams, departments, users] = await Promise.all([
    prisma.team.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        color: true,
        department: { select: { id: true, name: true, color: true } },
        lead: { select: { id: true, name: true, avatarColor: true, avatarEmoji: true, title: true } },
        members: { select: { user: { select: { id: true, name: true, avatarColor: true, avatarEmoji: true } } } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.department.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.user.findMany({ where: { active: true }, select: { id: true, name: true, avatarColor: true, avatarEmoji: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <PageHeader
        eyebrow="People"
        title="Teams"
        description="Working groups within each department, with a lead and a roster of members."
        actions={<CreateTeamModalButton departments={departments} users={users} />}
      />
      <OrgSubnav active="teams" />

      <div className="mt-6">
        {teams.length === 0 ? (
          <EmptyState icon={Building2} title="No teams yet" description="Create the first team to start grouping people around shared work." />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {teams.map((t) => (
              <Link key={t.id} href={`/org/teams/${t.id}`} className="block">
                <Card className="h-full transition-shadow hover:shadow-[var(--shadow-sm)]">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: t.color }} />
                        <p className="text-[14px] font-semibold text-foreground">{t.name}</p>
                      </div>
                      {t.department && (
                        <Badge tone="neutral" className="shrink-0">
                          {t.department.name}
                        </Badge>
                      )}
                    </div>
                    {t.description && <p className="mt-1.5 line-clamp-2 text-[12.5px] text-muted">{t.description}</p>}

                    <div className="mt-4 flex items-center justify-between">
                      {t.lead ? (
                        <div className="flex items-center gap-2">
                          <Avatar name={t.lead.name} color={t.lead.avatarColor} emoji={t.lead.avatarEmoji} size="xs" />
                          <p className="truncate text-[12px] text-muted">{t.lead.name}</p>
                        </div>
                      ) : (
                        <p className="text-[12px] text-muted-2">No lead assigned</p>
                      )}
                      {t.members.length > 0 && <AvatarStack users={t.members.map((m) => m.user)} size="xs" max={4} />}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
