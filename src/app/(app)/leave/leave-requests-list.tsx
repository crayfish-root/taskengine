"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SegmentedControl } from "@/components/ui/tabs";
import { formatDate } from "@/lib/utils";
import { LEAVE_STATUS, LEAVE_TYPE } from "@/lib/status";
import { ClipboardList } from "lucide-react";
import type { LeaveRequestDTO } from "./types";

const FILTERS = [
  { label: "Pending", value: "PENDING" },
  { label: "Approved", value: "APPROVED" },
  { label: "Rejected", value: "REJECTED" },
  { label: "All", value: "ALL" },
];

export function LeaveRequestsList({
  leaveRequests,
  currentUserId,
  canApprove,
}: {
  leaveRequests: LeaveRequestDTO[];
  currentUserId: string;
  canApprove: (userId: string) => boolean;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState("PENDING");
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = useMemo(
    () => leaveRequests.filter((l) => (filter === "ALL" ? l.status !== "CANCELLED" : l.status === filter)),
    [leaveRequests, filter]
  );

  async function act(id: string, action: "approve" | "reject" | "cancel") {
    setBusyId(id);
    try {
      const res = await fetch(`/api/leave/${id}/${action}`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        alert(body.error || "Action failed");
        return;
      }
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="mb-4">
        <SegmentedControl options={FILTERS} value={filter} onChange={setFilter} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No requests here" description="Nothing matches this filter right now." />
      ) : (
        <div className="space-y-2">
          {filtered.map((l) => {
            const backups: string[] = l.backupUserIds ? safeParse(l.backupUserIds) : [];
            const mayApprove = l.status === "PENDING" && canApprove(l.userId) && l.userId !== currentUserId;
            const mayCancel = l.status === "PENDING" && l.userId === currentUserId;
            return (
              <div key={l.id} className="rounded-[var(--radius-lg)] border border-border bg-surface p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <Avatar name={l.user.name} color={l.user.avatarColor} emoji={l.user.avatarEmoji} size="sm" />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[13.5px] font-semibold">{l.user.name}</p>
                        <Badge tone="neutral">{LEAVE_TYPE[l.type]?.label ?? l.type}</Badge>
                        <StatusBadge map={LEAVE_STATUS} value={l.status} />
                      </div>
                      <p className="mt-1 text-[12.5px] text-muted">
                        {formatDate(l.startDate)} – {formatDate(l.endDate)}
                        {l.halfDay ? " · Half day" : ""}
                      </p>
                      {l.reason && <p className="mt-1.5 text-[13px] text-foreground/90 max-w-lg">{l.reason}</p>}
                      {backups.length > 0 && <p className="mt-1.5 text-[11.5px] text-muted-2">Backup requested: {backups.length} teammate{backups.length > 1 ? "s" : ""}</p>}
                      {l.approver && l.status !== "PENDING" && (
                        <p className="mt-1 text-[11.5px] text-muted-2">
                          {l.status === "APPROVED" ? "Approved" : "Reviewed"} by {l.approver.name}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    {mayApprove && (
                      <>
                        <Button size="sm" variant="primary" disabled={busyId === l.id} onClick={() => act(l.id, "approve")}>
                          Approve
                        </Button>
                        <Button size="sm" variant="outline" disabled={busyId === l.id} onClick={() => act(l.id, "reject")}>
                          Reject
                        </Button>
                      </>
                    )}
                    {mayCancel && (
                      <Button size="sm" variant="ghost" disabled={busyId === l.id} onClick={() => act(l.id, "cancel")}>
                        Withdraw
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function safeParse(raw: string): string[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
