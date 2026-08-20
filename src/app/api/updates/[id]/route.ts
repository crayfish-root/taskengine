import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  question: z.string().trim().min(1).max(2000).optional(),
  frequency: z.enum(["DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY"]).optional(),
  active: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const { id } = await params;

  const existing = await prisma.scheduledUpdateRequest.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.requestedById !== user.id) {
    return NextResponse.json({ error: "Only the requester can edit this" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 });
  }

  const request = await prisma.scheduledUpdateRequest.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json({ request });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const { id } = await params;

  const existing = await prisma.scheduledUpdateRequest.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.requestedById !== user.id) {
    return NextResponse.json({ error: "Only the requester can delete this" }, { status: 403 });
  }

  await prisma.scheduledUpdateRequest.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
