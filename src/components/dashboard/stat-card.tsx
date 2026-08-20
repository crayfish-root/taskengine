import Link from "next/link";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const TONE_TEXT: Record<string, string> = {
  neutral: "text-foreground",
  accent: "text-accent",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
  info: "text-info",
};

export function StatCard({
  label,
  value,
  href,
  icon: Icon,
  tone = "neutral",
  hint,
}: {
  label: string;
  value: string | number;
  href?: string;
  icon?: LucideIcon;
  tone?: keyof typeof TONE_TEXT;
  hint?: string;
}) {
  const body = (
    <div className="group flex h-full items-start justify-between gap-3 rounded-[var(--radius-lg)] border border-border bg-surface p-5 transition-all duration-150 hover:border-border hover:shadow-[var(--shadow-sm)]">
      <div className="min-w-0">
        <p className="truncate text-[12.5px] font-medium text-muted">{label}</p>
        <p className={cn("mt-2 text-[26px] font-semibold tracking-[-0.02em] tabular-nums", TONE_TEXT[tone])}>
          {value}
        </p>
        {hint && <p className="mt-1 truncate text-[12px] text-muted-2">{hint}</p>}
      </div>
      {Icon && (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/[0.04] transition-colors group-hover:bg-black/[0.06] dark:bg-white/[0.06] dark:group-hover:bg-white/[0.1]">
          <Icon className="h-4 w-4 text-muted" strokeWidth={1.75} />
        </div>
      )}
    </div>
  );

  if (!href) return body;
  return (
    <Link
      href={href}
      className="block rounded-[var(--radius-lg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
    >
      {body}
    </Link>
  );
}
