import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canViewDocument } from "@/lib/document-access";
import { PageHeader } from "@/components/ui/page-header";
import { DocumentsClient } from "@/components/documents/documents-client";

// Excludes dataUrl/storageKey — file bytes are served separately via /api/documents/[id]/file
// so this page's initial payload doesn't ship megabyte-sized base64 blobs.
const DOCUMENT_SELECT = {
  id: true,
  name: true,
  mimeType: true,
  size: true,
  restricted: true,
  createdAt: true,
  uploadedById: true,
  uploadedBy: { select: { id: true, name: true, avatarColor: true, avatarEmoji: true } },
  projectId: true,
  project: { select: { id: true, name: true, code: true } },
  taskId: true,
  task: { select: { id: true, title: true, projectId: true, project: { select: { id: true, name: true, code: true } } } },
} as const;

export default async function DocumentsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [allDocuments, activity] = await Promise.all([
    prisma.document.findMany({
      orderBy: { createdAt: "desc" },
      select: DOCUMENT_SELECT,
      take: 500,
    }),
    prisma.activityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { user: { select: { id: true, name: true, avatarColor: true, avatarEmoji: true } } },
    }),
  ]);

  const documents = (
    await Promise.all(allDocuments.map(async (d) => ((await canViewDocument(user.id, user.level, d)) ? d : null)))
  ).filter((d): d is (typeof allDocuments)[number] => d !== null);

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
