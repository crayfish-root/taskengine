import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import type { NotificationType } from "@prisma/client";

const VALID_TYPES: NotificationType[] = [
  "ASSIGNMENT",
  "DELEGATION",
  "STATUS_CHANGE",
  "MENTION",
  "BLOCKER",
  "UPDATE_REQUEST",
  "LEAVE",
  "KPI",
  "DEADLINE",
  "SYSTEM",
];

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const type = req.nextUrl.searchParams.get("type");
  const typeFilter = type && VALID_TYPES.includes(type as NotificationType) ? (type as NotificationType) : undefined;

  const result = await prisma.notification.updateMany({
    where: { userId: user.id, read: false, ...(typeFilter ? { type: typeFilter } : {}) },
    data: { read: true },
  });

  return NextResponse.json({ ok: true, updated: result.count });
}
