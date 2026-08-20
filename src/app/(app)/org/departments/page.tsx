import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Landmark } from "lucide-react";
import { OrgSubnav } from "../_components/org-subnav";
import { CreateDepartmentModalButton, EditDepartmentModalButton } from "../_components/department-modals";

export default async function DepartmentsPage() {
  const departments = await prisma.department.findMany({
    select: {
      id: true,
      name: true,
      description: true,
      color: true,
      _count: { select: { users: true, teams: true, projects: true } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <PageHeader
        eyebrow="People"
        title="Departments"
        description="The top-level organizational units that teams and employees belong to."
        actions={<CreateDepartmentModalButton />}
      />
      <OrgSubnav active="departments" />

      <div className="mt-6">
        {departments.length === 0 ? (
          <EmptyState icon={Landmark} title="No departments yet" description="Create the first department to start organizing people." />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {departments.map((d) => (
              <Card key={d.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
                      <p className="text-[14px] font-semibold text-foreground">{d.name}</p>
                    </div>
                    <EditDepartmentModalButton
                      department={{
                        id: d.id,
                        name: d.name,
                        description: d.description,
                        color: d.color,
                        canDelete: d._count.users === 0 && d._count.teams === 0 && d._count.projects === 0,
                      }}
                    />
                  </div>
                  {d.description && <p className="mt-1.5 line-clamp-2 text-[12.5px] text-muted">{d.description}</p>}

                  <div className="mt-4 flex items-center gap-4 text-[12px] text-muted">
                    <span>
                      <span className="font-semibold text-foreground">{d._count.users}</span> people
                    </span>
                    <span>
                      <span className="font-semibold text-foreground">{d._count.teams}</span> teams
                    </span>
                    <span>
                      <span className="font-semibold text-foreground">{d._count.projects}</span> projects
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
