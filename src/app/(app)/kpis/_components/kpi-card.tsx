"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { KPI_FREQUENCY } from "@/lib/status";
import { readKpi } from "../_lib/kpi-math";
import { KpiSparkline } from "./kpi-sparkline";
import { LogReadingButton } from "./log-reading-modal";
import { TrendingUp, TrendingDown, Minus, ArrowRight } from "lucide-react";

export interface KpiCardData {
  id: string;
  name: string;
  unit: string;
  target: number;
  direction: "HIGHER_IS_BETTER" | "LOWER_IS_BETTER";
  frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY";
  department: { id: string; name: string; color: string } | null;
  project: { id: string; name: string; code: string } | null;
  owner: { id: string; name: string; avatarColor: string | null; avatarEmoji: string | null };
  records: { value: number; periodStart: string | Date; periodEnd: string | Date }[];
}

export function KpiCard({ kpi }: { kpi: KpiCardData }) {
  const reading = readKpi(kpi.records, kpi.target, kpi.direction);
  const scope = kpi.project ? `${kpi.project.code} · ${kpi.project.name}` : kpi.department ? kpi.department.name : "Organization-wide";

  const trendIcon =
    reading.trend === "up" ? TrendingUp : reading.trend === "down" ? TrendingDown : Minus;
  const TrendIcon = trendIcon;
  const trendTone =
    reading.improving == null ? "text-muted-2" : reading.improving ? "text-success" : "text-danger";

  const progressColor =
    reading.tone === "success" ? "var(--success)" : reading.tone === "warning" ? "var(--warning)" : reading.tone === "danger" ? "var(--danger)" : "var(--muted-2)";

  return (
    <Card className="flex flex-col p-5 gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={`/kpis/${kpi.id}`} className="text-[14.5px] font-semibold tracking-[-0.01em] hover:text-accent transition-colors truncate block">
            {kpi.name}
          </Link>
          <p className="mt-0.5 text-[12.5px] text-muted truncate">{scope}</p>
        </div>
        <Badge tone="neutral" className="shrink-0">
          {KPI_FREQUENCY[kpi.frequency]?.label ?? kpi.frequency}
        </Badge>
      </div>

      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-[26px] font-semibold tracking-[-0.02em] leading-none">
              {reading.current != null ? formatNumber(reading.current) : "—"}
            </span>
            {kpi.unit && <span className="text-[13px] text-muted">{kpi.unit}</span>}
          </div>
          <p className="mt-1 text-[12px] text-muted">
            target {formatNumber(kpi.target)}
            {kpi.unit ? ` ${kpi.unit}` : ""}
          </p>
        </div>
        <div className={`flex items-center gap-1 text-[12px] font-medium ${trendTone}`}>
          <TrendIcon className="h-3.5 w-3.5" />
          {reading.previous != null && reading.current != null
            ? `${Math.abs(reading.current - reading.previous) < 0.005 ? "0" : formatNumber(reading.current - reading.previous)}${kpi.unit}`
            : "no trend yet"}
        </div>
      </div>

      <Progress value={reading.progressPct} colorVar={progressColor} />

      <KpiSparkline
        data={kpi.records.map((r) => ({ value: r.value }))}
        target={kpi.target}
        tone={reading.tone}
      />

      <div className="flex items-center justify-between border-t border-border-soft pt-3.5">
        <div className="flex items-center gap-1.5">
          <Avatar name={kpi.owner.name} color={kpi.owner.avatarColor} emoji={kpi.owner.avatarEmoji} size="xs" />
          <span className="text-[12px] text-muted truncate max-w-[110px]">{kpi.owner.name}</span>
        </div>
        <div className="flex items-center gap-1">
          <LogReadingButton kpiId={kpi.id} unit={kpi.unit} />
          <Link
            href={`/kpis/${kpi.id}`}
            className="inline-flex items-center gap-1 rounded-[10px] px-2 py-1 text-[12.5px] font-medium text-muted hover:text-foreground transition-colors"
          >
            Details <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </Card>
  );
}

function formatNumber(n: number) {
  if (Number.isInteger(n)) return n.toLocaleString();
  return n.toLocaleString(undefined, { maximumFractionDigits: 1 });
}
