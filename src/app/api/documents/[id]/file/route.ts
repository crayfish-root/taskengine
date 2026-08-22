import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canViewDocument } from "@/lib/document-access";
import { getStorageDownloadUrl } from "@/lib/storage";
import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { id } = await params;
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!(await canViewDocument(user.id, user.level, doc))) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  if (doc.storageKey) {
    const url = await getStorageDownloadUrl(doc.storageKey, doc.name);
    return NextResponse.redirect(url);
  }

  if (!doc.dataUrl) return NextResponse.json({ error: "This document has no stored content" }, { status: 404 });

  const commaIdx = doc.dataUrl.indexOf(",");
  const base64 = commaIdx >= 0 ? doc.dataUrl.slice(commaIdx + 1) : doc.dataUrl;
  const buffer = Buffer.from(base64, "base64");

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": doc.mimeType || "application/octet-stream",
      "Content-Disposition": `inline; filename="${encodeURIComponent(doc.name)}"`,
      "Content-Length": String(buffer.length),
    },
  });
}
