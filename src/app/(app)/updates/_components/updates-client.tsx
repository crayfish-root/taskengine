"use client";

import { useState } from "react";
import { SegmentedControl } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { UPDATE_FREQUENCY } from "@/lib/status";
import { relativeTime, formatDate } from "@/lib/utils";
import { RespondButton } from "./respond-modal";
import { CalendarClock, AlertCircle } from "lucide-react";

interface Person {
  id: string;
  name: string;
  avatarColor: string | null;
  avatarEmoji: string | null;
}

interface RequestRow {
  id: string;
  title: string;
  question: string;
  frequency: keyof typeof UPDATE_FREQUENCY;
  active: boolean;
  nextDueAt: string | Date;
  project: { id: string; name: string; code: string } | null;
  task: { id: string; title: string } | null;
  responses: { id: string; message: string; createdAt: string | Date; responder: Person }[];
  requestedOf?: Person;
  requestedBy?: Person;
}

export function UpdatesClient({ made, ofMe }: { made: RequestRow[]; ofMe: RequestRow[] }) {
  const overdueCount = ofMe.filter((r) => r.active && new Date(r.nextDueAt) < new Date()).length;
  const [view, setView] = useState<"of" | "made">("of");

  return (
    <div>
      <div className="mb-5">
        <SegmentedControl
          value={view}
          onChange={(v) => setView(v as "of" | "made")}
          options={[
            { label: `Requests of me${overdueCount > 0 ? ` (${overdueCount} overdue)` : ""}`, value: "of" },
            { label: "Requests I've made", value: "made" },
          ]}
        />
      </div>

      {view === "of" ? (
        ofMe.length === 0 ? (
          <EmptyState icon={CalendarClock} title="Nobody is waiting on an update from you" description="Update requests colleagues send you will show up here." />
        ) : (
          <div className="space-y-3">
            {ofMe.map((r) => (
              <RequestCard key={r.id} r={r} person={r.requestedBy!} personLabel="from" respondable />
            ))}
          </div>
        )
      ) : made.length === 0 ? (
        <EmptyState icon={CalendarClock} title="You haven't requested any updates" description="Ask a colleague for a recurring status update to see it here." />
      ) : (
        <div className="space-y-3">
          {made.map((r) => (
            <RequestCard key={r.id} r={r} person={r.requestedOf!} personLabel="to" />
          ))}
        </div>
      )}
    </div>
  );
}

function RequestCard({
  r,
  person,
  personLabel,
  respondable,
}: {
  r: RequestRow;
  person: Person;
  personLabel: "from" | "to";
  respondable?: boolean;
}) {
  const overdue = r.active && new Date(r.nextDueAt) < new Date();
  const lastResponse = r.responses[0];
  const target = r.task ? r.task.title : r.project ? `${r.project.code} · ${r.project.name}` : null;

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <Avatar name={person.name} color={person.avatarColor} emoji={person.avatarEmoji} size="sm" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[13.5px] font-semibold">{r.title}</p>
              <Badge tone="neutral">{UPDATE_FREQUENCY[r.frequency]?.label ?? r.frequency}</Badge>
              {!r.active && <Badge tone="neutral">Paused</Badge>}
              {overdue && (
                <Badge tone="danger">
                  <AlertCircle className="h-3 w-3" /> Overdue
                </Badge>
              )}
            </div>
            <p className="mt-0.5 text-[12.5px] text-muted">
              {personLabel === "from" ? "Requested by " : "Requested of "}
              {person.name}
              {target ? ` · ${target}` : ""}
            </p>
            {lastResponse ? (
              <p className="mt-2 text-[13px] text-foreground/90 line-clamp-2">
                <span className="text-muted">{lastResponse.responder.name}: </span>
                {lastResponse.message}
              </p>
            ) : (
              <p className="mt-2 text-[13px] text-muted-2 italic">No responses yet</p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <p className={`text-[11.5px] ${overdue ? "text-danger font-medium" : "text-muted-2"}`}>
            {r.active ? `Due ${formatDate(r.nextDueAt)}` : "Inactive"}
          </p>
          {lastResponse && <p className="text-[11px] text-muted-2">{relativeTime(lastResponse.createdAt)}</p>}
          {respondable && r.active && <RespondButton requestId={r.id} question={r.question} />}
        </div>
      </div>
    </Card>
  );
}
