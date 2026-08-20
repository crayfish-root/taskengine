"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";

export function TabLinks({
  tabs,
  active,
}: {
  tabs: { label: string; href: string; key: string }[];
  active: string;
}) {
  return (
    <div className="flex items-center gap-1 border-b border-border overflow-x-auto">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          className={cn(
            "relative whitespace-nowrap px-3.5 py-2.5 text-[13px] font-medium transition-colors",
            active === t.key ? "text-foreground" : "text-muted hover:text-foreground"
          )}
        >
          {t.label}
          {active === t.key && (
            <span className="absolute inset-x-3 -bottom-px h-[2px] rounded-full bg-accent" />
          )}
        </Link>
      ))}
    </div>
  );
}

export function SegmentedControl({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="inline-flex items-center rounded-[10px] bg-black/[0.04] dark:bg-white/[0.06] p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-[8px] px-3 py-1.5 text-[12.5px] font-medium transition-all",
            value === o.value
              ? "bg-surface shadow-[var(--shadow-xs)] text-foreground"
              : "text-muted hover:text-foreground"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
