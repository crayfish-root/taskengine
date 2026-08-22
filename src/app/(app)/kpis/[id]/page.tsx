import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { ELEVATED_LEVELS } from "@/lib/org";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { KPI_FREQUENCY } from "@/lib/status";
import { readKpi } from "../_lib/kpi-math";
import { KpiChart } from "./_components/kpi-chart";
import { KpiRecordsTable } from "./_components/kpi-records-table";
import { KpiDetailActions } from "./_components/kpi-detail-actions";
import { ArrowLeft } from "lucide-react";

export default async function KpiDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const currentUser = await getCurrentUser();
  if (!currentUser) return null;

  const [kpi, departments, projects, users] = await Promise.all([
    prisma.kpi.findUnique({
      where: { id },
      include: {
        department: { select: { id: true, name: true, color: true } },
        project: { select: { id: true, name: true, code: true } },
        owner: { select: { id: true, name: true, avatarColor: true, avatarEmoji: true } },
        records: {
          orderBy: { periodEnd: "asc" },
          include: { updatedBy: { select: { name: true } } },
        },
      },
    }),
    prisma.department.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.project.findMany({ select: { id: true, name: true, code: true }, orderBy: { name: "asc" } }),
    prisma.user.findMany({
      where: { active: true },
      select: { id: true, name: true, avatarColor: true, avatarEmoji: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!kpi) notFound();

  const canManage = currentUser.id === kpi.ownerId || ELEVATED_LEVELS.has(currentUser.level);
  const reading = readKpi(kpi.records, kpi.target, kpi.direction);
  const scope = kpi.project ? `${kpi.project.code} · ${kpi.project.name}` : kpi.department ? kpi.department.name : "Organization-wide";
  const progressColor =
    reading.tone === "success" ? "var(--success)" : reading.tone === "warning" ? "var(--warning)" : reading.tone === "danger" ? "var(--danger)" : "var(--muted-2)";

  return (
    <div>
      <Link href="/kpis" className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-muted hover:text-foreground transition-colors mb-4">
        <ArrowLeft className="h-3.5 w-3.5" /> KPIs
      </Link>

      <PageHeader
        eyebrow={scope}
        title={kpi.name}
        description={kpi.description ?? undefined}
        actions={
          <KpiDetailActions
            kpi={{
              id: kpi.id,
              name: kpi.name,
              description: kpi.description ?? "",
              unit: kpi.unit,
              target: String(kpi.target),
              direction: kpi.direction,
              frequency: kpi.frequency,
              departmentId: kpi.departmentId ?? "",
              projectId: kpi.projectId ?? "",
              ownerId: kpi.ownerId,
            }}
            departments={departments}
            projects={projects}
            users={users}
            canManage={canManage}
          />
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>History</CardTitle>
            <Badge tone="neutral">{KPI_FREQUENCY[kpi.frequency]?.label ?? kpi.frequency}</Badge>
          </CardHeader>
          <CardContent>
            <KpiChart records={kpi.records} target={kpi.target} unit={kpi.unit} tone={reading.tone} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-5">
            <div>
              <p className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-muted-2">Current</p>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-[30px] font-semibold tracking-[-0.02em]">
                  {reading.current != null ? reading.current.toLocaleString() : "—"}
                </span>
                {kpi.unit && <span className="text-[13px] text-muted">{kpi.unit}</span>}
              </div>
              <p className="mt-0.5 text-[12.5px] text-muted">
                target {kpi.target.toLocaleString()} {kpi.unit}
              </p>
              <Progress value={reading.progressPct} colorVar={progressColor} className="mt-3" />
              <p className="mt-1.5 text-[12px] text-muted">
                {reading.onTarget ? "On target" : `${Math.round(reading.progressPct)}% of target`}
              </p>
            </div>

            <div className="border-t border-border-soft pt-4">
              <p className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-muted-2">Owner</p>
              <div className="mt-2 flex items-center gap-2">
                <Avatar name={kpi.owner.name} color={kpi.owner.avatarColor} emoji={kpi.owner.avatarEmoji} size="sm" />
                <span className="text-[13.5px]">{kpi.owner.name}</span>
              </div>
            </div>

            <div className="border-t border-border-soft pt-4">
              <p className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-muted-2">Direction</p>
              <p className="mt-1.5 text-[13.5px] text-muted">
                {kpi.direction === "HIGHER_IS_BETTER" ? "Higher is better" : "Lower is better"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Readings</CardTitle>
        </CardHeader>
        <CardContent>
          <KpiRecordsTable kpiId={kpi.id} records={kpi.records} unit={kpi.unit} />
        </CardContent>
      </Card>
    </div>
  );
}
