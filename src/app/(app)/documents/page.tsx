import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { DocumentsClient } from "@/components/documents/documents-client";

const DOCUMENT_INCLUDE = {
  uploadedBy: { select: { id: true, name: true, avatarColor: true, avatarEmoji: true } },
  project: { select: { id: true, name: true, code: true } },
  task: { select: { id: true, title: true, projectId: true, project: { select: { id: true, name: true, code: true } } } },
} as const;

export default async function DocumentsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [documents, activity] = await Promise.all([
    prisma.document.findMany({
      orderBy: { createdAt: "desc" },
      include: DOCUMENT_INCLUDE,
      take: 500,
    }),
    prisma.activityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { user: { select: { id: true, name: true, avatarColor: true, avatarEmoji: true } } },
    }),
  ]);

  return (
    <div>
      <PageHeader
        eyebrow="Org-wide library"
        title="Documents"
        description="Every file attached to a project or task, in one searchable place."
      />
      <DocumentsClient currentUser={user} initialDocuments={documents} initialActivity={activity} />
    </div>
  );
}
