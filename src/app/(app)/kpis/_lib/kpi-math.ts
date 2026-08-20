// Small, self-contained helpers for interpreting Kpi + KpiRecord data.
// Kept local to the KPI feature so it never touches shared /lib files.

export type KpiDirection = "HIGHER_IS_BETTER" | "LOWER_IS_BETTER";
export type KpiFrequency = "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY";

export interface KpiRecordLike {
  value: number;
  periodStart: Date | string;
  periodEnd: Date | string;
}

/** Sorts records ascending by periodEnd (oldest first) — the natural order for a trend chart. */
export function sortRecordsAsc<T extends KpiRecordLike>(records: T[]): T[] {
  return [...records].sort((a, b) => new Date(a.periodEnd).getTime() - new Date(b.periodEnd).getTime());
}

export interface KpiReading {
  current: number | null;
  previous: number | null;
  trend: "up" | "down" | "flat" | null;
  /** True when the trend is moving in the favorable direction for this KPI. */
  improving: boolean | null;
  /** 0-100+, how close current value is to (or past) target. */
  progressPct: number;
  /** True once the KPI is meeting or beating its target. */
  onTarget: boolean;
  tone: "success" | "warning" | "danger" | "neutral";
}

export function readKpi(records: KpiRecordLike[], target: number, direction: KpiDirection): KpiReading {
  const sorted = sortRecordsAsc(records);
  const last = sorted.at(-1) ?? null;
  const prev = sorted.at(-2) ?? null;
  const current = last ? last.value : null;
  const previous = prev ? prev.value : null;

  let trend: KpiReading["trend"] = null;
  let improving: boolean | null = null;
  if (current != null && previous != null) {
    if (current === previous) trend = "flat";
    else trend = current > previous ? "up" : "down";
    improving =
      trend === "flat" ? null : direction === "HIGHER_IS_BETTER" ? trend === "up" : trend === "down";
  }

  let progressPct = 0;
  let onTarget = false;
  if (current != null) {
    if (direction === "HIGHER_IS_BETTER") {
      progressPct = target > 0 ? (current / target) * 100 : current > 0 ? 100 : 0;
      onTarget = current >= target;
    } else {
      progressPct = current > 0 ? Math.min(100, (target / current) * 100) : target <= 0 ? 100 : 0;
      onTarget = current <= target;
    }
  }
  progressPct = Math.max(0, progressPct);

  const tone: KpiReading["tone"] =
    current == null ? "neutral" : onTarget ? "success" : progressPct >= 70 ? "warning" : "danger";

  return { current, previous, trend, improving, progressPct: Math.min(progressPct, 999), onTarget, tone };
}

/** Derives a sensible periodStart for a new reading given the KPI's cadence and a chosen periodEnd. */
export function derivePeriodStart(frequency: KpiFrequency, periodEnd: Date): Date {
  const end = new Date(periodEnd);
  switch (frequency) {
    case "DAILY":
      return new Date(end);
    case "WEEKLY": {
      const d = new Date(end);
      d.setDate(d.getDate() - 6);
      return d;
    }
    case "MONTHLY":
      return new Date(end.getFullYear(), end.getMonth(), 1);
    case "QUARTERLY": {
      const q = Math.floor(end.getMonth() / 3);
      return new Date(end.getFullYear(), q * 3, 1);
    }
  }
}
