import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { cn, relativeTime } from "@/lib/utils";
import { History } from "lucide-react";

export interface ActivityTimelineItem {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  meta?: string | null;
  createdAt: Date | string;
  user: {
    id: string;
    name: string;
    avatarColor?: string | null;
    avatarEmoji?: string | null;
  };
}

function formatMeta(meta?: string | null) {
  if (!meta) return null;
  try {
    const parsed = JSON.parse(meta);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const entries = Object.entries(parsed as Record<string, unknown>).filter(
        ([, v]) => v !== null && v !== undefined && v !== ""
      );
      if (entries.length === 0) return null;
      return entries
        .map(([k, v]) => `${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`)
        .join(" · ");
    }
    return String(parsed);
  } catch {
    return meta;
  }
}

const ENTITY_LABELS: Record<string, string> = {
  Task: "Task",
  Project: "Project",
  Blocker: "Blocker",
  LeaveRequest: "Leave",
  Kpi: "KPI",
  Document: "Document",
  Comment: "Comment",
  User: "User",
};

export function ActivityTimeline({
  items,
  showEntity = false,
  emptyLabel = "No activity yet",
}: {
  items: ActivityTimelineItem[];
  showEntity?: boolean;
  emptyLabel?: string;
}) {
  if (items.length === 0) {
    return <EmptyState icon={History} title={emptyLabel} description="Actions across the workspace will show up here." />;
  }

  return (
    <ol className="space-y-0">
      {items.map((item, i) => {
        const metaText = formatMeta(item.meta);
        return (
          <li key={item.id} className="relative flex gap-3 pb-5 last:pb-0">
            {i < items.length - 1 && (
              <span className="absolute left-[15px] top-8 bottom-0 w-px bg-border-soft" aria-hidden />
            )}
            <Avatar
              name={item.user.name}
              color={item.user.avatarColor}
              emoji={item.user.avatarEmoji}
              size="sm"
              className="mt-0.5 shrink-0"
            />
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-[13.5px] leading-snug">
                <span className="font-medium text-foreground">{item.user.name}</span>{" "}
                <span className="text-muted">{item.action}</span>
                {showEntity && (
                  <span className="text-muted-2"> · {ENTITY_LABELS[item.entityType] ?? item.entityType}</span>
                )}
              </p>
              {metaText && <p className="mt-0.5 truncate text-[12px] text-muted-2">{metaText}</p>}
              <p className={cn("mt-0.5 text-[11.5px] text-muted-2")}>{relativeTime(item.createdAt)}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
