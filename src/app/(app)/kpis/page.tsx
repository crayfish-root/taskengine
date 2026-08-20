import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Target } from "lucide-react";
import { KpiFilters } from "./_components/kpi-filters";
import { KpiGrid } from "./_components/kpi-grid";
import { NewKpiButton } from "./_components/kpi-form-modal";

export default async function KpisPage({
  searchParams,
}: {
  searchParams: Promise<{ department?: string; project?: string; owner?: string }>;
}) {
  const [user, sp] = await Promise.all([getCurrentUser(), searchParams]);

  const where: { departmentId?: string; projectId?: string; ownerId?: string } = {};
  if (sp.department) where.departmentId = sp.department;
  if (sp.project) where.projectId = sp.project;
  if (sp.owner) where.ownerId = sp.owner;

  const [kpis, departments, projects, users] = await Promise.all([
    prisma.kpi.findMany({
      where,
      include: {
        department: { select: { id: true, name: true, color: true } },
        project: { select: { id: true, name: true, code: true } },
        owner: { select: { id: true, name: true, avatarColor: true, avatarEmoji: true } },
        records: { orderBy: { periodEnd: "asc" } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.department.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.project.findMany({ select: { id: true, name: true, code: true }, orderBy: { name: "asc" } }),
    prisma.user.findMany({
      where: { active: true },
      select: { id: true, name: true, avatarColor: true, avatarEmoji: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div>
      <PageHeader
        eyebrow="Tracking"
        title="KPIs"
        description="Organization-wide performance indicators, tracked against target."
        actions={<NewKpiButton departments={departments} projects={projects} users={users} currentUserId={user!.id} />}
      />

      <KpiFilters departments={departments} projects={projects} users={users} />

      <div className="mt-6">
        {kpis.length === 0 ? (
          <EmptyState
            icon={Target}
            title="No KPIs yet"
            description="Add the first KPI to start tracking performance against target."
          />
        ) : (
          <KpiGrid kpis={kpis} />
        )}
      </div>
    </div>
  );
}
