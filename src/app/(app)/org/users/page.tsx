import { prisma } from "@/lib/prisma";
import type { OrgLevel } from "@prisma/client";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Users as UsersIcon } from "lucide-react";
import Link from "next/link";
import { ORG_LEVEL } from "@/lib/status";
import { cn } from "@/lib/utils";
import { OrgSubnav } from "../_components/org-subnav";
import { UsersFilterBar } from "../_components/users-filter-bar";
import { CreateUserModalButton } from "../_components/create-user-modal";

export default async function UsersDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const departmentId = typeof sp.departmentId === "string" && sp.departmentId ? sp.departmentId : undefined;
  const teamId = typeof sp.teamId === "string" && sp.teamId ? sp.teamId : undefined;
  const level = typeof sp.level === "string" && sp.level ? (sp.level as OrgLevel) : undefined;
  const activeParam = typeof sp.active === "string" ? sp.active : undefined;

  const [users, departments, teams, managerOptions] = await Promise.all([
    prisma.user.findMany({
      where: {
        departmentId,
        level,
        active: activeParam === "true" ? true : activeParam === "false" ? false : undefined,
        ...(q ? { OR: [{ name: { contains: q } }, { email: { contains: q } }, { title: { contains: q } }] } : {}),
        ...(teamId ? { teamMemberships: { some: { teamId } } } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        title: true,
        level: true,
        active: true,
        passwordHash: true,
        avatarColor: true,
        avatarEmoji: true,
        department: { select: { id: true, name: true, color: true } },
        teamMemberships: { select: { team: { select: { id: true, name: true, color: true } } } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.department.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.team.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.user.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <PageHeader
        eyebrow="People"
        title="Directory"
        description="Every person in the company. Search and filter by department, team, level, or status."
        actions={<CreateUserModalButton departments={departments} teams={teams} managers={managerOptions} />}
      />
      <OrgSubnav active="users" />

      <div className="mt-6">
        <UsersFilterBar departments={departments} teams={teams} />

        {users.length === 0 ? (
          <EmptyState icon={UsersIcon} title="No matches" description="Try a different search or clear a filter." />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {users.map((u) => {
              const pending = !u.active && !u.passwordHash;
              return (
                <Link key={u.id} href={`/org/users/${u.id}`} className="block">
                  <Card className={cn("h-full transition-shadow hover:shadow-[var(--shadow-sm)]", !u.active && "opacity-60")}>
                    <CardContent className="flex items-start gap-3 p-4">
                      <Avatar name={u.name} color={u.avatarColor} emoji={u.avatarEmoji} size="md" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] font-medium text-foreground">{u.name}</p>
                        <p className="truncate text-[12px] text-muted">{u.title ?? "—"}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <StatusBadge map={ORG_LEVEL} value={u.level} dot={false} />
                          {u.department && <Badge tone="neutral">{u.department.name}</Badge>}
                          {pending ? (
                            <Badge tone="accent">Pending invite</Badge>
                          ) : (
                            !u.active && <Badge tone="danger">Deactivated</Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
