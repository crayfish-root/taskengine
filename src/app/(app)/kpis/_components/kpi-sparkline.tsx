"use client";

import { AreaChart, Area, ResponsiveContainer, ReferenceLine, YAxis } from "recharts";

export function KpiSparkline({
  data,
  target,
  tone,
}: {
  data: { value: number }[];
  target: number;
  tone: "success" | "warning" | "danger" | "neutral";
}) {
  const color =
    tone === "success" ? "var(--success)" : tone === "warning" ? "var(--warning)" : tone === "danger" ? "var(--danger)" : "var(--muted-2)";

  if (data.length === 0) {
    return <div className="h-12 w-full" />;
  }

  return (
    <div className="h-12 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={`spark-${tone}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.28} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <ReferenceLine y={target} stroke="var(--border)" strokeDasharray="3 3" />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.75}
            fill={`url(#spark-${tone})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
