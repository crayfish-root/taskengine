"use client";

import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface TrendPoint {
  date: string;
  done: number;
  total: number;
}

/** A quiet, single-hue burn-up trend: cumulative "done" area against a dashed "total" reference line. */
export function TrendChart({ data }: { data: TrendPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: "var(--muted-2)" }}
          axisLine={{ stroke: "var(--border)" }}
          tickLine={false}
        />
        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted-2)" }} axisLine={false} tickLine={false} width={30} />
        <Tooltip
          contentStyle={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            fontSize: 12,
            boxShadow: "var(--shadow-sm)",
          }}
          labelStyle={{ color: "var(--foreground)", fontWeight: 600, marginBottom: 2 }}
        />
        <Line
          type="monotone"
          dataKey="total"
          name="Total tasks"
          stroke="var(--muted-2)"
          strokeWidth={1.5}
          strokeDasharray="3 3"
          dot={false}
        />
        <Area
          type="monotone"
          dataKey="done"
          name="Done"
          stroke="var(--accent)"
          strokeWidth={2}
          fill="var(--accent-soft)"
          dot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
