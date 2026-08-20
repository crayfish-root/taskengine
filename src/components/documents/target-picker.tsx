"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Search, X, Loader2 } from "lucide-react";

export interface TargetOption {
  id: string;
  label: string;
  sublabel?: string;
}

export function TargetPicker({
  kind,
  value,
  onSelect,
  placeholder,
}: {
  kind: "project" | "task";
  value: TargetOption | null;
  onSelect: (option: TargetOption | null) => void;
  placeholder: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<TargetOption[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/documents/targets?q=${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (cancelled) return;
        const opts: TargetOption[] =
          kind === "project"
            ? (data.projects ?? []).map((p: { id: string; name: string; code: string }) => ({
                id: p.id,
                label: p.name,
                sublabel: p.code,
              }))
            : (data.tasks ?? []).map((t: { id: string; title: string; project: { name: string } | null }) => ({
                id: t.id,
                label: t.title,
                sublabel: t.project?.name,
              }));
        setOptions(opts);
      } catch {
        if (!cancelled) setOptions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [query, open, kind]);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  if (value) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-[10px] border border-border bg-surface px-3 h-9">
        <div className="min-w-0 truncate text-[13.5px]">
          <span className="font-medium">{value.label}</span>
          {value.sublabel && <span className="text-muted-2"> · {value.sublabel}</span>}
        </div>
        <button
          type="button"
          onClick={() => onSelect(null)}
          className="shrink-0 rounded-full p-1 text-muted hover:bg-black/[0.05] dark:hover:bg-white/[0.08]"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-2" />
        <Input
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          placeholder={placeholder}
          className="pl-8"
        />
      </div>
      {open && (
        <div className="absolute z-40 mt-1.5 max-h-64 w-full overflow-y-auto rounded-[12px] border border-border bg-surface p-1.5 shadow-[var(--shadow-md)]">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-4 text-[12.5px] text-muted">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching…
            </div>
          ) : options.length === 0 ? (
            <p className="px-2.5 py-3 text-[12.5px] text-muted">No matches</p>
          ) : (
            options.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  onSelect(opt);
                  setOpen(false);
                  setQuery("");
                }}
                className={cn(
                  "flex w-full flex-col items-start rounded-[8px] px-2.5 py-2 text-left transition-colors",
                  "hover:bg-black/[0.05] dark:hover:bg-white/[0.08]"
                )}
              >
                <span className="text-[13px] font-medium text-foreground">{opt.label}</span>
                {opt.sublabel && <span className="text-[11.5px] text-muted-2">{opt.sublabel}</span>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
