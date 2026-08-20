import { notFound } from "next/navigation";
import { ListChecks, ShieldAlert } from "lucide-react";
import { endOfDay, startOfDay } from "date-fns";

import { prisma } from "@/lib/prisma";
import { formatDateShort } from "@/lib/utils";
import { PROJECT_STATUS, TASK_STATUS, BLOCKER_SEVERITY, BLOCKER_STATUS } from "@/lib/status";

import { PageHeader } from "@/components/ui/page-header";
import { Avatar, AvatarStack } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/dashboard/stat-card";
import { StatusBreakdown, type BreakdownSegment } from "@/components/dashboard/status-breakdown";
import { SectionCard } from "@/components/dashboard/section-card";

export default async function TeamDashboardPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: {
      id: true,
      name: true,
      description: true,
      color: true,
      department: { select: { id: true, name: true } },
      lead: { select: { id: true, name: true, avatarColor: true, avatarEmoji: true, title: true } },
      members: {
        select: {
          user: { select: { id: true, name: true, avatarColor: true, avatarEmoji: true, title: true, level: true } },
        },
      },
    },
  });

  if (!team) notFound();

  const memberIds = team.members.map((m) => m.user.id);
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  const [projects, taskAssignments, onLeave] = await Promise.all([
    prisma.project.findMany({
      where: { teams: { some: { teamId: team.id } } },
      select: { id: true, name: true, code: true, status: true, priority: true, targetDate: true },
      orderBy: { updatedAt: "desc" },
    }),
    memberIds.length
      ? prisma.taskAssignment.findMany({
          where: { userId: { in: memberIds } },
          select: { task: { select: { id: true, status: true } } },
          distinct: ["taskId"],
        })
      : Promise.resolve([]),
    memberIds.length
      ? prisma.leaveRequest.findMany({
          where: {
            status: "APPROVED",
            userId: { in: memberIds },
            startDate: { lte: todayEnd },
            endDate: { gte: todayStart },
          },
          select: { user: { select: { id: true, name: true, avatarColor: true, avatarEmoji: true } } },
          distinct: ["userId"],
        })
      : Promise.resolve([]),
  ]);

  const projectIds = projects.map((p) => p.id);

  const blockers = await prisma.blocker.findMany({
    where: {
      status: { not: "RESOLVED" },
      OR: [{ projectId: { in: projectIds } }, { raisedById: { in: memberIds } }, { ownerId: { in: memberIds } }],
    },
    select: {
      id: true,
      title: true,
      severity: true,
      status: true,
      createdAt: true,
      project: { select: { id: true, name: true } },
      raisedBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const taskSegments: BreakdownSegment[] = Object.entries(TASK_STATUS).map(([key, meta]) => ({
    key,
    label: meta.label,
    tone: meta.tone,
    value: taskAssignments.filter((a) => a.task.status === key).length,
  }));

  const activeProjectCount = projects.filter((p) => p.status !== "COMPLETED" && p.status !== "CANCELLED").length;
  const openTaskCount = taskAssignments.filter((a) => a.task.status !== "DONE" && a.task.status !== "CANCELLED").length;

  return (
    <div>
      <PageHeader
        eyebrow={team.department ? team.department.name : "Team"}
        title={team.name}
        description={team.description ?? undefined}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionCard title="Team">
          <div className="space-y-4">
            {team.lead && (
              <div className="flex items-center gap-3">
                <Avatar name={team.lead.name} color={team.lead.avatarColor} emoji={team.lead.avatarEmoji} size="md" />
                <div className="min-w-0">
                  <p className="truncate text-[13.5px] font-medium text-foreground">{team.lead.name}</p>
                  <p className="truncate text-[12px] text-muted-2">{team.lead.title ?? "Team lead"}</p>
                </div>
              </div>
            )}
            <div>
              <p className="mb-2 text-[12.5px] font-medium text-muted">
                {team.members.length} member{team.members.length === 1 ? "" : "s"}
              </p>
              {team.members.length > 0 ? (
                <AvatarStack users={team.members.map((m) => m.user)} max={10} size="md" />
              ) : (
                <p className="text-[12.5px] text-muted-2">No members yet.</p>
              )}
            </div>
          </div>
        </SectionCard>

        <StatCard label="Active projects" value={activeProjectCount} icon={ListChecks} hint={`${projects.length} total`} />
        <StatCard
          label="Open blockers"
          value={blockers.length}
          icon={ShieldAlert}
          tone={blockers.length > 0 ? "warning" : "neutral"}
          href="/blockers"
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionCard title="Task status" description={`${openTaskCount} open across the team`} className="lg:col-span-2">
          <StatusBreakdown segments={taskSegments} emptyLabel="No tasks assigned to this team yet" />
        </SectionCard>
        <SectionCard title="On leave today" action={{ label: "View leave", href: "/leave" }}>
          {onLeave.length === 0 ? (
            <p className="text-[12.5px] text-muted-2">Everyone is in today.</p>
          ) : (
            <div className="space-y-2.5">
              {onLeave.map((r) => (
                <div key={r.user.id} className="flex items-center gap-2.5">
                  <Avatar name={r.user.name} color={r.user.avatarColor} emoji={r.user.avatarEmoji} size="sm" />
                  <p className="truncate text-[13px] text-foreground">{r.user.name}</p>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Projects" description="Associated with this team" action={{ label: "All projects", href: "/projects" }}>
          {projects.length === 0 ? (
            <EmptyState icon={ListChecks} title="No projects yet" description="Projects assigned to this team will appear here." />
          ) : (
            <ul className="divide-y divide-border-soft">
              {projects.map((p) => (
                <li key={p.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-foreground">{p.name}</p>
                    <p className="truncate text-[12px] text-muted-2">
                      {p.code}
                      {p.targetDate ? ` · target ${formatDateShort(p.targetDate)}` : ""}
                    </p>
                  </div>
                  <StatusBadge map={PROJECT_STATUS} value={p.status} />
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Open blockers" action={{ label: "All blockers", href: "/blockers" }}>
          {blockers.length === 0 ? (
            <EmptyState icon={ShieldAlert} title="No open blockers" description="Nice — nothing is currently blocking this team." />
          ) : (
            <ul className="divide-y divide-border-soft">
              {blockers.slice(0, 8).map((b) => (
                <li key={b.id} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-foreground">{b.title}</p>
                    <p className="truncate text-[12px] text-muted-2">
                      {b.project?.name ?? "No project"} · raised by {b.raisedBy.name}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <Badge tone={BLOCKER_SEVERITY[b.severity]?.tone ?? "neutral"}>{BLOCKER_SEVERITY[b.severity]?.label}</Badge>
                    <StatusBadge map={BLOCKER_STATUS} value={b.status} dot={false} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
