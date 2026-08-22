"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar } from "@/components/ui/avatar";
import { ActivityTimeline, ActivityTimelineItem } from "@/components/activity/activity-timeline";
import { UploadModal } from "./upload-modal";
import { categorizeMime, DOC_CATEGORY_LABELS, DocCategory, formatFileSize } from "@/lib/documents";
import { relativeTime } from "@/lib/utils";
import {
  Search,
  Upload,
  FileText,
  FileImage,
  FileSpreadsheet,
  FileArchive,
  File as FileIcon,
  Trash2,
  FolderKanban,
  ListChecks,
  Loader2,
  Download,
} from "lucide-react";

interface DocumentUser {
  id: string;
  name: string;
  avatarColor: string | null;
  avatarEmoji: string | null;
}

interface DocumentRow {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  dataUrl: string;
  createdAt: string | Date;
  uploadedBy: DocumentUser;
  project: { id: string; name: string; code: string } | null;
  task: { id: string; title: string; projectId: string | null; project: { id: string; name: string; code: string } | null } | null;
}

const CATEGORY_ICONS: Record<DocCategory, typeof FileText> = {
  image: FileImage,
  pdf: FileText,
  spreadsheet: FileSpreadsheet,
  presentation: FileText,
  document: FileText,
  text: FileText,
  archive: FileArchive,
  other: FileIcon,
};

