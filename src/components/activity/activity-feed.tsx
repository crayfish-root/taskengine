import { prisma } from "@/lib/prisma";
import { ActivityTimeline } from "./activity-timeline";

/**
 * Drop-in server component: renders a clean timeline of ActivityLog rows for one
 * entity (a task, a project, a blocker, ...). Other modules' detail pages can
 * import this directly, e.g. `<ActivityFeed entityType="Task" entityId={task.id} />`.
 */
export async function ActivityFeed({
  entityType,
  entityId,
  limit = 20,
}: {
  entityType: string;
  entityId: string;
  limit?: number;
}) {
  const items = await prisma.activityLog.findMany({
    where: { entityType, entityId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      user: { select: { id: true, name: true, avatarColor: true, avatarEmoji: true } },
    },
  });

  return <ActivityTimeline items={items} emptyLabel="No activity on this item yet" />;
}
