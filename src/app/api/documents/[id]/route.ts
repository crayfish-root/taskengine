import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { ELEVATED_LEVELS } from "@/lib/org";
import { deleteFromStorage } from "@/lib/storage";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const patchSchema = z.object({ restricted: z.boolean() });

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { id } = await params;
  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const document = await prisma.document.findUnique({ where: { id }, select: { uploadedById: true } });
  if (!document) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const canManage = document.uploadedById === user.id || ELEVATED_LEVELS.has(user.level);
  if (!canManage) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const updated = await prisma.document.update({
    where: { id },
    data: { restricted: parsed.data.restricted },
    select: { id: true, restricted: true },
  });

  return NextResponse.json({ document: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { id } = await params;
  const document = await prisma.document.findUnique({ where: { id } });
  if (!document) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const canDelete = document.uploadedById === user.id || ELEVATED_LEVELS.has(user.level);
  if (!canDelete) {
    return NextResponse.json({ error: "You can only remove documents you uploaded" }, { status: 403 });
  }

  await prisma.document.delete({ where: { id } });

  if (document.storageKey) {
    await deleteFromStorage(document.storageKey).catch(() => {
      // best-effort — don't fail the delete over a storage cleanup hiccup
    });
  }

  await logActivity(prisma, {
    userId: user.id,
    action: `removed a document — "${document.name}"`,
    entityType: "Document",
    entityId: document.id,
    meta: { name: document.name },
  });

  return NextResponse.json({ ok: true });
}
