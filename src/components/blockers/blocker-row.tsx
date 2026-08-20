import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { BlockerStatusMenu } from "./blocker-status-menu";
import { BLOCKER_SEVERITY } from "@/lib/status";
import { relativeTime } from "@/lib/utils";

export interface BlockerRowData {
  id: string;
  title: string;
  description: string | null;
  severity: string;
  status: string;
  createdAt: Date | string;
  task: { id: string; title: string } | null;
  project: { id: string; name: string; code: string } | null;
  raisedBy: { name: string; avatarColor: string; avatarEmoji: string | null };
  owner: { id: string; name: string; avatarColor: string; avatarEmoji: string | null } | null;
}

export function BlockerRow({ blocker, showLink = true }: { blocker: BlockerRowData; showLink?: boolean }) {
  const linkHref = blocker.task ? `/tasks/${blocker.task.id}` : blocker.project ? `/projects/${blocker.project.id}` : undefined;
  return (
    <div className="flex flex-col gap-2 border-b border-border-soft py-3 last:border-b-0 sm:flex-row sm:items-center sm:gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Badge tone={BLOCKER_SEVERITY[blocker.severity]?.tone ?? "neutral"}>
            {BLOCKER_SEVERITY[blocker.severity]?.label}
          </Badge>
          <p className="truncate text-[13.5px] font-medium">{blocker.title}</p>
        </div>
        {blocker.description && <p className="mt-0.5 truncate text-[12px] text-muted">{blocker.description}</p>}
        {showLink && linkHref && (
          <Link href={linkHref} className="mt-0.5 inline-block text-[11.5px] text-accent hover:underline">
            {blocker.task ? blocker.task.title : `${blocker.project?.code} · ${blocker.project?.name}`}
          </Link>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <div className="flex items-center gap-1.5" title={`Raised by ${blocker.raisedBy.name}`}>
          <Avatar name={blocker.raisedBy.name} color={blocker.raisedBy.avatarColor} emoji={blocker.raisedBy.avatarEmoji} size="xs" />
        </div>
        <span className="w-16 text-[11.5px] text-muted-2">{relativeTime(blocker.createdAt)}</span>
        <BlockerStatusMenu blockerId={blocker.id} status={blocker.status} />
      </div>
    </div>
  );
}
