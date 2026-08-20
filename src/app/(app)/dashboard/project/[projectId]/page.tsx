import { notFound } from "next/navigation";
import { format } from "date-fns";
import { GitBranch, ShieldAlert, Target, CalendarClock } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { formatDate, formatDateShort, daysUntil } from "@/lib/utils";
import { PROJECT_STATUS, TASK_STATUS, BLOCKER_SEVERITY, BLOCKER_STATUS, PRIORITY } from "@/lib/status";
import { isKpiOnTarget } from "../../_lib/kpi-health";

import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import { ButtonLink } from "@/components/ui/button";
import { StatCard } from "@/components/dashboard/stat-card";
import { SectionCard } from "@/components/dashboard/section-card";
import { TrendChart, type TrendPoint } from "@/components/dashboard/trend-chart";

export default async function ProjectDashboardPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      name: true,
      code: true,
      status: true,
      priority: true,
      targetDate: true,
      startDate: true,
      owner: { select: { id: true, name: true } },
      department: { select: { id: true, name: true } },
    },
  });

  if (!project) notFound();

  const [tasks, statusEvents, blockers, kpis] = await Promise.all([
    prisma.task.findMany({
      where: { projectId },
      select: { id: true, title: true, status: true, dueDate: true, priority: true, delegationDepth: true, createdAt: true },
    }),
    prisma.taskStatusEvent.findMany({
      where: { task: { projectId }, toStatus: "DONE" },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.blocker.findMany({
      where: { projectId },
      select: {
        id: true,
        title: true,
        severity: true,
        status: true,
        createdAt: true,
        resolvedAt: true,
        raisedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.kpi.findMany({
      where: { projectId },
      select: {
        id: true,
        name: true,
        unit: true,
        target: true,
        direction: true,
        records: { orderBy: { periodEnd: "desc" }, take: 1, select: { value: true, periodEnd: true } },
      },
    }),
  ]);

  const relevantTasks = tasks.filter((t) => t.status !== "CANCELLED");
  const doneCount = relevantTasks.filter((t) => t.status === "DONE").length;
  const totalCount = relevantTasks.length;
  const progressPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  const upcomingDeadlines = tasks
    .filter((t) => t.status !== "DONE" && t.status !== "CANCELLED" && t.dueDate && t.dueDate >= new Date())
    .sort((a, b) => (a.dueDate!.getTime() - b.dueDate!.getTime()))
    .slice(0, 8);

  const openBlockers = blockers.filter((b) => b.status !== "RESOLVED");

  const depthCounts = new Map<number, number>();
  for (const t of tasks) {
    depthCounts.set(t.delegationDepth, (depthCounts.get(t.delegationDepth) ?? 0) + 1);
  }
  const maxDepth = depthCounts.size ? Math.max(...depthCounts.keys()) : 0;
  const depthDistribution = Array.from({ length: maxDepth + 1 }, (_, depth) => ({
    depth,
    count: depthCounts.get(depth) ?? 0,
  }));
  const maxDepthCount = Math.max(1, ...depthDistribution.map((d) => d.count));

  // Burn-up trend from real status-change history, when it exists.
  let trendData: TrendPoint[] = [];
  if (statusEvents.length > 0) {
    const dayKey = (d: Date) => format(d, "MMM d");
    const cumulative = new Map<string, number>();
    let running = 0;
    for (const e of statusEvents) {
      running++;
      cumulative.set(dayKey(e.createdAt), running);
    }
    trendData = Array.from(cumulative.entries()).map(([date, done]) => ({ date, done, total: totalCount }));
  }

  return (
    <div>
      <PageHeader
        eyebrow={`${project.code}${project.department ? ` · ${project.department.name}` : ""} · Insights`}
        title={project.name}
        description={`Owned by ${project.owner.name}${project.targetDate ? ` · target ${formatDate(project.targetDate)}` : ""}`}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge map={PROJECT_STATUS} value={project.status} />
            <Badge tone={PRIORITY[project.priority]?.tone ?? "neutral"}>{PRIORITY[project.priority]?.label}</Badge>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Tasks done" value={`${doneCount}/${totalCount}`} icon={GitBranch} hint={`${progressPct}% complete`} />
        <StatCard
          label="Open blockers"
          value={openBlockers.length}
          icon={ShieldAlert}
          tone={openBlockers.length > 0 ? "warning" : "neutral"}
        />
        <StatCard
          label="KPIs on target"
          value={kpis.length ? `${kpis.filter((k) => k.records[0] && isKpiOnTarget(k.records[0].value, k.target, k.direction)).length}/${kpis.length}` : "—"}
          icon={Target}
        />
        <StatCard label="Upcoming deadlines" value={upcomingDeadlines.length} icon={CalendarClock} />
      </div>

      <div className="mt-4">
        <SectionCard title="Progress" description="Tasks completed vs. total scope">
          <div className="mb-5">
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-[13px] text-muted">{progressPct}% complete</span>
              <span className="text-[12.5px] text-muted-2">
                {doneCount} of {totalCount} tasks
              </span>
            </div>
            <Progress value={progressPct} />
          </div>
          {trendData.length > 1 ? (
            <TrendChart data={trendData} />
          ) : (
            <p className="text-[12.5px] text-muted-2">
              Not enough status history yet to chart a trend — showing the current snapshot above instead.
            </p>
          )}
        </SectionCard>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Blocker history" description={`${blockers.length} raised, ${openBlockers.length} open`}>
          {blockers.length === 0 ? (
            <EmptyState icon={ShieldAlert} title="No blockers raised" description="This project has had a clean run so far." />
          ) : (
            <ul className="divide-y divide-border-soft">
              {blockers.slice(0, 8).map((b) => (
                <li key={b.id} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-foreground">{b.title}</p>
                    <p className="truncate text-[12px] text-muted-2">
                      Raised by {b.raisedBy.name} · {formatDateShort(b.createdAt)}
                      {b.resolvedAt ? ` · resolved ${formatDateShort(b.resolvedAt)}` : ""}
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

        <SectionCard title="Delegation depth" description="How many hand-offs tasks have gone through">
          {tasks.length === 0 ? (
            <p className="text-[12.5px] text-muted-2">No tasks in this project yet.</p>
          ) : (
            <div className="space-y-2.5">
              {depthDistribution.map((d) => (
                <div key={d.depth} className="flex items-center gap-3">
                  <span className="w-16 shrink-0 text-[12px] text-muted">{d.depth === 0 ? "Original" : `Depth ${d.depth}`}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-black/[0.05] dark:bg-white/[0.08]">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${(d.count / maxDepthCount) * 100}%` }}
                    />
                  </div>
                  <span className="w-6 shrink-0 text-right text-[12px] tabular-nums text-muted-2">{d.count}</span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="KPIs" description="Scoped to this project" action={{ label: "All KPIs", href: "/kpis" }}>
          {kpis.length === 0 ? (
            <EmptyState icon={Target} title="No KPIs tracked" description="KPIs scoped to this project will appear here." />
          ) : (
            <ul className="divide-y divide-border-soft">
              {kpis.map((k) => {
                const latest = k.records[0];
                const onTarget = latest ? isKpiOnTarget(latest.value, k.target, k.direction) : null;
                return (
                  <li key={k.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-foreground">{k.name}</p>
                      <p className="text-[12px] text-muted-2">
                        {latest ? `${latest.value}${k.unit} vs target ${k.target}${k.unit}` : "No readings yet"}
                      </p>
                    </div>
                    {onTarget !== null && (
                      <Badge tone={onTarget ? "success" : "danger"}>{onTarget ? "On target" : "Off target"}</Badge>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Upcoming deadlines">
          {upcomingDeadlines.length === 0 ? (
            <EmptyState icon={CalendarClock} title="Nothing due soon" description="No open tasks have an upcoming due date." />
          ) : (
            <ul className="divide-y divide-border-soft">
              {upcomingDeadlines.map((t) => {
                const days = daysUntil(t.dueDate);
                return (
                  <li key={t.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-foreground">{t.title}</p>
                      <p className="text-[12px] text-muted-2">
                        Due {formatDateShort(t.dueDate)} {days !== null && `(${days === 0 ? "today" : `${days}d`})`}
                      </p>
                    </div>
                    <StatusBadge map={TASK_STATUS} value={t.status} />
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>
      </div>

      <div className="mt-6">
        <ButtonLink href={`/projects/${project.id}`} variant="ghost" size="sm">
          Open operational view →
        </ButtonLink>
      </div>
    </div>
  );
}
