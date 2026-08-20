import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { OrgSubnav } from "./_components/org-subnav";
import { OrgChartClient } from "./_components/org-tree";
import { buildOrgTree, type RawOrgUser } from "./_lib/tree";

export default async function OrgChartPage() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      title: true,
      level: true,
      avatarColor: true,
      avatarEmoji: true,
      active: true,
      managerId: true,
      department: { select: { name: true } },
      _count: {
        select: {
          assignments: { where: { task: { status: { notIn: ["DONE", "CANCELLED"] } } } },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const raw: RawOrgUser[] = users.map((u) => ({
    id: u.id,
    name: u.name,
    title: u.title,
    level: u.level,
    avatarColor: u.avatarColor,
    avatarEmoji: u.avatarEmoji,
    active: u.active,
    managerId: u.managerId,
    departmentName: u.department?.name ?? null,
    openTaskCount: u._count.assignments,
  }));

  const roots = buildOrgTree(raw);

  return (
    <div>
      <PageHeader
        eyebrow="People"
        title="Org Chart"
        description="Every delegation layer, from the CIO down to staff. Expand a branch to see who reports where, and how much open work sits with them."
      />
      <OrgSubnav active="chart" />
      <Card className="mt-6">
        <CardContent className="p-4 sm:p-6">
          <OrgChartClient roots={roots} totalCount={users.length} />
        </CardContent>
      </Card>
    </div>
  );
}
