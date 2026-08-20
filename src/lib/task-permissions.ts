import { prisma } from "@/lib/prisma";
import { isInManagementChain } from "@/lib/org";

/**
 * Can `userId` act on (change status of / comment on / manage) a task?
 * True if they are the creator, the delegator, an assignee, the project owner,
 * or a manager (at any distance) of one of the current assignees.
 */
export async function canActOnTask(userId: string, taskId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      createdById: true,
      delegatedById: true,
      assignments: { select: { userId: true } },
      project: { select: { ownerId: true } },
    },
  });
  if (!task) return false;
  if (task.createdById === userId) return true;
  if (task.delegatedById === userId) return true;
  if (task.project?.ownerId === userId) return true;
  if (task.assignments.some((a) => a.userId === userId)) return true;
  for (const a of task.assignments) {
    if (await isInManagementChain(userId, a.userId)) return true;
  }
  return false;
}
