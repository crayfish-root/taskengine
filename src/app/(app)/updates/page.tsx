import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getAllReportIds } from "@/lib/org";
import { PageHeader } from "@/components/ui/page-header";
import { UpdatesClient } from "./_components/updates-client";
import { RequestUpdateButton } from "./_components/request-modal";
import { redirect } from "next/navigation";

const responseSelect = {
  orderBy: { createdAt: "desc" as const },
  take: 1,
  include: { responder: { select: { id: true, name: true, avatarColor: true, avatarEmoji: true } } },
};

export default async function UpdatesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [made, ofMe, reportIds, allUsers, projects, tasks] = await Promise.all([
    prisma.scheduledUpdateRequest.findMany({
      where: { requestedById: user.id },
      include: {
        requestedOf: { select: { id: true, name: true, avatarColor: true, avatarEmoji: true } },
        project: { select: { id: true, name: true, code: true } },
        task: { select: { id: true, title: true } },
        responses: responseSelect,
      },
      orderBy: { nextDueAt: "asc" },
    }),
    prisma.scheduledUpdateRequest.findMany({
      where: { requestedOfId: user.id },
      include: {
        requestedBy: { select: { id: true, name: true, avatarColor: true, avatarEmoji: true } },
        project: { select: { id: true, name: true, code: true } },
        task: { select: { id: true, title: true } },
        responses: responseSelect,
      },
      orderBy: { nextDueAt: "asc" },
    }),
    getAllReportIds(user.id),
    prisma.user.findMany({
      where: { active: true },
      select: { id: true, name: true, avatarColor: true, avatarEmoji: true, level: true },
      orderBy: { name: "asc" },
    }),
    prisma.project.findMany({ select: { id: true, name: true, code: true }, orderBy: { name: "asc" } }),
    prisma.task.findMany({ select: { id: true, title: true, projectId: true }, orderBy: { title: "asc" }, take: 300 }),
  ]);

  const reportSet = new Set(reportIds);
  const people = allUsers
    .filter((u) => u.id !== user.id)
    .sort((a, b) => {
      const aRep = reportSet.has(a.id) ? 0 : 1;
      const bRep = reportSet.has(b.id) ? 0 : 1;
      return aRep - bRep || a.name.localeCompare(b.name);
    });

  return (
    <div>
      <PageHeader
        eyebrow="Tracking"
        title="Scheduled Update Requests"
        description="Ask a colleague for a recurring status update, or respond to updates others are waiting on from you."
        actions={<RequestUpdateButton people={people} projects={projects} tasks={tasks} />}
      />
      <UpdatesClient made={made} ofMe={ofMe} />
    </div>
  );
}
