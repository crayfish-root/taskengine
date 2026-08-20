import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarStack } from "@/components/ui/avatar";
import { PROJECT_STATUS, PRIORITY } from "@/lib/status";
import { formatDateShort, cn } from "@/lib/utils";
import { isProjectOverdue } from "@/lib/task-utils";

export interface ProjectCardData {
  id: string;
  name: string;
  code: string;
  status: string;
  priority: string;
  targetDate: Date | string | null;
  color: string;
  department: { name: string } | null;
  owner: { id: string; name: string; avatarColor: string; avatarEmoji: string | null };
  members: { user: { id: string; name: string; avatarColor: string; avatarEmoji: string | null } }[];
  tasks: { status: string }[];
}

export function ProjectCard({ project }: { project: ProjectCardData }) {
  const total = project.tasks.length;
  const done = project.tasks.filter((t) => t.status === "DONE").length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  const overdue = isProjectOverdue(project.targetDate, project.status);

  return (
    <Link href={`/projects/${project.id}`}>
      <Card className="h-full transition-all hover:shadow-[var(--shadow-sm)] hover:-translate-y-[1px]">
        <CardContent className="flex h-full flex-col gap-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: project.color }}
                />
                <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-2">{project.code}</p>
              </div>
              <h3 className="mt-1 truncate text-[15px] font-semibold tracking-[-0.01em]">{project.name}</h3>
              {project.department && <p className="mt-0.5 text-[12px] text-muted">{project.department.name}</p>}
            </div>
            <StatusBadge map={PROJECT_STATUS} value={project.status} />
          </div>

          <div>
            <div className="flex items-center justify-between text-[11.5px] text-muted mb-1.5">
              <span>{done}/{total} tasks</span>
              <span>{pct}%</span>
            </div>
            <Progress value={pct} />
          </div>

          <div className="mt-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Avatar name={project.owner.name} color={project.owner.avatarColor} emoji={project.owner.avatarEmoji} size="xs" />
              {project.members.length > 0 && (
                <AvatarStack users={project.members.map((m) => m.user)} max={3} size="xs" />
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <Badge tone={PRIORITY[project.priority]?.tone ?? "neutral"}>{PRIORITY[project.priority]?.label}</Badge>
              {project.targetDate && (
                <span className={cn("text-[11.5px]", overdue ? "font-semibold text-danger" : "text-muted")}>
                  {overdue ? "Overdue " : "Due "}
                  {formatDateShort(project.targetDate)}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
