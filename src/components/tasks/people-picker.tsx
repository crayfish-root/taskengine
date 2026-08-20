"use client";

import { useMemo, useState } from "react";
import { Search, Check } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { cn, levelLabel } from "@/lib/utils";

export interface PickablePerson {
  id: string;
  name: string;
  title?: string | null;
  level?: string;
  avatarColor?: string | null;
  avatarEmoji?: string | null;
  departmentId?: string | null;
}

export function PeoplePicker({
  people,
  selected,
  onToggle,
  multi = true,
  excludeIds = [],
  placeholder = "Search people…",
}: {
  people: PickablePerson[];
  selected: string[];
  onToggle: (id: string) => void;
  multi?: boolean;
  excludeIds?: string[];
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return people
      .filter((p) => !excludeIds.includes(p.id))
      .filter((p) => !q || p.name.toLowerCase().includes(q) || (p.title ?? "").toLowerCase().includes(q));
  }, [people, query, excludeIds]);

  return (
    <div>
      <div className="relative mb-2">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-2" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={placeholder} className="pl-8" />
      </div>
      <div className="max-h-[260px] overflow-y-auto rounded-[10px] border border-border">
        {filtered.length === 0 && <p className="px-3 py-4 text-center text-[12.5px] text-muted">No matches</p>}
        {filtered.map((p) => {
          const isSelected = selected.includes(p.id);
          return (
            <button
              type="button"
              key={p.id}
              onClick={() => onToggle(p.id)}
              className={cn(
                "flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.05]",
                "border-b border-border-soft last:border-b-0"
              )}
            >
              <Avatar name={p.name} color={p.avatarColor} emoji={p.avatarEmoji} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium">{p.name}</p>
                <p className="truncate text-[11.5px] text-muted">
                  {p.title ?? (p.level ? levelLabel(p.level) : "")}
                </p>
              </div>
              <div
                className={cn(
                  "flex h-[18px] w-[18px] shrink-0 items-center justify-center border",
                  multi ? "rounded-[5px]" : "rounded-full",
                  isSelected ? "border-accent bg-accent text-white" : "border-border text-transparent"
                )}
              >
                <Check className="h-3 w-3" strokeWidth={3} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
