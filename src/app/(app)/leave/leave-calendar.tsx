"use client";

import { useMemo, useState } from "react";
import { addMonths, differenceInCalendarDays, eachDayOfInterval, endOfMonth, format, isSameDay, isWeekend, max as maxDate, min as minDate, startOfMonth } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { LEAVE_TYPE } from "@/lib/status";
import { LEAVE_TYPE_COLOR, type LeaveRequestDTO } from "./types";
import { CalendarOff } from "lucide-react";

interface Bar {
  requestId: string;
  type: string;
  status: string;
  leftPct: number;
  widthPct: number;
  title: string;
}

export function LeaveCalendar({ leaveRequests }: { leaveRequests: LeaveRequestDTO[] }) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));

  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const days = useMemo(() => eachDayOfInterval({ start: monthStart, end: monthEnd }), [monthStart, monthEnd]);
  const daysInMonth = days.length;

  const rows = useMemo(() => {
    const byUser = new Map<string, { user: LeaveRequestDTO["user"]; bars: Bar[] }>();
    for (const l of leaveRequests) {
      if (l.status !== "APPROVED" && l.status !== "PENDING") continue;
      const start = new Date(l.startDate);
      const end = new Date(l.endDate);
      if (end < monthStart || start > monthEnd) continue;

      const segStart = maxDate([start, monthStart]);
      const segEnd = minDate([end, monthEnd]);
      const dayIndexStart = differenceInCalendarDays(segStart, monthStart);
      const daySpan = differenceInCalendarDays(segEnd, segStart) + 1;

      if (!byUser.has(l.userId)) byUser.set(l.userId, { user: l.user, bars: [] });
      byUser.get(l.userId)!.bars.push({
        requestId: l.id,
        type: l.type,
        status: l.status,
        leftPct: (dayIndexStart / daysInMonth) * 100,
        widthPct: (daySpan / daysInMonth) * 100,
        title: `${l.user.name} — ${LEAVE_TYPE[l.type]?.label ?? l.type} (${format(start, "MMM d")}–${format(end, "MMM d")})${l.status === "PENDING" ? " · pending" : ""}`,
      });
    }
    return [...byUser.values()].sort((a, b) => a.user.name.localeCompare(b.user.name));
  }, [leaveRequests, monthStart, monthEnd, daysInMonth]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setMonth((m) => addMonths(m, -1))} aria-label="Previous month">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <p className="w-[130px] text-center text-[13.5px] font-semibold tracking-[-0.01em]">{format(month, "MMMM yyyy")}</p>
          <Button variant="ghost" size="icon" onClick={() => setMonth((m) => addMonths(m, 1))} aria-label="Next month">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="secondary" size="sm" onClick={() => setMonth(startOfMonth(new Date()))}>
            Today
          </Button>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={CalendarOff} title="No leave this month" description="Nobody has requested or been approved for time off in this period." />
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-border">
          <div
            className="relative min-w-[720px]"
            style={{ display: "grid", gridTemplateColumns: `188px repeat(${daysInMonth}, minmax(20px, 1fr))` }}
          >
            {/* weekend shading, spans all rows */}
            <div
              className="pointer-events-none"
              style={{
                gridColumn: `2 / -1`,
                gridRow: `1 / span ${rows.length + 1}`,
                display: "grid",
                gridTemplateColumns: `repeat(${daysInMonth}, 1fr)`,
              }}
            >
              {days.map((d) => (
                <div key={d.toISOString()} className={cn(isWeekend(d) && "bg-black/[0.025] dark:bg-white/[0.03]")} />
              ))}
            </div>

            {/* header row */}
            <div className="sticky left-0 z-10 bg-surface border-b border-r border-border" />
            {days.map((d, i) => (
              <div
                key={d.toISOString()}
                style={{ gridColumn: i + 2, gridRow: 1 }}
                className={cn(
                  "flex items-center justify-center border-b border-border py-1.5 text-[10.5px] font-medium text-muted-2",
                  isSameDay(d, new Date()) && "text-accent font-semibold"
                )}
              >
                {format(d, "d")}
              </div>
            ))}

            {rows.map((row, ri) => (
              <div key={row.user.id} className="contents">
                <div
                  style={{ gridColumn: 1, gridRow: ri + 2 }}
                  className="sticky left-0 z-10 flex items-center gap-2 border-b border-r border-border bg-surface px-3 py-2"
                >
                  <Avatar name={row.user.name} color={row.user.avatarColor} emoji={row.user.avatarEmoji} size="xs" />
                  <span className="truncate text-[12.5px] font-medium">{row.user.name}</span>
                </div>
                <div style={{ gridColumn: `2 / -1`, gridRow: ri + 2 }} className="relative border-b border-border py-2">
                  {row.bars.map((bar) => (
                    <div
                      key={bar.requestId}
                      title={bar.title}
                      className={cn("absolute top-1/2 h-4 -translate-y-1/2 rounded-full", bar.status === "PENDING" && "border border-dashed opacity-70")}
                      style={{
                        left: `${bar.leftPct}%`,
                        width: `max(6px, ${bar.widthPct}%)`,
                        background: bar.status === "APPROVED" ? LEAVE_TYPE_COLOR[bar.type] : "transparent",
                        borderColor: bar.status === "PENDING" ? LEAVE_TYPE_COLOR[bar.type] : undefined,
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
        {Object.entries(LEAVE_TYPE).map(([key, meta]) => (
          <div key={key} className="flex items-center gap-1.5 text-[12px] text-muted">
            <span className="h-2 w-2 rounded-full" style={{ background: LEAVE_TYPE_COLOR[key] }} />
            {meta.label}
          </div>
        ))}
        <div className="flex items-center gap-1.5 text-[12px] text-muted">
          <span className="h-2 w-2 rounded-full border border-dashed border-muted-2" />
          Pending
        </div>
      </div>
    </div>
  );
}
