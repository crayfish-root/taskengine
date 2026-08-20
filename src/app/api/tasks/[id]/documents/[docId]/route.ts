import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string; docId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { id, docId } = await params;
  const doc = await prisma.document.findUnique({ where: { id: docId } });
  if (!doc || doc.taskId !== id) return NextResponse.json({ error: "Not found" }, { status: 404 });

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
