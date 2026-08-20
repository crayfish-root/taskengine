import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { TASK_STATUS } from "@/lib/status";
import { formatDate } from "@/lib/utils";

export interface StatusEventRow {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  note: string | null;
  createdAt: string | Date;
  by: { name: string; avatarColor: string; avatarEmoji: string | null };
}

export function StatusHistory({ events }: { events: StatusEventRow[] }) {
  if (events.length === 0) return <p className="text-[13px] text-muted">No status changes yet.</p>;
  return (
    <ol className="space-y-3">
      {events.map((e) => {
        const to = TASK_STATUS[e.toStatus] ?? { label: e.toStatus, tone: "neutral" as const };
        return (
          <li key={e.id} className="flex items-start gap-2.5">
            <Avatar name={e.by.name} color={e.by.avatarColor} emoji={e.by.avatarEmoji} size="xs" className="mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-[13px]">
                <span className="font-medium">{e.by.name}</span>{" "}
                {e.fromStatus ? (
                  <>
                    moved from <Badge tone={(TASK_STATUS[e.fromStatus] ?? { tone: "neutral" as const }).tone}>{TASK_STATUS[e.fromStatus]?.label ?? e.fromStatus}</Badge>{" "}
                    to <Badge tone={to.tone}>{to.label}</Badge>
                  </>
                ) : (
                  <>
                    set status to <Badge tone={to.tone}>{to.label}</Badge>
                  </>
                )}
              </p>
              {e.note && <p className="mt-0.5 text-[12px] text-muted">{e.note}</p>}
              <p className="mt-0.5 text-[11px] text-muted-2">{formatDate(e.createdAt)}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
