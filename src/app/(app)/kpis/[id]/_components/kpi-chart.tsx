"use client";

import { LineChart, Line, XAxis, YAxis, ReferenceLine, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { formatDateShort } from "@/lib/utils";

export function KpiChart({
  records,
  target,
  unit,
  tone,
}: {
  records: { value: number; periodEnd: string | Date }[];
  target: number;
  unit: string;
  tone: "success" | "warning" | "danger" | "neutral";
}) {
  const color =
    tone === "success" ? "var(--success)" : tone === "warning" ? "var(--warning)" : tone === "danger" ? "var(--danger)" : "var(--accent)";

  const data = records.map((r) => ({ value: r.value, label: formatDateShort(r.periodEnd) }));

  if (data.length === 0) {
    return <div className="flex h-64 items-center justify-center text-[13px] text-muted">No readings logged yet.</div>;
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border-soft)" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "var(--muted-2)" }}
            axisLine={{ stroke: "var(--border)" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--muted-2)" }}
            axisLine={false}
            tickLine={false}
            width={40}
            unit={unit ? ` ${unit}` : ""}
          />
          <Tooltip
            contentStyle={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              fontSize: 12.5,
              boxShadow: "var(--shadow-md)",
            }}
            labelStyle={{ color: "var(--muted)", marginBottom: 4 }}
          />
          <ReferenceLine y={target} stroke="var(--muted-2)" strokeDasharray="4 4" label={{ value: "target", fontSize: 11, fill: "var(--muted-2)", position: "insideTopLeft" }} />
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={{ r: 3, fill: color, strokeWidth: 0 }} activeDot={{ r: 5 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
