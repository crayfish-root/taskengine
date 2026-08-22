import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight, ListChecks, CalendarOff } from "lucide-react";
import { getManagerChain, getAllReportIds, ELEVATED_LEVELS } from "@/lib/org";
import { getCurrentUser } from "@/lib/auth";
import { cn, levelLabel } from "@/lib/utils";
import { ORG_LEVEL } from "@/lib/status";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { EditUserModalButton } from "../../_components/edit-user-modal";
import { ResendInviteButton, ResetPasswordButton } from "../../_components/user-account-actions";

export default async function UserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await getCurrentUser();

  const user = await prisma.user.findUnique({
    where: { id },
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
      departmentId: true,
      department: { select: { id: true, name: true, color: true } },
      managerId: true,
      manager: { select: { id: true, name: true, title: true, avatarColor: true, avatarEmoji: true, level: true } },
      directReports: {
        select: { id: true, name: true, title: true, level: true, avatarColor: true, avatarEmoji: true, active: true },
        orderBy: { name: "asc" },
      },
      teamMemberships: { select: { team: { select: { id: true, name: true, color: true } } } },
    },
  });
  if (!user) notFound();

  const [managerChain, downstreamIds, totalAssigned, openTaskCount, leaveTotal, leavePending, departments, teams, managerOptions] =
    await Promise.all([
      getManagerChain(id),
      getAllReportIds(id),
      prisma.taskAssignment.count({ where: { userId: id } }),
      prisma.taskAssignment.count({ where: { userId: id, task: { status: { notIn: ["DONE", "CANCELLED"] } } } }),
      prisma.leaveRequest.count({ where: { userId: id } }),
      prisma.leaveRequest.count({ where: { userId: id, status: "PENDING" } }),
      prisma.department.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
      prisma.team.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
      prisma.user.findMany({ where: { active: true, id: { not: id } }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    ]);

  const breadcrumb = [...managerChain].reverse(); // top of org (CIO) first, down to this person's direct manager
  const pending = !user.active && !user.passwordHash;
  const canManageAccount = !!viewer && ELEVATED_LEVELS.has(viewer.level);

  return (
    <div>
      {breadcrumb.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-1 text-[12.5px] text-muted">
          {breadcrumb.map((m) => (
            <span key={m.id} className="flex items-center gap-1">
              <Link href={`/org/users/${m.id}`} className="transition-colors hover:text-foreground">
                {m.name}
              </Link>
              <ChevronRight className="h-3 w-3 text-muted-2" />
            </span>
          ))}
          <span className="font-medium text-foreground">{user.name}</span>
        </div>
      )}

      <PageHeader
        title={user.name}
        description={user.title ?? undefined}
        actions={
          <div className="flex items-center gap-2">
            {canManageAccount && (pending ? <ResendInviteButton userId={user.id} /> : <ResetPasswordButton userId={user.id} />)}
            <EditUserModalButton
              user={{
                id: user.id,
                name: user.name,
                email: user.email,
                title: user.title,
                level: user.level,
                active: user.active,
                departmentId: user.departmentId,
                managerId: user.managerId,
                teamIds: user.teamMemberships.map((m) => m.team.id),
              }}
              departments={departments}
              teams={teams}
              managers={managerOptions}
            />
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-1">
          <Card>
            <CardContent className="flex flex-col items-center p-6 text-center">
              <Avatar name={user.name} color={user.avatarColor} emoji={user.avatarEmoji} size="xl" />
              <p className="mt-3 text-[15px] font-semibold text-foreground">{user.name}</p>
              <p className="text-[12.5px] text-muted">{user.email}</p>
              <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                <StatusBadge map={ORG_LEVEL} value={user.level} dot={false} />
                {pending ? (
                  <Badge tone="accent">Pending invite</Badge>
                ) : (
                  !user.active && <Badge tone="danger">Deactivated</Badge>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Reports to</CardTitle>
            </CardHeader>
            <CardContent>
              {user.manager ? (
                <Link
                  href={`/org/users/${user.manager.id}`}
                  className="-m-1.5 flex items-center gap-3 rounded-[10px] p-1.5 transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.05]"
                >
                  <Avatar name={user.manager.name} color={user.manager.avatarColor} emoji={user.manager.avatarEmoji} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-foreground">{user.manager.name}</p>
                    <p className="truncate text-[11.5px] text-muted">{user.manager.title ?? levelLabel(user.manager.level)}</p>
                  </div>
                </Link>
              ) : (
                <p className="text-[13px] text-muted">No manager — top of the org chart.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Department &amp; team</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {user.department ? (
                <Badge tone="neutral" dot>
                  {user.department.name}
                </Badge>
              ) : (
                <p className="text-[13px] text-muted">No department assigned.</p>
              )}
              <div className="flex flex-wrap gap-1.5">
                {user.teamMemberships.length === 0 ? (
                  <p className="text-[13px] text-muted">No team memberships.</p>
                ) : (
                  user.teamMemberships.map((m) => (
                    <Link key={m.team.id} href={`/org/teams/${m.team.id}`}>
                      <Badge tone="accent">{m.team.name}</Badge>
                    </Link>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Direct reports</CardTitle>
              <CardDescription>{downstreamIds.length} people total in this reporting line, including indirect reports.</CardDescription>
            </CardHeader>
            <CardContent>
              {user.directReports.length === 0 ? (
                <EmptyState title="No direct reports" description="This person doesn't currently manage anyone." />
              ) : (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {user.directReports.map((r) => (
                    <Link
                      key={r.id}
                      href={`/org/users/${r.id}`}
                      className={cn(
                        "flex items-center gap-3 rounded-[10px] border border-border p-2.5 transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.04]",
                        !r.active && "opacity-60"
                      )}
                    >
                      <Avatar name={r.name} color={r.avatarColor} emoji={r.avatarEmoji} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-foreground">{r.name}</p>
                        <p className="truncate text-[11.5px] text-muted">{r.title ?? levelLabel(r.level)}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ListChecks className="h-4 w-4 text-muted-2" /> Assigned Tasks
                </CardTitle>
                <CardDescription>Full task management lives in the Tasks module.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <p className="text-[26px] font-semibold tracking-[-0.02em] text-foreground">{openTaskCount}</p>
                  <p className="text-[12.5px] text-muted">open of {totalAssigned} total assigned</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarOff className="h-4 w-4 text-muted-2" /> Leave
                </CardTitle>
                <CardDescription>Full leave management lives in the Leave module.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <p className="text-[26px] font-semibold tracking-[-0.02em] text-foreground">{leavePending}</p>
                  <p className="text-[12.5px] text-muted">pending of {leaveTotal} total requests</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
