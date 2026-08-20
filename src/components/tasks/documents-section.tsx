"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

export interface DocumentRow {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  createdAt: string | Date;
  uploadedBy: { name: string };
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentsSection({ taskId, documents }: { taskId: string; documents: DocumentRow[] }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onPick() {
    inputRef.current?.click();
  }

  function readAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      setError("File too large (max 8MB)");
      e.target.value = "";
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const dataUrl = await readAsDataUrl(file);
      const res = await fetch(`/api/tasks/${taskId}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, mimeType: file.type || "application/octet-stream", size: file.size, dataUrl }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Upload failed");
      } else {
        router.refresh();
      }
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[12.5px] text-muted">{documents.length} file{documents.length === 1 ? "" : "s"}</p>
        <Button size="sm" variant="outline" onClick={onPick} disabled={uploading}>
          <Upload className="h-3.5 w-3.5" /> {uploading ? "Uploading…" : "Upload"}
        </Button>
        <input ref={inputRef} type="file" className="hidden" onChange={onFileChange} />
      </div>
      {error && <p className="text-[12px] text-danger">{error}</p>}
      <div className="space-y-1.5">
        {documents.length === 0 && <p className="text-[13px] text-muted">No documents attached.</p>}
        {documents.map((d) => (
          <a
            key={d.id}
            href={`/api/tasks/${taskId}/documents/${d.id}`}
            className="flex items-center gap-2.5 rounded-[10px] border border-border-soft px-3 py-2 hover:bg-black/[0.02] dark:hover:bg-white/[0.04] transition-colors"
          >
            <FileText className="h-4 w-4 shrink-0 text-muted" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium">{d.name}</p>
              <p className="truncate text-[11px] text-muted">
                {formatSize(d.size)} · {d.uploadedBy.name} · {formatDate(d.createdAt)}
              </p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
