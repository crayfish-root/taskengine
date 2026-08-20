import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { advanceDueDate } from "@/app/(app)/updates/_lib/frequency";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const createSchema = z.object({
  message: z.string().trim().min(1).max(4000),
  statusSnapshot: z.string().trim().max(120).optional().nullable(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const { id } = await params;

  const request = await prisma.scheduledUpdateRequest.findUnique({ where: { id } });
  if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 });
  }
  const data = parsed.data;

  const [response] = await prisma.$transaction([
    prisma.updateResponse.create({
      data: {
        requestId: id,
        responderId: user.id,
        message: data.message,
        statusSnapshot: data.statusSnapshot || null,
      },
    }),
    prisma.scheduledUpdateRequest.update({
      where: { id },
      data: { nextDueAt: advanceDueDate(request.frequency, new Date()) },
    }),
  ]);

  await prisma.notification.create({
    data: {
      userId: request.requestedById,
      type: "UPDATE_REQUEST",
      title: `${user.name} responded to "${request.title}"`,
      body: data.message.slice(0, 200),
      link: "/updates",
    },
  });

  return NextResponse.json({ response }, { status: 201 });
}
