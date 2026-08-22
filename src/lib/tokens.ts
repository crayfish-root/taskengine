import { randomBytes } from "crypto";
import { prisma } from "./prisma";
import type { AuthTokenKind } from "@prisma/client";

const TTL_MS: Record<AuthTokenKind, number> = {
  INVITE: 7 * 24 * 60 * 60 * 1000, // 7 days
  PASSWORD_RESET: 24 * 60 * 60 * 1000, // 24 hours
};

/** Creates a new auth token of the given kind for a user, returning the raw token string. */
export async function issueAuthToken(kind: AuthTokenKind, userId: string, issuedById: string | null) {
  const token = randomBytes(32).toString("base64url");
  await prisma.authToken.create({
    data: { token, kind, userId, issuedById, expiresAt: new Date(Date.now() + TTL_MS[kind]) },
  });
  return token;
}

/** Looks up an unused, unexpired token of the given kind. Returns null if invalid. */
export async function consumeAuthToken(kind: AuthTokenKind, token: string) {
  const record = await prisma.authToken.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!record || record.kind !== kind || record.usedAt || record.expiresAt < new Date()) {
    return null;
  }
  return record;
}

export async function markAuthTokenUsed(id: string) {
  await prisma.authToken.update({ where: { id }, data: { usedAt: new Date() } });
}
