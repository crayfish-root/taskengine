import { cn } from "@/lib/utils";

export function Progress({
  value,
  className,
  colorVar = "var(--accent)",
}: {
  value: number;
  className?: string;
  colorVar?: string;
}) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.1]", className)}>
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{ width: `${pct}%`, background: colorVar }}
      />
    </div>
  );
}
