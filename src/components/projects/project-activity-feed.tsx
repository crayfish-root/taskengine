import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { TASK_STATUS } from "@/lib/status";
import { relativeTime } from "@/lib/utils";
import { ArrowRightLeft, ShieldAlert } from "lucide-react";

export type ActivityItem =
  | { kind: "status"; id: string; at: Date; by: { name: string; avatarColor: string; avatarEmoji: string | null }; taskTitle: string; toStatus: string }
  | { kind: "delegation"; id: string; at: Date; by: { name: string; avatarColor: string; avatarEmoji: string | null }; taskTitle: string; toName: string }
  | { kind: "blocker"; id: string; at: Date; by: { name: string; avatarColor: string; avatarEmoji: string | null }; title: string; severity: string };

export function ProjectActivityFeed({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) return <p className="text-[13px] text-muted">No activity yet.</p>;
  return (
    <ol className="space-y-4">
      {items.map((item) => (
        <li key={`${item.kind}-${item.id}`} className="flex items-start gap-3">
          <Avatar name={item.by.name} color={item.by.avatarColor} emoji={item.by.avatarEmoji} size="sm" className="mt-0.5" />
          <div className="min-w-0 flex-1">
            {item.kind === "status" && (
              <p className="text-[13px]">
                <span className="font-medium">{item.by.name}</span> moved{" "}
                <span className="font-medium">{item.taskTitle}</span> to{" "}
                <Badge tone={TASK_STATUS[item.toStatus]?.tone ?? "neutral"}>{TASK_STATUS[item.toStatus]?.label ?? item.toStatus}</Badge>
              </p>
            )}
            {item.kind === "delegation" && (
              <p className="flex items-center gap-1.5 text-[13px]">
                <ArrowRightLeft className="h-3.5 w-3.5 text-muted-2" />
                <span className="font-medium">{item.by.name}</span> delegated{" "}
                <span className="font-medium">{item.taskTitle}</span> to{" "}
                <span className="font-medium">{item.toName}</span>
              </p>
            )}
            {item.kind === "blocker" && (
              <p className="flex items-center gap-1.5 text-[13px]">
                <ShieldAlert className="h-3.5 w-3.5 text-danger" />
                <span className="font-medium">{item.by.name}</span> raised a blocker:{" "}
                <span className="font-medium">{item.title}</span>
              </p>
            )}
            <p className="mt-0.5 text-[11px] text-muted-2">{relativeTime(item.at)}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
