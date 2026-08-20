"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/input";
import { formatDateShort, levelLabel } from "@/lib/utils";
import { PRIORITY, TASK_STATUS } from "@/lib/status";
import { LEAVE_TYPE_COLOR } from "../leave/types";

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  projectName: string | null;
  estimatedHours: number | null;
}

interface Cell {
  hours: number;
  intensity: number;
  onLeave: boolean;
  leaveType: string | null;
  tasks: Task[];
}

interface Row {
  user: { id: string; name: string; title: string | null; avatarColor: string; avatarEmoji: string | null; departmentId: string | null; level: string };
  cells: Cell[];
}

interface Week {
  start: string;
  end: string;
  label: string;
}

function cellBackground(intensity: number): string {
  if (intensity <= 0) return "transparent";
  if (intensity < 0.34) {
    const pct = 12 + (intensity / 0.34) * 28;
    return `color-mix(in srgb, var(--success) ${pct.toFixed(0)}%, var(--surface))`;
  }
  if (intensity < 0.67) {
    const pct = 28 + ((intensity - 0.34) / 0.33) * 32;
    return `color-mix(in srgb, var(--warning) ${pct.toFixed(0)}%, var(--surface))`;
  }
  const pct = 35 + Math.min(1, (intensity - 0.67) / 0.33) * 45;
  return `color-mix(in srgb, var(--danger) ${pct.toFixed(0)}%, var(--surface))`;
}

