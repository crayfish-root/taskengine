import type { PrismaClient, Prisma } from "@prisma/client";

type PrismaLike = PrismaClient | Prisma.TransactionClient;

export interface LogActivityInput {
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  meta?: Record<string, unknown>;
}

/**
 * Writes one ActivityLog row. `action` is a free-form, human-readable phrase
 * ("changed status to In Progress", "delegated task to Aisha") — the activity
 * feed renders it as-is next to the actor's name, so write it as you'd want it read.
 */
export async function logActivity(prisma: PrismaLike, { userId, action, entityType, entityId, meta }: LogActivityInput) {
  return prisma.activityLog.create({
    data: {
      userId,
      action,
      entityType,
      entityId,
      meta: meta ? JSON.stringify(meta) : null,
    },
  });
}
