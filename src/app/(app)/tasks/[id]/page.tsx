import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { QuickStatus } from "@/components/tasks/quick-status";
import { AssigneesPanel } from "@/components/tasks/assignees-panel";
import { DelegationChain, DelegationHop } from "@/components/tasks/delegation-chain";
import { SubtasksSection } from "@/components/tasks/subtasks-section";
import { CommentsSection } from "@/components/tasks/comments-section";
import { DocumentsSection } from "@/components/tasks/documents-section";
import { StatusHistory } from "@/components/tasks/status-history";
import { EditTaskInline } from "@/components/tasks/edit-task-inline";
import { AddBlockerButton } from "@/components/blockers/add-blocker-button";
import { PRIORITY, TASK_STATUS } from "@/lib/status";
import { formatDate, cn } from "@/lib/utils";
import { isTaskOverdue, LITE_USER_SELECT } from "@/lib/task-utils";
import { ChevronRight } from "lucide-react";

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, user] = await Promise.all([params, getCurrentUser()]);
  if (!user) return null;

  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      project: { select: { id: true, name: true, code: true } },
      parentTask: { select: { id: true, title: true } },
      createdBy: { select: { id: true, name: true, avatarColor: true, avatarEmoji: true, level: true, title: true } },
      delegatedBy: { select: { id: true, name: true, avatarColor: true, avatarEmoji: true, level: true, title: true } },
      assignments: {
        orderBy: { assignedAt: "asc" },
        include: { user: { select: { id: true, name: true, avatarColor: true, avatarEmoji: true, title: true } } },
      },
      subtasks: {
        orderBy: { createdAt: "asc" },
        include: { assignments: { include: { user: { select: { id: true, name: true, avatarColor: true, avatarEmoji: true } } } } },
      },
      comments: { orderBy: { createdAt: "asc" }, include: { author: { select: { id: true, name: true, avatarColor: true, avatarEmoji: true } } } },
      documents: {
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, mimeType: true, size: true, createdAt: true, uploadedBy: { select: { name: true } } },
      },
      statusHistory: { orderBy: { createdAt: "desc" }, include: { by: { select: { name: true, avatarColor: true, avatarEmoji: true } } } },
      blockers: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!task) notFound();

  const [people, delegationLogs] = await Promise.all([
    prisma.user.findMany({ where: { active: true }, select: LITE_USER_SELECT, orderBy: { name: "asc" } }),
    prisma.activityLog.findMany({
      where: { entityType: "Task", entityId: id, action: "DELEGATE" },
      include: { user: { select: { id: true, name: true, avatarColor: true, avatarEmoji: true, level: true, title: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const teams = await prisma.team.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });

  const overdue = isTaskOverdue(task.dueDate, task.status);
  const canManage = true; // any authenticated user can act; server routes still enforce canActOnTask

  const hops: DelegationHop[] = delegationLogs.map((log) => {
    const meta = log.meta ? JSON.parse(log.meta) : {};
    return {
      by: log.user,
      to: {
        id: meta.toUserId,
        name: meta.toName,
        avatarColor: meta.toAvatarColor ?? "#6366f1",
        avatarEmoji: meta.toAvatarEmoji ?? null,
        level: meta.toLevel,
        title: meta.toTitle,
      },
      createdAt: log.createdAt,
      note: meta.note,
    };
  });

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-1.5 text-[12.5px] text-muted-2">
        {task.project ? (
          <Link href={`/projects/${task.project.id}`} className="hover:text-foreground transition-colors">
            {task.project.code} · {task.project.name}
          </Link>
        ) : (
          <span>Unlinked task</span>
        )}
        {task.parentTask && (
          <>
            <ChevronRight className="h-3 w-3" />
            <Link href={`/tasks/${task.parentTask.id}`} className="hover:text-foreground transition-colors">
              {task.parentTask.title}
            </Link>
          </>
        )}
      </div>

      <PageHeader
        title={task.title}
        actions={
          <div className="flex items-center gap-2">
            <QuickStatus taskId={task.id} status={task.status} />
            <AddBlockerButton taskId={task.id} projectId={task.projectId} ownerOptions={people} />
          </div>
        }
      />

      <Card className="mb-6">
        <CardContent className="p-5">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-2">Delegation chain</p>
          <DelegationChain creator={task.createdBy} hops={hops} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-6 min-w-0">
          <Card>
            <CardContent className="p-5">
              <EditTaskInline
                taskId={task.id}
                initialTitle={task.title}
                initialDescription={task.description}
                initialPriority={task.priority}
                initialStartDate={task.startDate ? task.startDate.toISOString() : null}
                initialDueDate={task.dueDate ? task.dueDate.toISOString() : null}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Subtasks ({task.subtasks.length})</CardTitle>
            </CardHeader>
            <CardContent className="pt-3">
              <SubtasksSection parentTaskId={task.id} projectId={task.projectId} subtasks={task.subtasks} people={people} />
            </CardContent>
          </Card>

          {task.blockers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Blockers on this task</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-3">
                {task.blockers.map((b) => (
                  <div key={b.id} className="flex items-center gap-2 rounded-[10px] border border-border-soft px-3 py-2">
                    <Badge tone="danger">{b.severity}</Badge>
                    <span className="text-[13px]">{b.title}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Comments</CardTitle>
            </CardHeader>
            <CardContent className="pt-3">
              <CommentsSection taskId={task.id} comments={task.comments} currentUser={user} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
            </CardHeader>
            <CardContent className="pt-3">
              <DocumentsSection taskId={task.id} documents={task.documents} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-3 text-[13px]">
              <Row label="Status">
                <StatusBadge map={TASK_STATUS} value={task.status} />
              </Row>
              <Row label="Priority">
                <Badge tone={PRIORITY[task.priority]?.tone ?? "neutral"}>{PRIORITY[task.priority]?.label}</Badge>
              </Row>
              <Row label="Due date">
                <span className={cn(overdue && "font-semibold text-danger")}>{formatDate(task.dueDate)}{overdue ? " · overdue" : ""}</span>
              </Row>
              <Row label="Start date">{formatDate(task.startDate)}</Row>
              <Row label="Created by">{task.createdBy.name}</Row>
              {task.delegatedBy && <Row label="Delegated by">{task.delegatedBy.name}</Row>}
              <Row label="Delegation depth">{task.delegationDepth}</Row>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Assignees</CardTitle>
            </CardHeader>
            <CardContent className="pt-3">
              <AssigneesPanel taskId={task.id} assignments={task.assignments} people={people} teams={teams} canManage={canManage} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Status history</CardTitle>
            </CardHeader>
            <CardContent className="pt-3">
              <StatusHistory events={task.statusHistory} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted">{label}</span>
      <span className="font-medium text-right">{children}</span>
    </div>
  );
}
