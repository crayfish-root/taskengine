import { prisma } from "@/lib/prisma";
import { hashPassword, createSession } from "@/lib/auth";
import { consumeAuthToken } from "@/lib/tokens";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const record = await consumeAuthToken("INVITE", token);
  if (!record) return NextResponse.json({ error: "This invite link is invalid or has expired" }, { status: 400 });

  return NextResponse.json({ name: record.user.name, email: record.user.email });
}

const acceptSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(200),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = acceptSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const record = await consumeAuthToken("INVITE", parsed.data.token);
  if (!record) return NextResponse.json({ error: "This invite link is invalid or has expired" }, { status: 400 });

  const passwordHash = await hashPassword(parsed.data.password);
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash, active: true } }),
    prisma.authToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);

  await createSession(record.userId);
  return NextResponse.json({ ok: true });
}
