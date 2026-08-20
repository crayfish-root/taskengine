import { PageHeader } from "@/components/ui/page-header";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAllReportIds } from "@/lib/org";
import { LeaveHub } from "./leave-client";
import { redirect } from "next/navigation";

export default async function LeavePage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  const [users, leaveRequests, myMemberships] = await Promise.all([
    prisma.user.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
        title: true,
        avatarColor: true,
        avatarEmoji: true,
        departmentId: true,
        managerId: true,
        level: true,
      },
      orderBy: { name: "asc" },
    }),
    prisma.leaveRequest.findMany({
      include: {
        user: { select: { id: true, name: true, avatarColor: true, avatarEmoji: true, departmentId: true } },
        approver: { select: { id: true, name: true } },
      },
      orderBy: { startDate: "desc" },
    }),
    prisma.teamMembership.findMany({
      where: { userId: currentUser.id },
      select: { teamId: true },
    }),
  ]);

  const teamIds = myMemberships.map((m) => m.teamId);
  const teammateIds = teamIds.length
    ? (
        await prisma.teamMembership.findMany({
          where: { teamId: { in: teamIds }, userId: { not: currentUser.id } },
          select: { userId: true },
        })
      ).map((m) => m.userId)
    : [];

  const reportIds = currentUser.level === "CIO" ? null : await getAllReportIds(currentUser.id);

  return (
    <div>
      <PageHeader
        eyebrow="People"
        title="Leave"
        description="See who's away, request time off, and approve requests for your team."
      />
      <LeaveHub
        currentUser={currentUser}
        users={users}
        leaveRequests={leaveRequests.map((l) => ({
          ...l,
          startDate: l.startDate.toISOString(),
          endDate: l.endDate.toISOString(),
          createdAt: l.createdAt.toISOString(),
        }))}
        teammateIds={teammateIds}
        canApproveAll={currentUser.level === "CIO"}
        reportIds={reportIds ?? []}
      />
    </div>
  );
}
