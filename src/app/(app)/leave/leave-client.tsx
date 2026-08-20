"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { AvatarStack } from "@/components/ui/avatar";
import { LeaveCalendar } from "./leave-calendar";
import { LeaveRequestsList } from "./leave-requests-list";
import { RequestLeaveModal } from "./request-modal";
import type { LeaveRequestDTO, LeaveUser } from "./types";

const VIEWS = [
  { label: "Calendar", value: "calendar" },
  { label: "Requests", value: "requests" },
];

export function LeaveHub({
  currentUser,
  users,
  leaveRequests,
  teammateIds,
  canApproveAll,
  reportIds,
}: {
  currentUser: { id: string; name: string };
  users: LeaveUser[];
  leaveRequests: LeaveRequestDTO[];
  teammateIds: string[];
  canApproveAll: boolean;
  reportIds: string[];
}) {
  const [view, setView] = useState("calendar");
  const [modalOpen, setModalOpen] = useState(false);

  const reportSet = useMemo(() => new Set(reportIds), [reportIds]);
  const canApprove = (userId: string) => canApproveAll || reportSet.has(userId);

  const backupCandidates = useMemo(() => {
    const ids = new Set(teammateIds.length ? teammateIds : users.filter((u) => u.managerId === users.find((x) => x.id === currentUser.id)?.managerId).map((u) => u.id));
    return users.filter((u) => ids.has(u.id) && u.id !== currentUser.id);
  }, [users, teammateIds, currentUser.id]);

  const onLeaveToday = useMemo(() => {
    const today = new Date();
    return leaveRequests.filter((l) => l.status === "APPROVED" && new Date(l.startDate) <= today && new Date(l.endDate) >= today);
  }, [leaveRequests]);

  const pendingForMe = useMemo(
    () => leaveRequests.filter((l) => l.status === "PENDING" && l.userId !== currentUser.id && (canApproveAll || reportSet.has(l.userId))),
    [leaveRequests, reportSet, canApproveAll, currentUser.id]
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <SegmentedControl options={VIEWS} value={view} onChange={setView} />
        <div className="flex items-center gap-2">
          {pendingForMe.length > 0 && (
            <button
              onClick={() => setView("requests")}
              className="text-[12.5px] font-medium text-warning rounded-full bg-warning-soft px-2.5 py-1 hover:brightness-95 transition"
            >
              {pendingForMe.length} awaiting your approval
            </button>
          )}
          <Button variant="primary" size="md" onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4" />
            Request leave
          </Button>
        </div>
      </div>

      {onLeaveToday.length > 0 && (
        <Card className="mb-5 bg-accent-soft border-accent/20">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3.5">
            <div className="flex items-center gap-3">
              <AvatarStack users={onLeaveToday.map((l) => l.user)} max={5} size="sm" />
              <p className="text-[13px] text-foreground">
                <span className="font-semibold">{onLeaveToday.length}</span> {onLeaveToday.length === 1 ? "person is" : "people are"} on leave today.
              </p>
            </div>
            <Link href="/workload#coverage" className="flex items-center gap-1.5 text-[12.5px] font-medium text-accent hover:underline">
              <Users className="h-3.5 w-3.5" />
              View coverage suggestions
            </Link>
          </CardContent>
        </Card>
      )}

      {view === "calendar" ? (
        <LeaveCalendar leaveRequests={leaveRequests} />
      ) : (
        <LeaveRequestsList leaveRequests={leaveRequests} currentUserId={currentUser.id} canApprove={canApprove} />
      )}

      <RequestLeaveModal open={modalOpen} onClose={() => setModalOpen(false)} backupCandidates={backupCandidates} />
    </div>
  );
}
