import Link from "next/link";
import {
  ListChecks,
  AlertTriangle,
  RefreshCw,
  CalendarClock,
  Flame,
  ShieldAlert,
  CalendarOff,
  Target,
  ArrowRight,
  GitBranch,
  Inbox,
} from "lucide-react";
import { addDays, endOfDay, startOfDay } from "date-fns";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getAllReportIds } from "@/lib/org";
import { formatDateShort, levelLabel, relativeTime } from "@/lib/utils";
import { PROJECT_STATUS, BLOCKER_SEVERITY, TASK_STATUS } from "@/lib/status";
import { isKpiOnTarget } from "./_lib/kpi-health";

import { PageHeader } from "@/components/ui/page-header";
import { Avatar, AvatarStack } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/dashboard/stat-card";
import { StatusBreakdown, type BreakdownSegment } from "@/components/dashboard/status-breakdown";
import { SectionCard } from "@/components/dashboard/section-card";

function greetingWord(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function humanizeAction(action: string) {
  const spaced = action.replace(/[_-]+/g, " ").trim();
  if (!spaced) return action;
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const weekEnd = endOfDay(addDays(now, 7));

  const reportIds = await getAllReportIds(user.id);
  const scopeIds = [user.id, ...reportIds];
  const isManager = reportIds.length > 0;

  const [
    department,
    openTasksCount,
    overdueTasksCount,
    upcomingDeadlinesCount,
    awaitingUpdateCount,
    delegatedByMe,
    delegatedToMe,
    activity,
  ] = await Promise.all([
    user.departmentId
      ? prisma.department.findUnique({ where: { id: user.departmentId }, select: { name: true } })
      : Promise.resolve(null),
    prisma.taskAssignment.count({
      where: { userId: user.id, task: { status: { notIn: ["DONE", "CANCELLED"] } } },
    }),
    prisma.taskAssignment.count({
      where: {
        userId: user.id,
        task: { status: { notIn: ["DONE", "CANCELLED"] }, dueDate: { lt: now } },
      },
    }),
    prisma.taskAssignment.count({
      where: {
        userId: user.id,
        task: { status: { notIn: ["DONE", "CANCELLED"] }, dueDate: { gte: now, lte: weekEnd } },
      },
    }),
    prisma.scheduledUpdateRequest.count({
      where: { requestedOfId: user.id, active: true, nextDueAt: { lte: now } },
    }),
    prisma.task.findMany({
      where: { delegatedById: user.id },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: {
        id: true,
        title: true,
        status: true,
        dueDate: true,
        project: { select: { id: true, name: true } },
        assignments: {
          where: { isPrimary: true },
          select: { user: { select: { id: true, name: true, avatarColor: true, avatarEmoji: true } } },
        },
      },
    }),
    prisma.task.findMany({
      where: { delegatedById: { not: null }, assignments: { some: { userId: user.id } } },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: {
        id: true,
        title: true,
        status: true,
        dueDate: true,
        project: { select: { id: true, name: true } },
        delegatedBy: { select: { id: true, name: true } },
      },
    }),
    prisma.activityLog.findMany({
      where: { userId: { in: scopeIds } },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        createdAt: true,
        user: { select: { id: true, name: true, avatarColor: true, avatarEmoji: true } },
      },
    }),
  ]);

  let rollup: {
    projects: { id: string; status: string }[];
    atRiskCount: number;
    blockerSegments: BreakdownSegment[];
    openBlockersCount: number;
    onLeave: { id: string; name: string; avatarColor: string | null; avatarEmoji: string | null }[];
    kpiOnTarget: number;
    kpiTotal: number;
  } | null = null;

  if (isManager) {
    const projects = await prisma.project.findMany({
      where: {
        OR: [
          { ownerId: { in: scopeIds } },
          { members: { some: { userId: { in: scopeIds } } } },
          ...(user.departmentId ? [{ departmentId: user.departmentId }] : []),
        ],
      },
      select: { id: true, status: true },
    });
    const projectIds = projects.map((p) => p.id);

    const [blockers, onLeaveRows, kpis] = await Promise.all([
      prisma.blocker.findMany({
        where: {
          status: { not: "RESOLVED" },
          OR: [
            { projectId: { in: projectIds } },
            { ownerId: { in: scopeIds } },
            { raisedById: { in: scopeIds } },
          ],
        },
        select: { id: true, severity: true },
      }),
      prisma.leaveRequest.findMany({
        where: {
          status: "APPROVED",
          userId: { in: scopeIds },
          startDate: { lte: todayEnd },
          endDate: { gte: todayStart },
        },
        select: { user: { select: { id: true, name: true, avatarColor: true, avatarEmoji: true } } },
        distinct: ["userId"],
      }),
      prisma.kpi.findMany({
        where: {
          OR: [{ ownerId: { in: scopeIds } }, ...(user.departmentId ? [{ departmentId: user.departmentId }] : [])],
        },
        select: {
          target: true,
          direction: true,
          records: { orderBy: { periodEnd: "desc" }, take: 1, select: { value: true } },
        },
      }),
    ]);

    let kpiOnTarget = 0;
    let kpiWithData = 0;
    for (const k of kpis) {
      const latest = k.records[0];
      if (!latest) continue;
      kpiWithData++;
      if (isKpiOnTarget(latest.value, k.target, k.direction)) kpiOnTarget++;
    }

    rollup = {
      projects,
      atRiskCount: projects.filter((p) => p.status === "AT_RISK" || p.status === "DELAYED").length,
      blockerSegments: Object.entries(BLOCKER_SEVERITY).map(([key, meta]) => ({
        key,
        label: meta.label,
        tone: meta.tone,
        value: blockers.filter((b) => b.severity === key).length,
      })),
      openBlockersCount: blockers.length,
      onLeave: onLeaveRows.map((r) => r.user),
      kpiOnTarget,
      kpiTotal: kpiWithData,
    };
  }

  const projectSegments: BreakdownSegment[] = rollup
    ? Object.entries(PROJECT_STATUS).map(([key, meta]) => ({
        key,
        label: meta.label,
        tone: meta.tone,
        value: rollup!.projects.filter((p) => p.status === key).length,
      }))
    : [];

  const firstName = user.name.split(" ")[0];

  return (
    <div>
      <PageHeader
        eyebrow={`${levelLabel(user.level)}${department ? ` · ${department.name}` : ""}`}
        title={`${greetingWord(now.getHours())}, ${firstName}`}
        description="Here's where things stand across your work today."
      />

      {/* My work */}
      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Open tasks" value={openTasksCount} icon={ListChecks} href="/tasks" />
        <StatCard
          label="Overdue"
          value={overdueTasksCount}
          icon={AlertTriangle}
          tone={overdueTasksCount > 0 ? "danger" : "neutral"}
          href="/tasks"
        />
        <StatCard
          label="Awaiting my update"
          value={awaitingUpdateCount}
          icon={RefreshCw}
          tone={awaitingUpdateCount > 0 ? "warning" : "neutral"}
          href="/updates"
        />
        <StatCard label="Due this week" value={upcomingDeadlinesCount} icon={CalendarClock} href="/tasks" />
      </section>

      {/* Org rollup */}
      {rollup && (
        <section className="mt-9">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-muted-2">
              Organization
            </h2>
            <Link
              href="/dashboard/delays"
              className="inline-flex items-center gap-1 text-[12.5px] font-medium text-accent hover:text-accent-hover"
            >
              Delays &amp; risk register
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <StatCard
              label="At risk / delayed"
              value={rollup.atRiskCount}
              icon={Flame}
              tone={rollup.atRiskCount > 0 ? "danger" : "neutral"}
              href="/dashboard/delays"
              hint={`of ${rollup.projects.length} project${rollup.projects.length === 1 ? "" : "s"}`}
            />
            <StatCard
              label="Open blockers"
              value={rollup.openBlockersCount}
              icon={ShieldAlert}
              tone={rollup.openBlockersCount > 0 ? "warning" : "neutral"}
              href="/blockers"
            />
            <StatCard label="On leave today" value={rollup.onLeave.length} icon={CalendarOff} href="/leave" />
            <StatCard
              label="KPIs on target"
              value={rollup.kpiTotal ? `${rollup.kpiOnTarget}/${rollup.kpiTotal}` : "—"}
              icon={Target}
              tone={
                rollup.kpiTotal === 0
                  ? "neutral"
                  : rollup.kpiOnTarget === rollup.kpiTotal
                    ? "success"
                    : "warning"
              }
              href="/kpis"
            />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <SectionCard
              title="Projects by status"
              description={`${rollup.projects.length} in your organization`}
              className="lg:col-span-2"
            >
              <StatusBreakdown segments={projectSegments} emptyLabel="No projects in scope yet" />
            </SectionCard>
            <SectionCard title="Blockers by severity">
              <StatusBreakdown segments={rollup.blockerSegments} emptyLabel="No open blockers" />
            </SectionCard>
          </div>

          {rollup.onLeave.length > 0 && (
            <div className="mt-4">
              <SectionCard title="On leave today" action={{ label: "View leave", href: "/leave" }}>
                <div className="flex items-center gap-3">
                  <AvatarStack users={rollup.onLeave} max={8} />
                  <p className="text-[12.5px] text-muted">{rollup.onLeave.map((u) => u.name).join(", ")}</p>
                </div>
              </SectionCard>
            </div>
          )}
        </section>
      )}

      {/* Delegation */}
      <section className="mt-9 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard
          title="Delegated by me"
          description="Tasks you've handed off"
          action={{ label: "All tasks", href: "/tasks" }}
        >
          {delegatedByMe.length === 0 ? (
            <EmptyState icon={GitBranch} title="No delegated tasks" description="Tasks you delegate to others will show up here." />
          ) : (
            <ul className="divide-y divide-border-soft">
              {delegatedByMe.map((t) => {
                const assignee = t.assignments[0]?.user;
                return (
                  <li key={t.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                    {assignee ? (
                      <Avatar name={assignee.name} color={assignee.avatarColor} emoji={assignee.avatarEmoji} size="sm" />
                    ) : (
                      <Avatar name="?" size="sm" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-foreground">{t.title}</p>
                      <p className="truncate text-[12px] text-muted-2">
                        {t.project?.name ?? "No project"}
                        {assignee ? ` · to ${assignee.name}` : ""}
                      </p>
                    </div>
                    <StatusBadge map={TASK_STATUS} value={t.status} />
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title="Delegated to me"
          description="Tasks handed to you"
          action={{ label: "All tasks", href: "/tasks" }}
        >
          {delegatedToMe.length === 0 ? (
            <EmptyState icon={Inbox} title="Nothing delegated to you" description="Tasks someone delegates to you will show up here." />
          ) : (
            <ul className="divide-y divide-border-soft">
              {delegatedToMe.map((t) => (
                <li key={t.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-foreground">{t.title}</p>
                    <p className="truncate text-[12px] text-muted-2">
                      {t.project?.name ?? "No project"}
                      {t.delegatedBy ? ` · from ${t.delegatedBy.name}` : ""}
                      {t.dueDate ? ` · due ${formatDateShort(t.dueDate)}` : ""}
                    </p>
                  </div>
                  <StatusBadge map={TASK_STATUS} value={t.status} />
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </section>

      {/* Recent activity */}
      <section className="mt-9">
        <SectionCard title="Recent activity" description={isManager ? "You and your team" : "Your recent actions"}>
          {activity.length === 0 ? (
            <EmptyState icon={RefreshCw} title="No activity yet" description="Actions across your work will appear here as they happen." />
          ) : (
            <ul className="divide-y divide-border-soft">
              {activity.map((a) => (
                <li key={a.id} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
                  <Avatar name={a.user.name} color={a.user.avatarColor} emoji={a.user.avatarEmoji} size="xs" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] leading-snug text-foreground">
                      <span className="font-medium">{a.user.name}</span>{" "}
                      <span className="text-muted">{humanizeAction(a.action).toLowerCase()}</span>{" "}
                      <span className="text-muted-2">{a.entityType.toLowerCase()}</span>
                    </p>
                    <p className="mt-0.5 text-[11.5px] text-muted-2">{relativeTime(a.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </section>
    </div>
  );
}
