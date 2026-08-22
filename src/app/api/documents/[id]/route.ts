import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { ELEVATED_LEVELS } from "@/lib/org";
import { NextRequest, NextResponse } from "next/server";

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

  await logActivity(prisma, {
    userId: user.id,
    action: `removed a document — "${document.name}"`,
    entityType: "Document",
    entityId: document.id,
    meta: { name: document.name },
  });

  return NextResponse.json({ ok: true });
}
