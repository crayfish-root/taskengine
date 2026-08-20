import { PageHeader } from "@/components/ui/page-header";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { buildWorkloadGrid } from "@/lib/workload";
import { buildCoverageQueue } from "@/lib/auto-assign";
import { WorkloadHeatmap } from "./heatmap";
import { CoverageQueue } from "./coverage-queue";

export default async function WorkloadPage({
  searchParams,
}: {
  searchParams: Promise<{ dept?: string; team?: string }>;
}) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  const { dept, team } = await searchParams;

  const [grid, departments, teams, coverage] = await Promise.all([
    buildWorkloadGrid({ departmentId: dept, teamId: team }),
    prisma.department.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.team.findMany({ select: { id: true, name: true, departmentId: true }, orderBy: { name: "asc" } }),
    buildCoverageQueue(),
  ]);

  return (
    <div>
      <PageHeader
        eyebrow="Overview"
        title="Workload"
        description="Who's stretched thin over the coming weeks, and who's away — at a glance."
      />

      <WorkloadHeatmap
        weeks={grid.weeks.map((w) => ({ start: w.start.toISOString(), end: w.end.toISOString(), label: w.label }))}
        rows={grid.rows.map((r) => ({
          user: r.user,
          cells: r.cells.map((c) => ({
            ...c,
            tasks: c.tasks.map((t) => ({ ...t, dueDate: t.dueDate ? t.dueDate.toISOString() : null })),
          })),
        }))}
        departments={departments}
        teams={teams}
        selectedDept={dept ?? ""}
        selectedTeam={team ?? ""}
      />

      <div id="coverage" className="scroll-mt-6 mt-10">
        <CoverageQueue
          initialItems={coverage.map((c) => ({
            ...c,
            leaveEndDate: c.leaveEndDate.toISOString(),
            taskDueDate: c.taskDueDate ? c.taskDueDate.toISOString() : null,
          }))}
        />
      </div>
    </div>
  );
}
