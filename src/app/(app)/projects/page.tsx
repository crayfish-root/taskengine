import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ProjectCard } from "@/components/projects/project-card";
import { ProjectFilters } from "@/components/projects/project-filters";
import { NewProjectButton } from "@/components/projects/new-project-button";
import { LITE_USER_SELECT } from "@/lib/task-utils";
import { FolderKanban } from "lucide-react";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; priority?: string; department?: string; owner?: string }>;
}) {
  const sp = await searchParams;

  const where: Record<string, unknown> = {};
  if (sp.status) where.status = sp.status;
  if (sp.priority) where.priority = sp.priority;
  if (sp.department) where.departmentId = sp.department;
  if (sp.owner) where.ownerId = sp.owner;

  const [projects, departments, users, teams] = await Promise.all([
    prisma.project.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: {
        department: { select: { name: true } },
        owner: { select: { id: true, name: true, avatarColor: true, avatarEmoji: true } },
        members: { include: { user: { select: { id: true, name: true, avatarColor: true, avatarEmoji: true } } } },
        tasks: { select: { status: true } },
      },
    }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
    prisma.user.findMany({ where: { active: true }, select: LITE_USER_SELECT, orderBy: { name: "asc" } }),
    prisma.team.findMany({ select: { id: true, name: true, departmentId: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <PageHeader
        eyebrow="Work"
        title="Projects"
        description="Every initiative across the organization, with live progress and delivery risk."
        actions={<NewProjectButton people={users} departments={departments} teams={teams} />}
      />

      <div className="mb-6">
        <ProjectFilters departments={departments} owners={users} />
      </div>

      {projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects match these filters"
          description="Try clearing a filter, or create the first project."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      )}
    </div>
  );
}
