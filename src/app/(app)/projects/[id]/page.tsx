import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { ELEVATED_LEVELS } from "@/lib/org";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar } from "@/components/ui/avatar";
import { TabLinks } from "@/components/ui/tabs";
import { TaskBoardView } from "@/components/tasks/task-board-view";
import { EditProjectModal } from "@/components/projects/edit-project-modal";
import { ProjectTeamPanel } from "@/components/projects/project-team-panel";
import { ProjectActivityFeed, ActivityItem } from "@/components/projects/project-activity-feed";
import { BlockerRow } from "@/components/blockers/blocker-row";
import { AddBlockerButton } from "@/components/blockers/add-blocker-button";
import { EmptyState } from "@/components/ui/empty-state";
import { PROJECT_STATUS, PRIORITY } from "@/lib/status";
import { formatDate, cn } from "@/lib/utils";
import { computeProgress, isProjectOverdue, LITE_USER_SELECT } from "@/lib/task-utils";
import { ShieldAlert, LayoutDashboard } from "lucide-react";

const TABS = [
  { key: "tasks", label: "Tasks" },
  { key: "blockers", label: "Blockers" },
  { key: "team", label: "Team" },
  { key: "activity", label: "Activity" },
];

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ id }, sp, currentUser] = await Promise.all([params, searchParams, getCurrentUser()]);
  if (!currentUser) return null;
  const tab = TABS.some((t) => t.key === sp.tab) ? sp.tab! : "tasks";

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      department: true,
      owner: { select: { id: true, name: true, avatarColor: true, avatarEmoji: true, title: true } },
      members: { include: { user: { select: { id: true, name: true, title: true, level: true, avatarColor: true, avatarEmoji: true } } } },
      teams: { include: { team: { include: { members: { include: { user: { select: { id: true, name: true, avatarColor: true, avatarEmoji: true } } } } } } } },
      tasks: {
        orderBy: { createdAt: "desc" },
        include: {
          assignments: { include: { user: { select: { id: true, name: true, avatarColor: true, avatarEmoji: true } } } },
        },
      },
      blockers: {
        orderBy: { createdAt: "desc" },
        include: {
          task: { select: { id: true, title: true } },
          raisedBy: { select: { name: true, avatarColor: true, avatarEmoji: true } },
          owner: { select: { id: true, name: true, avatarColor: true, avatarEmoji: true } },
        },
      },
    },
  });

  if (!project) notFound();

  const canManageTasks =
    ELEVATED_LEVELS.has(currentUser.level) ||
    project.ownerId === currentUser.id ||
    project.members.some((m) => m.userId === currentUser.id);

  const [people, allTeams, departments] = await Promise.all([
    prisma.user.findMany({ where: { active: true }, select: LITE_USER_SELECT, orderBy: { name: "asc" } }),
    prisma.team.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.department.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const topLevelTasks = project.tasks.filter((t) => !t.parentTaskId);
  const { done, total, pct } = computeProgress(project.tasks);
  const overdue = isProjectOverdue(project.targetDate, project.status);

  let activityItems: ActivityItem[] = [];
  if (tab === "activity") {
    const taskIds = project.tasks.map((t) => t.id);
    const [statusEvents, delegations, blockerEvents] = await Promise.all([
      prisma.taskStatusEvent.findMany({
        where: { taskId: { in: taskIds } },
        include: { by: { select: { name: true, avatarColor: true, avatarEmoji: true } }, task: { select: { title: true } } },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      prisma.activityLog.findMany({
        where: { entityType: "Task", entityId: { in: taskIds }, action: "DELEGATE" },
        include: { user: { select: { name: true, avatarColor: true, avatarEmoji: true } } },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      prisma.blocker.findMany({
        where: { projectId: id },
        include: { raisedBy: { select: { name: true, avatarColor: true, avatarEmoji: true } } },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
    ]);
    const taskTitleById = new Map(project.tasks.map((t) => [t.id, t.title]));
    activityItems = [
      ...statusEvents.map((e) => ({
        kind: "status" as const,
        id: e.id,
        at: e.createdAt,
        by: e.by,
        taskTitle: e.task.title,
        toStatus: e.toStatus,
      })),
      ...delegations.map((d) => {
        const meta = d.meta ? JSON.parse(d.meta) : {};
        return {
          kind: "delegation" as const,
          id: d.id,
          at: d.createdAt,
          by: d.user,
          taskTitle: taskTitleById.get(d.entityId) ?? "a task",
          toName: meta.toName ?? "someone",
        };
      }),
      ...blockerEvents.map((b) => ({
        kind: "blocker" as const,
        id: b.id,
        at: b.createdAt,
        by: b.raisedBy,
        title: b.title,
        severity: b.severity,
      })),
    ].sort((a, b) => b.at.getTime() - a.at.getTime());
  }

  const taskOptions = project.tasks.map((t) => ({ id: t.id, title: t.title }));

  return (
    <div>
      <div className="mb-1 flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: project.color }} />
        <p className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-muted-2">{project.code}</p>
        {project.department && (
          <>
            <span className="text-muted-2">·</span>
            <p className="text-[11.5px] text-muted-2">{project.department.name}</p>
          </>
        )}
      </div>

      <PageHeader
        title={project.name}
        description={project.description ?? undefined}
        actions={
          <div className="flex items-center gap-2">
            <Link href={`/dashboard/project/${project.id}`}>
              <Button variant="secondary" size="sm">
                <LayoutDashboard className="h-3.5 w-3.5" /> View dashboard
              </Button>
            </Link>
            <EditProjectModal
              project={{
                id: project.id,
                name: project.name,
                description: project.description,
                status: project.status,
                priority: project.priority,
                departmentId: project.departmentId,
                ownerId: project.ownerId,
                startDate: project.startDate ? project.startDate.toISOString() : null,
                targetDate: project.targetDate ? project.targetDate.toISOString() : null,
              }}
              people={people}
              departments={departments}
            />
          </div>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.05em] text-muted-2">Status</p>
            <div className="mt-1.5">
              <StatusBadge map={PROJECT_STATUS} value={project.status} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.05em] text-muted-2">Priority</p>
            <div className="mt-1.5">
              <Badge tone={PRIORITY[project.priority]?.tone ?? "neutral"}>{PRIORITY[project.priority]?.label}</Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.05em] text-muted-2">Owner</p>
            <div className="mt-1.5 flex items-center gap-2">
              <Avatar name={project.owner.name} color={project.owner.avatarColor} emoji={project.owner.avatarEmoji} size="xs" />
              <span className="text-[13px] font-medium">{project.owner.name}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.05em] text-muted-2">Target date</p>
            <p className={cn("mt-1.5 text-[13px] font-medium", overdue && "text-danger")}>
              {formatDate(project.targetDate)}
              {overdue && " · overdue"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-[12.5px] text-muted mb-2">
            <span>{done} of {total} tasks complete</span>
            <span className="font-medium text-foreground">{pct}%</span>
          </div>
          <Progress value={pct} />
        </CardContent>
      </Card>

      <div className="mb-6">
        <TabLinks tabs={TABS.map((t) => ({ label: t.label, key: t.key, href: `/projects/${id}?tab=${t.key}` }))} active={tab} />
      </div>

      {tab === "tasks" && <TaskBoardView tasks={topLevelTasks} projectId={project.id} people={people} canAddTask={canManageTasks} />}

      {tab === "blockers" && (
        <div>
          <div className="mb-4 flex justify-end">
            <AddBlockerButton projectId={project.id} taskOptions={taskOptions} ownerOptions={people} />
          </div>
          {project.blockers.length === 0 ? (
            <EmptyState icon={ShieldAlert} title="No blockers logged" description="Nothing is currently reported as blocking this project." />
          ) : (
            <Card>
              <CardContent className="p-4">
                {project.blockers.map((b) => (
                  <BlockerRow
                    key={b.id}
                    blocker={{
                      ...b,
                      project: { id: project.id, name: project.name, code: project.code },
                    }}
                  />
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {tab === "team" && (
        <ProjectTeamPanel
          projectId={project.id}
          members={project.members}
          teams={project.teams}
          people={people}
          allTeams={allTeams}
          ownerId={project.ownerId}
        />
      )}

      {tab === "activity" && (
        <Card>
          <CardContent className="p-5">
            <ProjectActivityFeed items={activityItems} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
