// Shared, framework-agnostic helpers for the Documents module — safe to import
// from both server (API routes, RSC) and client components.

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // 20MB hard cap, enforced regardless of storage backend
export const MAX_INLINE_BYTES = 5 * 1024 * 1024; // 5MB cap when object storage isn't configured and files fall back to inline storage

export type DocCategory = "image" | "pdf" | "spreadsheet" | "presentation" | "document" | "text" | "archive" | "other";

export const DOC_CATEGORY_LABELS: Record<DocCategory, string> = {
  image: "Image",
  pdf: "PDF",
  spreadsheet: "Spreadsheet",
  presentation: "Presentation",
  document: "Document",
  text: "Text",
  archive: "Archive",
  other: "Other",
};

export function categorizeMime(mimeType: string): DocCategory {
  const m = mimeType.toLowerCase();
  if (m.startsWith("image/")) return "image";
  if (m === "application/pdf") return "pdf";
  if (m.includes("spreadsheet") || m.includes("excel") || m === "text/csv") return "spreadsheet";
  if (m.includes("presentation") || m.includes("powerpoint")) return "presentation";
  if (m.includes("word") || m.includes("document")) return "document";
  if (m.startsWith("text/")) return "text";
  if (m.includes("zip") || m.includes("compressed") || m.includes("archive") || m.includes("tar")) return "archive";
  return "other";
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`;
}

/** Rough decoded byte size of a base64 data URL, without allocating the buffer. */
export function estimateDataUrlBytes(dataUrl: string): number {
  const commaIdx = dataUrl.indexOf(",");
  const base64 = commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl;
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}