export function DocumentsClient({
  currentUser,
  initialDocuments,
  initialActivity,
}: {
  currentUser: { id: string; level: string };
  initialDocuments: DocumentRow[];
  initialActivity: ActivityTimelineItem[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"documents" | "activity">("documents");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<"ALL" | DocCategory>("ALL");
  const [uploaderId, setUploaderId] = useState("ALL");
  const [scope, setScope] = useState<"ALL" | "project" | "task" | "unattached">("ALL");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [fetchedDocuments, setFetchedDocuments] = useState<DocumentRow[] | null>(null);
  const [searching, setSearching] = useState(false);
  const requestId = useRef(0);

  const uploaders = useMemo(() => {
    const map = new Map<string, DocumentUser>();
    for (const d of initialDocuments) map.set(d.uploadedBy.id, d.uploadedBy);
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [initialDocuments]);

  const hasActiveFilter = search.trim() !== "" || uploaderId !== "ALL" || scope !== "ALL";
  const documents = hasActiveFilter ? fetchedDocuments ?? initialDocuments : initialDocuments;
  const isSearching = hasActiveFilter && searching;

  // Search and filters (other than category, which is client-derived) are served from
  // the API so results aren't limited to the first 500 documents in the initial snapshot.
  useEffect(() => {
    if (!hasActiveFilter) return;
    const q = search.trim();
    const id = ++requestId.current;
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const params = new URLSearchParams();
        if (q) params.set("q", q);
        if (uploaderId !== "ALL") params.set("uploaderId", uploaderId);
        if (scope !== "ALL") params.set("scope", scope);
        const res = await fetch(`/api/documents?${params.toString()}`);
        if (!res.ok) throw new Error("Search failed");
        const data = await res.json();
        if (id === requestId.current) setFetchedDocuments(data.documents ?? []);
      } catch {
        // keep showing the previous results on failure
      } finally {
        if (id === requestId.current) setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search, uploaderId, scope, hasActiveFilter]);

  const filtered = useMemo(() => {
    return documents.filter((d) => {
      if (category !== "ALL" && categorizeMime(d.mimeType) !== category) return false;
      return true;
    });
  }, [documents, category]);

  async function handleDelete(id: string) {
    if (!window.confirm("Remove this document? This can't be undone.")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Could not delete document");
      }
      router.refresh();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Could not delete document");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 pb-5">
        <SegmentedControl
          options={[
            { label: "Documents", value: "documents" },
            { label: "Recent Activity", value: "activity" },
          ]}
          value={tab}
          onChange={(v) => setTab(v as "documents" | "activity")}
        />
        {tab === "documents" && (
          <Button variant="primary" size="sm" onClick={() => setUploadOpen(true)}>
            <Upload className="h-3.5 w-3.5" /> Upload
          </Button>
        )}
      </div>

      {tab === "documents" ? (
        <div>
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              {isSearching ? (
                <Loader2 className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-2 animate-spin" />
              ) : (
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-2" />
              )}
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search documents…"
                className="pl-8"
              />
            </div>
            <Select value={category} onChange={(e) => setCategory(e.target.value as "ALL" | DocCategory)} className="w-[150px]">
              <option value="ALL">All types</option>
              {Object.entries(DOC_CATEGORY_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </Select>
            <Select value={uploaderId} onChange={(e) => setUploaderId(e.target.value)} className="w-[160px]">
              <option value="ALL">All uploaders</option>
              {uploaders.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </Select>
            <Select value={scope} onChange={(e) => setScope(e.target.value as typeof scope)} className="w-[150px]">
              <option value="ALL">Attached to anything</option>
              <option value="project">Projects</option>
              <option value="task">Tasks</option>
              <option value="unattached">Unattached</option>
            </Select>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No documents match"
              description="Try a different search or filter, or upload a new file."
              action={
                <Button variant="secondary" size="sm" onClick={() => setUploadOpen(true)}>
                  <Upload className="h-3.5 w-3.5" /> Upload a document
                </Button>
              }
            />
          ) : (
            <Card>
              <CardContent className="p-2 divide-y divide-border-soft">
                {filtered.map((doc) => {
                  const cat = categorizeMime(doc.mimeType);
                  const Icon = CATEGORY_ICONS[cat];
                  const canDelete = doc.uploadedBy.id === currentUser.id || ["CIO", "DIRECTOR", "HEAD_OF_DEPARTMENT"].includes(currentUser.level);
                  return (
                    <div key={doc.id} className="flex items-center gap-3 px-3 py-3">
                      {cat === "image" ? (
                        <img
                          src={doc.dataUrl}
                          alt=""
                          className="h-10 w-10 shrink-0 rounded-[8px] object-cover border border-border-soft"
                        />
                      ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-black/[0.04] dark:bg-white/[0.06]">
                          <Icon className="h-[18px] w-[18px] text-muted" strokeWidth={1.75} />
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] font-medium text-foreground">{doc.name}</p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-muted">
                          <span>{formatFileSize(doc.size)}</span>
                          <span className="text-muted-2">·</span>
                          <span className="inline-flex items-center gap-1">
                            <Avatar name={doc.uploadedBy.name} color={doc.uploadedBy.avatarColor} emoji={doc.uploadedBy.avatarEmoji} size="xs" />
                            {doc.uploadedBy.name}
                          </span>
                          <span className="text-muted-2">·</span>
                          <span>{relativeTime(doc.createdAt)}</span>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        {doc.project && (
                          <Link
                            href={`/projects/${doc.project.id}`}
                            className="inline-flex items-center gap-1 rounded-full bg-black/[0.05] dark:bg-white/[0.08] px-2.5 py-1 text-[11.5px] font-medium text-foreground hover:bg-accent-soft hover:text-accent transition-colors"
                          >
                            <FolderKanban className="h-3 w-3" /> {doc.project.name}
                          </Link>
                        )}
                        {doc.task && (
                          <Link
                            href={`/tasks/${doc.task.id}`}
                            className="inline-flex items-center gap-1 rounded-full bg-black/[0.05] dark:bg-white/[0.08] px-2.5 py-1 text-[11.5px] font-medium text-foreground hover:bg-accent-soft hover:text-accent transition-colors"
                          >
                            <ListChecks className="h-3 w-3" /> {doc.task.title}
                          </Link>
                        )}
                        {!doc.project && !doc.task && (
                          <span className="rounded-full bg-black/[0.04] dark:bg-white/[0.06] px-2.5 py-1 text-[11.5px] text-muted-2">
                            Unattached
                          </span>
                        )}
                        <a
                          href={doc.dataUrl}
                          download={doc.name}
                          className="rounded-full p-1.5 text-muted hover:bg-black/[0.05] dark:hover:bg-white/[0.08] hover:text-foreground transition-colors"
                          title="Download"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </a>
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(doc.id)}
                            disabled={deletingId === doc.id}
                            className="rounded-full p-1.5 text-muted hover:bg-danger-soft hover:text-danger transition-colors"
                            title="Delete"
                          >
                            {deletingId === doc.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="p-5">
            <ActivityTimeline items={initialActivity} showEntity emptyLabel="No activity recorded yet" />
          </CardContent>
        </Card>
      )}

      <UploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} onUploaded={() => router.refresh()} />
    </div>
  );
}
