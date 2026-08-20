"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Search } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ORG_LEVEL } from "@/lib/status";
import { cn } from "@/lib/utils";
import { filterOrgTree, type OrgTreeNode } from "../_lib/tree";

export function OrgChartClient({ roots, totalCount }: { roots: OrgTreeNode[]; totalCount: number }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => filterOrgTree(roots, query), [roots, query]);
  const searching = query.trim().length > 0;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-2" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a person, title, or department…"
            className="pl-9"
          />
        </div>
        <p className="shrink-0 text-[12.5px] text-muted-2">{totalCount} people</p>
      </div>

      {filtered.length === 0 ? (
        <p className="py-14 text-center text-[13px] text-muted">No one matches &ldquo;{query}&rdquo;.</p>
      ) : (
        <div className="space-y-0.5">
          {filtered.map((node) => (
            <OrgNode key={node.id} node={node} depth={0} forceOpen={searching} />
          ))}
        </div>
      )}
    </div>
  );
}

function OrgNode({ node, depth, forceOpen }: { node: OrgTreeNode; depth: number; forceOpen: boolean }) {
  const [manuallyOpen, setManuallyOpen] = useState(depth < 2);
  const hasChildren = node.children.length > 0;
  const open = forceOpen || manuallyOpen;

  return (
    <div>
      <div
        className={cn(
          "group relative flex items-center gap-1.5 py-0.5",
          depth > 0 &&
            "before:content-[''] before:absolute before:-left-5 before:top-1/2 before:h-px before:w-5 before:bg-border"
        )}
      >
        {hasChildren ? (
          <button
            onClick={() => setManuallyOpen((v) => !v)}
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-muted-2 transition-colors hover:bg-black/[0.05] dark:hover:bg-white/[0.08]"
            aria-label={open ? "Collapse branch" : "Expand branch"}
          >
            <ChevronRight className={cn("h-3.5 w-3.5 transition-transform duration-150", open && "rotate-90")} />
          </button>
        ) : (
          <span className="h-5 w-5 shrink-0" />
        )}

        <Link
          href={`/org/users/${node.id}`}
          className={cn(
            "flex flex-1 items-center gap-3 rounded-[12px] border border-transparent px-2.5 py-1.5 transition-colors hover:border-border hover:bg-black/[0.02] dark:hover:bg-white/[0.05]",
            !node.active && "opacity-50"
          )}
        >
          <Avatar name={node.name} color={node.avatarColor} emoji={node.avatarEmoji} size="sm" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <p className="truncate text-[13.5px] font-medium text-foreground">{node.name}</p>
              <StatusBadge map={ORG_LEVEL} value={node.level} dot={false} />
              {!node.active && <Badge tone="neutral">Inactive</Badge>}
            </div>
            <p className="truncate text-[12px] text-muted">
              {node.title ?? "—"}
              {node.departmentName ? ` · ${node.departmentName}` : ""}
            </p>
          </div>
          <div className="hidden shrink-0 items-center gap-5 text-right sm:flex">
            <div>
              <p className="text-[13px] font-semibold text-foreground">{node.downstreamCount}</p>
              <p className="text-[10px] uppercase tracking-wide text-muted-2">Reports</p>
            </div>
            <div>
              <p className="text-[13px] font-semibold text-foreground">{node.openTaskCount}</p>
              <p className="text-[10px] uppercase tracking-wide text-muted-2">Open tasks</p>
            </div>
          </div>
        </Link>
      </div>

      {hasChildren && open && (
        <div className="ml-[9px] border-l border-border pl-5">
          {node.children.map((child) => (
            <OrgNode key={child.id} node={child} depth={depth + 1} forceOpen={forceOpen} />
          ))}
        </div>
      )}
    </div>
  );
}