export function WorkloadHeatmap({
  weeks,
  rows,
  departments,
  teams,
  selectedDept,
  selectedTeam,
}: {
  weeks: Week[];
  rows: Row[];
  departments: { id: string; name: string }[];
  teams: { id: string; name: string; departmentId: string | null }[];
  selectedDept: string;
  selectedTeam: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selected, setSelected] = useState<{ row: Row; week: Week; cell: Cell } | null>(null);

  const visibleTeams = useMemo(
    () => (selectedDept ? teams.filter((t) => t.departmentId === selectedDept) : teams),
    [teams, selectedDept]
  );

  function updateFilter(key: "dept" | "team", value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    if (key === "dept") params.delete("team");
    router.push(`/workload?${params.toString()}`);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <p className="text-[13px] text-muted">Next {weeks.length} weeks · shaded by hours booked against a ~32h/week capacity</p>
        <div className="flex items-center gap-2">
          <Select className="w-[170px]" value={selectedDept} onChange={(e) => updateFilter("dept", e.target.value)}>
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
          <Select className="w-[170px]" value={selectedTeam} onChange={(e) => updateFilter("team", e.target.value)}>
            <option value="">All teams</option>
            {visibleTeams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-dashed border-border px-6 py-14 text-center text-[13.5px] text-muted">
          No one matches this filter.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-border">
          <div className="min-w-[760px]" style={{ display: "grid", gridTemplateColumns: `220px repeat(${weeks.length}, minmax(78px, 1fr))` }}>
            <div className="sticky left-0 z-10 bg-surface border-b border-r border-border" />
            {weeks.map((w, i) => (
              <div key={w.start} style={{ gridColumn: i + 2, gridRow: 1 }} className="border-b border-border py-2 text-center">
                <p className="text-[11px] font-medium text-muted-2">{w.label}</p>
              </div>
            ))}

            {rows.map((row, ri) => (
              <div key={row.user.id} className="contents">
                <div
                  style={{ gridColumn: 1, gridRow: ri + 2 }}
                  className="sticky left-0 z-10 flex items-center gap-2.5 border-b border-r border-border bg-surface px-3 py-2.5"
                >
                  <Avatar name={row.user.name} color={row.user.avatarColor} emoji={row.user.avatarEmoji} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-[12.5px] font-medium">{row.user.name}</p>
                    <p className="truncate text-[11px] text-muted-2">{row.user.title ?? levelLabel(row.user.level)}</p>
                  </div>
                </div>
                {row.cells.map((cell, wi) => (
                  <button
                    key={wi}
                    style={{ gridColumn: wi + 2, gridRow: ri + 2, background: cellBackground(cell.intensity) }}
                    onClick={() => setSelected({ row, week: weeks[wi], cell })}
                    className="relative border-b border-border m-[3px] rounded-[8px] transition-transform hover:scale-[1.04] hover:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                    title={`${row.user.name} · ${w(weeks[wi])} · ${cell.tasks.length} task${cell.tasks.length === 1 ? "" : "s"}${cell.onLeave ? " · on leave" : ""}`}
                  >
                    <div className="flex h-9 items-center justify-center">
                      {cell.tasks.length > 0 && <span className="text-[11px] font-semibold text-foreground/80">{cell.tasks.length}</span>}
                    </div>
                    {cell.onLeave && (
                      <div
                        className="pointer-events-none absolute inset-0 rounded-[8px]"
                        style={{
                          backgroundImage:
                            "repeating-linear-gradient(135deg, transparent, transparent 4px, color-mix(in srgb, var(--foreground) 14%, transparent) 4px, color-mix(in srgb, var(--foreground) 14%, transparent) 5px)",
                        }}
                      />
                    )}
                    {cell.onLeave && (
                      <span
                        className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full"
                        style={{ background: cell.leaveType ? LEAVE_TYPE_COLOR[cell.leaveType] : "var(--muted-2)" }}
                      />
                    )}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-muted">
        <span className="font-medium text-muted-2">Load:</span>
        <Legend color="var(--success)" label="Light" />
        <Legend color="var(--warning)" label="Moderate" />
        <Legend color="var(--danger)" label="Heavy" />
        <div className="flex items-center gap-1.5">
          <span
            className="h-3 w-3 rounded-[3px] border border-border"
            style={{
              backgroundImage:
                "repeating-linear-gradient(135deg, transparent, transparent 2px, color-mix(in srgb, var(--foreground) 20%, transparent) 2px, color-mix(in srgb, var(--foreground) 20%, transparent) 3px)",
            }}
          />
          On leave
        </div>
      </div>

      {selected && (
        <Modal open={!!selected} onClose={() => setSelected(null)} title={selected.row.user.name} description={`Week of ${formatDateShort(selected.week.start)} – ${formatDateShort(selected.week.end)}`} size="sm">
          <div className="space-y-3">
            {selected.cell.onLeave && (
              <div className="rounded-[10px] bg-accent-soft px-3 py-2 text-[12.5px] text-accent">
                On {selected.cell.leaveType ? LEAVE_TYPE_LABEL(selected.cell.leaveType) : "leave"} this week.
              </div>
            )}
            {selected.cell.tasks.length === 0 ? (
              <p className="text-[13px] text-muted">No tasks due this week.</p>
            ) : (
              <div className="space-y-2">
                {selected.cell.tasks.map((t) => (
                  <div key={t.id} className="rounded-[10px] border border-border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[13px] font-medium leading-snug">{t.title}</p>
                      <Badge tone={PRIORITY[t.priority]?.tone ?? "neutral"}>{PRIORITY[t.priority]?.label ?? t.priority}</Badge>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-muted">
                      <span>{TASK_STATUS[t.status]?.label ?? t.status}</span>
                      {t.projectName && <span>· {t.projectName}</span>}
                      {t.dueDate && <span>· Due {formatDateShort(t.dueDate)}</span>}
                      {t.estimatedHours != null && <span>· {t.estimatedHours}h</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="h-3 w-3 rounded-[3px]" style={{ background: `color-mix(in srgb, ${color} 55%, var(--surface))` }} />
      {label}
    </div>
  );
}

function w(week: Week) {
  return `${format(new Date(week.start), "MMM d")}–${format(new Date(week.end), "d")}`;
}

function LEAVE_TYPE_LABEL(type: string) {
  const labels: Record<string, string> = {
    ANNUAL: "annual leave",
    SICK: "sick leave",
    PUBLIC_HOLIDAY: "public holiday",
    UNPAID: "unpaid leave",
    OTHER: "leave",
  };
  return labels[type] ?? "leave";
}
