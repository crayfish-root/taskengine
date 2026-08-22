import Link from "next/link";
import { AlertTriangle, Flame, ShieldAlert, FolderKanban, ListChecks } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { formatDate, daysUntil } from "@/lib/utils";
import { PROJECT_STATUS, BLOCKER_SEVERITY } from "@/lib/status";

import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/dashboard/stat-card";

type Row = {
  id: string;
  kind: "project" | "task" | "blocker";
  title: string;
  subtitle: string;
  badgeLabel: string;
  badgeTone: "neutral" | "accent" | "success" | "warning" | "danger" | "info";
  age: string;
  href: string;
  score: number;
};

const SEVERITY_WEIGHT: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
const PRIORITY_WEIGHT: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };

export default async function DelaysPage() {
  const now = new Date();

  const [atRiskProjects, overdueTasks, criticalBlockers] = await Promise.all([
    prisma.project.findMany({
      where: { status: { in: ["AT_RISK", "DELAYED"] } },
      select: {
        id: true,
        name: true,
        code: true,
        status: true,
        priority: true,
        targetDate: true,
        owner: { select: { id: true, name: true } },
      },
    }),
    prisma.task.findMany({
      where: { status: { notIn: ["DONE", "CANCELLED"] }, dueDate: { lt: now } },
      select: {
        id: true,
        title: true,
        priority: true,
        dueDate: true,
        project: { select: { id: true, name: true } },
        assignments: {
          where: { isPrimary: true },
          take: 1,
          select: { user: { select: { id: true, name: true } } },
        },
      },
    }),
    prisma.blocker.findMany({
      where: { status: { not: "RESOLVED" }, severity: { in: ["HIGH", "CRITICAL"] } },
      select: {
        id: true,
        title: true,
        severity: true,
        createdAt: true,
        project: { select: { id: true, name: true } },
        task: { select: { id: true, title: true } },
        raisedBy: { select: { id: true, name: true } },
        owner: { select: { id: true, name: true } },
      },
    }),
  ]);

  const rows: Row[] = [];

  for (const p of atRiskProjects) {
    const overdueDays = p.targetDate ? Math.max(0, -(daysUntil(p.targetDate) ?? 0)) : 0;
    rows.push({
      id: `project-${p.id}`,
      kind: "project",
      title: p.name,
      subtitle: `${p.code} · owned by ${p.owner.name}${p.targetDate ? ` · target ${formatDate(p.targetDate)}` : ""}`,
      badgeLabel: PROJECT_STATUS[p.status]?.label ?? p.status,
      badgeTone: PROJECT_STATUS[p.status]?.tone ?? "neutral",
      age: overdueDays > 0 ? `${overdueDays}d past target` : "at risk",
      href: `/dashboard/project/${p.id}`,
      score: 700 + (p.status === "DELAYED" ? 150 : 0) + (PRIORITY_WEIGHT[p.priority] ?? 0) * 10 + overdueDays,
    });
  }

  for (const t of overdueTasks) {
    const overdueDays = Math.max(0, -(daysUntil(t.dueDate) ?? 0));
    const assignee = t.assignments[0]?.user;
    rows.push({
      id: `task-${t.id}`,
      kind: "task",
      title: t.title,
      subtitle: `${t.project?.name ?? "No project"}${assignee ? ` · assigned to ${assignee.name}` : ""} · was due ${formatDate(t.dueDate)}`,
      badgeLabel: "Overdue",
      badgeTone: "danger",
      age: `${overdueDays}d overdue`,
      href: "/tasks",
      score: 500 + (PRIORITY_WEIGHT[t.priority] ?? 0) * 20 + overdueDays,
    });
  }

  for (const b of criticalBlockers) {
    const ageDays = Math.max(0, Math.floor((now.getTime() - b.createdAt.getTime()) / (1000 * 60 * 60 * 24)));
    rows.push({
      id: `blocker-${b.id}`,
      kind: "blocker",
      title: b.title,
      subtitle: `${b.project?.name ?? b.task?.title ?? "Unscoped"} · raised by ${b.raisedBy.name}${b.owner ? ` · owner ${b.owner.name}` : ""}`,
      badgeLabel: BLOCKER_SEVERITY[b.severity]?.label ?? b.severity,
      badgeTone: BLOCKER_SEVERITY[b.severity]?.tone ?? "neutral",
      age: `${ageDays}d open`,
      href: "/blockers",
      score: 600 + (SEVERITY_WEIGHT[b.severity] ?? 0) * 25 + ageDays,
    });
  }

  rows.sort((a, b) => b.score - a.score);

  const kindMeta: Record<Row["kind"], { icon: typeof Flame; label: string }> = {
    project: { icon: FolderKanban, label: "Project" },
    task: { icon: ListChecks, label: "Task" },
    blocker: { icon: ShieldAlert, label: "Blocker" },
  };

  return (
    <div>
      <PageHeader
        eyebrow="Organization-wide"
        title="Delays &amp; risk"
        description="Every at-risk or delayed project, overdue task, and high-severity blocker across the company, prioritized by severity and age."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="At risk / delayed projects" value={atRiskProjects.length} icon={Flame} tone={atRiskProjects.length > 0 ? "danger" : "neutral"} />
        <StatCard label="Overdue tasks" value={overdueTasks.length} icon={AlertTriangle} tone={overdueTasks.length > 0 ? "warning" : "neutral"} />
        <StatCard label="High-severity blockers" value={criticalBlockers.length} icon={ShieldAlert} tone={criticalBlockers.length > 0 ? "danger" : "neutral"} />
      </div>

      <div className="mt-6">
        {rows.length === 0 ? (
          <EmptyState
            icon={Flame}
            title="Nothing at risk right now"
            description="No delayed projects, overdue tasks, or high-severity blockers across the organization."
          />
        ) : (
          <Card className="overflow-hidden">
            <ul className="divide-y divide-border-soft">
              {rows.map((r) => {
                const Icon = kindMeta[r.kind].icon;
                return (
                  <li key={r.id}>
                    <Link
                      href={r.href}
                      className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/[0.04] dark:bg-white/[0.06]">
                        <Icon className="h-4 w-4 text-muted" strokeWidth={1.75} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-medium uppercase tracking-[0.04em] text-muted-2">
                            {kindMeta[r.kind].label}
                          </span>
                        </div>
                        <p className="truncate text-[13.5px] font-medium text-foreground">{r.title}</p>
                        <p className="truncate text-[12px] text-muted-2">{r.subtitle}</p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <Badge tone={r.badgeTone}>{r.badgeLabel}</Badge>
                        <span className="text-[11.5px] text-muted-2">{r.age}</span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}
