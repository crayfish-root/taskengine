const TONE_VARS: Record<string, string> = {
  neutral: "var(--muted-2)",
  accent: "var(--accent)",
  success: "var(--success)",
  warning: "var(--warning)",
  danger: "var(--danger)",
  info: "var(--info)",
};

export interface BreakdownSegment {
  key: string;
  label: string;
  value: number;
  tone: keyof typeof TONE_VARS;
}

/** A restrained horizontal composition bar with a labelled legend — used for status/severity breakdowns. */
export function StatusBreakdown({
  segments,
  emptyLabel = "Nothing to show yet",
}: {
  segments: BreakdownSegment[];
  emptyLabel?: string;
}) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);

  if (total === 0) {
    return <p className="text-[12.5px] text-muted-2">{emptyLabel}</p>;
  }

  const visible = segments.filter((s) => s.value > 0);

  return (
    <div>
      <div className="flex h-2 w-full gap-[2px]">
        {visible.map((s) => (
          <div
            key={s.key}
            className="h-full first:rounded-l-full last:rounded-r-full"
            style={{ width: `${(s.value / total) * 100}%`, background: TONE_VARS[s.tone] }}
            title={`${s.label}: ${s.value}`}
          />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {visible.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5 text-[12px] text-muted">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: TONE_VARS[s.tone] }} />
            {s.label}
            <span className="font-medium tabular-nums text-foreground">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
