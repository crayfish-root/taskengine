import { prisma } from "./prisma";

/** Returns the chain of managers above a user, starting with their direct manager. */
export async function getManagerChain(userId: string) {
  const chain: { id: string; name: string; level: string }[] = [];
  let current = await prisma.user.findUnique({ where: { id: userId }, select: { managerId: true } });
  let guard = 0;
  while (current?.managerId && guard < 12) {
    const manager = await prisma.user.findUnique({
      where: { id: current.managerId },
      select: { id: true, name: true, level: true, managerId: true },
    });
    if (!manager) break;
    chain.push({ id: manager.id, name: manager.name, level: manager.level });
    current = manager;
    guard++;
  }
  return chain;
}

/** Returns the ids of every user who reports up to `userId`, directly or transitively. */
export async function getAllReportIds(userId: string): Promise<string[]> {
  const all = await prisma.user.findMany({ select: { id: true, managerId: true } });
  const byManager = new Map<string, string[]>();
  for (const u of all) {
    if (!u.managerId) continue;
    byManager.set(u.managerId, [...(byManager.get(u.managerId) ?? []), u.id]);
  }
  const result: string[] = [];
  const queue = [...(byManager.get(userId) ?? [])];
  while (queue.length) {
    const id = queue.shift()!;
    result.push(id);
    queue.push(...(byManager.get(id) ?? []));
  }
  return result;
}

/** True if `managerId` is `userId`'s manager, at any distance up the chain. */
export async function isInManagementChain(managerId: string, userId: string) {
  const reports = await getAllReportIds(managerId);
  return reports.includes(userId);
}
