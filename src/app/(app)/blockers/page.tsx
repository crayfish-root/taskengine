import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { BlockerRow } from "@/components/blockers/blocker-row";
import { OverdueRow, OverdueTaskData, OverdueProjectData } from "@/components/blockers/overdue-row";
import { BlockerFilters } from "@/components/blockers/blocker-filters";
import { AddBlockerButton } from "@/components/blockers/add-blocker-button";
import { LITE_USER_SELECT } from "@/lib/task-utils";
import { ShieldAlert } from "lucide-react";

export default async function BlockersPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; severity?: string; status?: string; project?: string; owner?: string }>;
}) {
  const sp = await searchParams;
  const view = sp.view ?? "all";

  const blockerWhere: Record<string, unknown> = {};
  if (sp.severity) blockerWhere.severity = sp.severity;
  if (sp.status) blockerWhere.status = sp.status;
  if (sp.project) blockerWhere.projectId = sp.project;
  if (sp.owner) blockerWhere.OR = [{ ownerId: sp.owner }, { raisedById: sp.owner }];

  const [blockers, overdueTasksRaw, overdueProjectsRaw, projects, people] = await Promise.all([
    view === "overdue"
      ? Promise.resolve([])
      : prisma.blocker.findMany({
          where: blockerWhere,
          orderBy: { createdAt: "asc" },
          include: {
            task: { select: { id: true, title: true } },
            project: { select: { id: true, name: true, code: true } },
            raisedBy: { select: { name: true, avatarColor: true, avatarEmoji: true } },
            owner: { select: { id: true, name: true, avatarColor: true, avatarEmoji: true } },
          },
        }),
    view === "blockers"
      ? Promise.resolve([])
      : prisma.task.findMany({
          where: {
            dueDate: { lt: new Date() },
            status: { notIn: ["DONE", "CANCELLED"] },
            ...(sp.project && { projectId: sp.project }),
            ...(sp.owner && { assignments: { some: { userId: sp.owner } } }),
          },
          orderBy: { dueDate: "asc" },
          include: {
            project: { select: { id: true, name: true, code: true } },
            assignments: { include: { user: { select: { id: true, name: true, avatarColor: true, avatarEmoji: true } } } },
          },
        }),
    view === "blockers"
      ? Promise.resolve([])
      : prisma.project.findMany({
          where: {
            targetDate: { lt: new Date() },
            status: { notIn: ["COMPLETED", "CANCELLED"] },
            ...(sp.project && { id: sp.project }),
            ...(sp.owner && { ownerId: sp.owner }),
          },
          orderBy: { targetDate: "asc" },
          include: { owner: { select: { id: true, name: true, avatarColor: true, avatarEmoji: true } } },
        }),
    prisma.project.findMany({ select: { id: true, name: true, code: true }, orderBy: { name: "asc" } }),
    prisma.user.findMany({ where: { active: true }, select: LITE_USER_SELECT, orderBy: { name: "asc" } }),
  ]);

  // eslint-disable-next-line react-hooks/purity -- server component, computed once per request
  const now = Date.now();
  const overdueTasks: OverdueTaskData[] = overdueTasksRaw.map((t) => ({
    kind: "task",
    id: t.id,
    title: t.title,
    dueDate: t.dueDate!,
    daysLate: Math.floor((now - t.dueDate!.getTime()) / 86400000),
    project: t.project,
    assignments: t.assignments,
  }));
  const overdueProjects: OverdueProjectData[] = overdueProjectsRaw.map((p) => ({
    kind: "project",
    id: p.id,
    title: p.name,
    dueDate: p.targetDate!,
    daysLate: Math.floor((now - p.targetDate!.getTime()) / 86400000),
    owner: p.owner,
  }));
  const overdueItems = [...overdueTasks, ...overdueProjects].sort((a, b) => b.daysLate - a.daysLate);

  const openBlockerCount = blockers.filter((b) => b.status !== "RESOLVED").length;
  const totalDelays = openBlockerCount + overdueItems.length;

  return (
    <div>
      <PageHeader
        eyebrow="Work"
        title="Blockers & Delays"
        description="Everything currently at risk across the organization — reported blockers and items simply running late."
        actions={<AddBlockerButton ownerOptions={people} projectOptions={projects} />}
      />

      <div className="mb-6 grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.05em] text-muted-2">Open blockers</p>
            <p className="mt-1 text-[22px] font-semibold tracking-[-0.01em]">{openBlockerCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.05em] text-muted-2">Overdue items</p>
            <p className="mt-1 text-[22px] font-semibold tracking-[-0.01em] text-danger">{overdueItems.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.05em] text-muted-2">Total at risk</p>
            <p className="mt-1 text-[22px] font-semibold tracking-[-0.01em]">{totalDelays}</p>
          </CardContent>
        </Card>
      </div>

      <div className="mb-5">
        <BlockerFilters projects={projects} owners={people} />
      </div>

      {blockers.length === 0 && overdueItems.length === 0 ? (
        <EmptyState icon={ShieldAlert} title="Nothing at risk" description="No open blockers and nothing overdue — for now." />
      ) : (
        <div className="space-y-6">
          {blockers.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <p className="mb-1 text-[12px] font-semibold text-muted">Reported blockers</p>
                {blockers.map((b) => (
                  <BlockerRow key={b.id} blocker={b} />
                ))}
              </CardContent>
            </Card>
          )}
          {overdueItems.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <p className="mb-1 text-[12px] font-semibold text-muted">Overdue — past due date, not explicitly logged as a blocker</p>
                {overdueItems.map((item) => (
                  <OverdueRow key={`${item.kind}-${item.id}`} item={item} />
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
