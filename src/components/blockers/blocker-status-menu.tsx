"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Loader2 } from "lucide-react";
import { DropdownMenu, MenuItem } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { BLOCKER_STATUS } from "@/lib/status";
import { cn } from "@/lib/utils";

const STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED"] as const;

export function BlockerStatusMenu({ blockerId, status }: { blockerId: string; status: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const meta = BLOCKER_STATUS[status] ?? { label: status, tone: "neutral" as const };

  function apply(next: string) {
    if (next === status) return;
    startTransition(async () => {
      await fetch(`/api/blockers/${blockerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      router.refresh();
    });
  }

  return (
    <DropdownMenu
      trigger={
        <button type="button" disabled={pending} className="inline-flex items-center gap-1 hover:opacity-80 disabled:opacity-50">
          <Badge tone={meta.tone} dot>
            {meta.label}
          </Badge>
          {pending ? <Loader2 className="h-3 w-3 animate-spin text-muted" /> : <ChevronDown className="h-3 w-3 text-muted-2" />}
        </button>
      }
    >
      {(close) => (
        <div className="min-w-[140px]">
          {STATUSES.map((s) => (
            <MenuItem key={s} onClick={() => { close(); apply(s); }} className={cn(s === status && "font-semibold")}>
              {BLOCKER_STATUS[s].label}
            </MenuItem>
          ))}
        </div>
      )}
    </DropdownMenu>
  );
}
