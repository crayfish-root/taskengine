import { prisma } from "@/lib/prisma";

/** Can `userId` manage (edit, add/remove members or teams on) project `projectId`? */
export async function canManageProject(userId: string, projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { ownerId: true } });
  if (!project) return false;
  if (project.ownerId === userId) return true;
  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  return !!membership;
}
