"use client";

import { useRef, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldGroup } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/tabs";
import { TargetPicker, TargetOption } from "./target-picker";
import { MAX_UPLOAD_BYTES, formatFileSize } from "@/lib/documents";
import { UploadCloud, FileWarning, Lock } from "lucide-react";

export function UploadModal({ open, onClose, onUploaded }: { open: boolean; onClose: () => void; onUploaded: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"none" | "project" | "task">("none");
  const [target, setTarget] = useState<TargetOption | null>(null);
  const [restricted, setRestricted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setFile(null);
    setName("");
    setKind("none");
    setTarget(null);
    setRestricted(false);
    setError(null);
    setUploading(false);
  }

  function handleClose() {
    if (uploading) return;
    reset();
    onClose();
  }

  function handleFilePick(f: File | null) {
    setError(null);
    if (!f) {
      setFile(null);
      return;
    }
    if (f.size > MAX_UPLOAD_BYTES) {
      setError(`"${f.name}" is ${formatFileSize(f.size)} — the limit is ${formatFileSize(MAX_UPLOAD_BYTES)}.`);
      setFile(null);
      return;
    }
    setFile(f);
    setName(f.name);
  }

  async function handleSubmit() {
    if (!file) {
      setError("Choose a file to upload.");
      return;
    }
    if (kind !== "none" && !target) {
      setError(`Pick a ${kind} to attach this to, or switch to Unattached.`);
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const dataUrl = await readAsDataUrl(file);
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || file.name,
          mimeType: file.type || "application/octet-stream",
          size: file.size,
          dataUrl,
          projectId: kind === "project" ? target?.id : null,
          taskId: kind === "task" ? target?.id : null,
          restricted,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Upload failed");
      }
      reset();
      onUploaded();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Upload document" description={`Files stay under ${formatFileSize(MAX_UPLOAD_BYTES)}.`}>
      <div className="space-y-4">
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleFilePick(e.dataTransfer.files?.[0] ?? null);
          }}
          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[12px] border border-dashed border-border px-6 py-8 text-center transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
        >
          <UploadCloud className="h-5 w-5 text-muted" strokeWidth={1.75} />
          {file ? (
            <p className="text-[13px] text-foreground">
              <span className="font-medium">{file.name}</span> · {formatFileSize(file.size)}
            </p>
          ) : (
            <p className="text-[13px] text-muted">Click to choose a file, or drag one here</p>
          )}
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            onChange={(e) => handleFilePick(e.target.files?.[0] ?? null)}
          />
        </div>

        {file && (
          <FieldGroup>
            <Label htmlFor="doc-name">Name</Label>
            <Input id="doc-name" value={name} onChange={(e) => setName(e.target.value)} />
          </FieldGroup>
        )}

        <FieldGroup>
          <Label>Attach to</Label>
          <SegmentedControl
            options={[
              { label: "Unattached", value: "none" },
              { label: "Project", value: "project" },
              { label: "Task", value: "task" },
            ]}
            value={kind}
            onChange={(v) => {
              setKind(v as "none" | "project" | "task");
              setTarget(null);
            }}
          />
        </FieldGroup>

        {kind !== "none" && (
          <TargetPicker
            kind={kind}
            value={target}
            onSelect={setTarget}
            placeholder={kind === "project" ? "Search projects…" : "Search tasks…"}
          />
        )}

        <label className="flex items-start gap-2.5 rounded-[10px] border border-border-soft p-3 cursor-pointer">
          <input
            type="checkbox"
            checked={restricted}
            onChange={(e) => setRestricted(e.target.checked)}
            className="mt-0.5 h-3.5 w-3.5 accent-[var(--warning)]"
          />
          <span className="text-[12.5px] text-foreground">
            <span className="inline-flex items-center gap-1 font-medium">
              <Lock className="h-3 w-3" /> Restricted
            </span>
            <br />
            <span className="text-muted">
              Only you, elevated roles, and {kind === "none" ? "no one else" : `the ${kind}'s team`} can see this — everyone else can
              see everything else by default.
            </span>
          </span>
        </label>

        {error && (
          <div className="flex items-start gap-2 rounded-[10px] bg-danger-soft px-3 py-2.5 text-[12.5px] text-danger">
            <FileWarning className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={handleClose} disabled={uploading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={uploading || !file}>
            {uploading ? "Uploading…" : "Upload"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}
