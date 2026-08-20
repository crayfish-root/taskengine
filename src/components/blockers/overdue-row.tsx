import Link from "next/link";
import { Avatar, AvatarStack } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatDate, cn } from "@/lib/utils";

export interface OverdueTaskData {
  kind: "task";
  id: string;
  title: string;
  dueDate: Date | string;
  daysLate: number;
  project: { id: string; name: string; code: string } | null;
  assignments: { user: { id: string; name: string; avatarColor: string; avatarEmoji: string | null } }[];
}

export interface OverdueProjectData {
  kind: "project";
  id: string;
  title: string;
  dueDate: Date | string;
  daysLate: number;
  owner: { id: string; name: string; avatarColor: string; avatarEmoji: string | null };
}

export function OverdueRow({ item }: { item: OverdueTaskData | OverdueProjectData }) {
  const href = item.kind === "task" ? `/tasks/${item.id}` : `/projects/${item.id}`;
  return (
    <div className="flex flex-col gap-2 border-b border-border-soft py-3 last:border-b-0 sm:flex-row sm:items-center sm:gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Badge tone="danger">{item.kind === "task" ? "Overdue task" : "Overdue project"}</Badge>
          <Link href={href} className="truncate text-[13.5px] font-medium hover:text-accent transition-colors">
            {item.title}
          </Link>
        </div>
        {item.kind === "task" && item.project && (
          <p className="mt-0.5 truncate text-[11.5px] text-muted-2">{item.project.code} · {item.project.name}</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {item.kind === "task" ? (
          item.assignments.length > 0 ? (
            <AvatarStack users={item.assignments.map((a) => a.user)} max={3} size="xs" />
          ) : (
            <span className="text-[11px] text-muted-2">Unassigned</span>
          )
        ) : (
          <Avatar name={item.owner.name} color={item.owner.avatarColor} emoji={item.owner.avatarEmoji} size="xs" />
        )}
        <span className={cn("w-24 text-right text-[11.5px] font-medium text-danger")}>
          {item.daysLate}d late
        </span>
        <span className="w-20 text-right text-[11px] text-muted-2">{formatDate(item.dueDate)}</span>
      </div>
    </div>
  );
}
