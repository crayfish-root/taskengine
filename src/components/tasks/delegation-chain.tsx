import { ChevronRight } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { levelLabel, relativeTime } from "@/lib/utils";

export interface ChainPerson {
  id: string;
  name: string;
  avatarColor: string;
  avatarEmoji: string | null;
  level?: string;
  title?: string | null;
}

export interface DelegationHop {
  to: ChainPerson;
  by: ChainPerson;
  createdAt: string | Date;
  note?: string | null;
}

export function DelegationChain({
  creator,
  hops,
}: {
  creator: ChainPerson;
  hops: DelegationHop[];
}) {
  const nodes: ChainPerson[] = [creator, ...hops.map((h) => h.to)];

  if (hops.length === 0) {
    return (
      <div className="flex items-center gap-2 text-[13px] text-muted">
        <Avatar name={creator.name} color={creator.avatarColor} emoji={creator.avatarEmoji} size="sm" />
        <span>
          Created by <span className="font-medium text-foreground">{creator.name}</span> — not yet delegated.
        </span>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-y-3">
        {nodes.map((n, i) => (
          <div key={`${n.id}-${i}`} className="flex items-center">
            {i > 0 && <ChevronRight className="mx-1.5 h-4 w-4 shrink-0 text-muted-2" />}
            <div className="flex items-center gap-2 rounded-full border border-border-soft bg-surface pl-1 pr-3 py-1">
              <Avatar name={n.name} color={n.avatarColor} emoji={n.avatarEmoji} size="xs" />
              <div className="leading-tight">
                <p className="text-[12.5px] font-medium">{n.name}</p>
                {n.level && <p className="text-[10px] text-muted-2">{levelLabel(n.level)}</p>}
              </div>
            </div>
          </div>
        ))}
        <Badge tone="accent" className="ml-2">
          {hops.length} hop{hops.length === 1 ? "" : "s"}
        </Badge>
      </div>
      <div className="mt-3 space-y-1.5 border-l border-border-soft pl-3">
        {hops.map((h, i) => (
          <p key={i} className="text-[11.5px] text-muted">
            <span className="font-medium text-foreground">{h.by.name}</span> delegated to{" "}
            <span className="font-medium text-foreground">{h.to.name}</span> · {relativeTime(h.createdAt)}
            {h.note ? ` — “${h.note}”` : ""}
          </p>
        ))}
      </div>
    </div>
  );
}
