import type { PrismaClient, Prisma, NotificationType } from "@prisma/client";

type PrismaLike = PrismaClient | Prisma.TransactionClient;

export interface NotifyInput {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
}

/**
 * Central helper for creating a Notification row. Other modules are free to call
 * `prisma.notification.create(...)` directly, but routing through here keeps the
 * shape consistent (and gives us one place to extend later — e.g. push/email fan-out).
 */
export async function notify(prisma: PrismaLike, { userId, type, title, body, link }: NotifyInput) {
  return prisma.notification.create({
    data: {
      userId,
      type,
      title,
      body: body ?? null,
      link: link ?? null,
    },
  });
}

/** Convenience for notifying several users with the same payload (e.g. all assignees). */
export async function notifyMany(prisma: PrismaLike, userIds: string[], payload: Omit<NotifyInput, "userId">) {
  const unique = Array.from(new Set(userIds));
  if (unique.length === 0) return [];
  await prisma.notification.createMany({
    data: unique.map((userId) => ({
      userId,
      type: payload.type,
      title: payload.title,
      body: payload.body ?? null,
      link: payload.link ?? null,
    })),
  });
  return unique;
}
