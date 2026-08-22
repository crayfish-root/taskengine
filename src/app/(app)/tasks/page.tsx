import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getAllReportIds } from "@/lib/org";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { TaskRow } from "@/components/tasks/task-row";
import { TaskFilters, TaskViewToggle } from "@/components/tasks/task-filters";
import { NewTaskButton } from "@/components/tasks/new-task-button";
import { LITE_USER_SELECT, isTaskOverdue } from "@/lib/task-utils";
import { ListChecks } from "lucide-react";

const VIEWS = [
  { label: "My Tasks", value: "my" },
  { label: "Delegated by Me", value: "delegated" },
  { label: "Team", value: "team" },
  { label: "All", value: "all" },
];

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{
    view?: string;
    status?: string;
    priority?: string;
    project?: string;
    assignee?: string;
    overdue?: string;
  }>;
}) {
  const [user, sp] = await Promise.all([getCurrentUser(), searchParams]);
  if (!user) return null;

  const view = VIEWS.some((v) => v.value === sp.view) ? sp.view! : "my";

  const conditions: Record<string, unknown>[] = [];
  if (sp.status) conditions.push({ status: sp.status });
  if (sp.priority) conditions.push({ priority: sp.priority });
  if (sp.project) conditions.push({ projectId: sp.project });
  if (sp.assignee) conditions.push({ assignments: { some: { userId: sp.assignee } } });

  if (view === "my") {
    conditions.push({ assignments: { some: { userId: user.id } } });
  } else if (view === "delegated") {
    conditions.push({ delegatedById: user.id });
  } else if (view === "team") {
    const reportIds = await getAllReportIds(user.id);
    conditions.push({ assignments: { some: { userId: { in: reportIds.length ? reportIds : ["__none__"] } } } });
  }
  // "all" — no extra scoping

  const where: Record<string, unknown> = conditions.length ? { AND: conditions } : {};

  const [tasks, projects, people] = await Promise.all([
    prisma.task.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }],
      include: {
        project: { select: { id: true, name: true, code: true } },
        assignments: { include: { user: { select: { id: true, name: true, avatarColor: true, avatarEmoji: true } } } },
      },
      take: 300,
    }),
    prisma.project.findMany({ select: { id: true, name: true, code: true }, orderBy: { name: "asc" } }),
    prisma.user.findMany({ where: { active: true }, select: LITE_USER_SELECT, orderBy: { name: "asc" } }),
  ]);

  const filtered = sp.overdue === "1" ? tasks.filter((t) => isTaskOverdue(t.dueDate, t.status)) : tasks;

  const subtitle =
    view === "my"
      ? "Tasks assigned to you, across every project."
      : view === "delegated"
      ? "Tasks you've handed down the chain — track them through to completion."
      : view === "team"
      ? "Everything assigned to you and everyone who reports to you, directly or indirectly."
      : "Every task across the organization.";

  return (
    <div>
      <PageHeader eyebrow="Work" title="Tasks" description={subtitle} actions={<NewTaskButton people={people} />} />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <TaskViewToggle options={VIEWS} />
        <TaskFilters projects={projects} assignees={people} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={ListChecks} title="No tasks match" description="Nothing here yet — try a different view or clear a filter." />
      ) : (
        <Card>
          <CardContent className="p-4">
            {filtered.map((t) => (
              <TaskRow key={t.id} task={t} showProject />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
