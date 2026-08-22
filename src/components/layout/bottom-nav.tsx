"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ListChecks, FolderKanban, ShieldAlert, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { MoreSheet } from "./more-sheet";

const TABS = [
  { key: "dashboard", label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, match: (p: string) => p.startsWith("/dashboard") },
  { key: "tasks", label: "Tasks", href: "/tasks", icon: ListChecks, match: (p: string) => p.startsWith("/tasks") },
  { key: "projects", label: "Projects", href: "/projects", icon: FolderKanban, match: (p: string) => p.startsWith("/projects") },
  { key: "blockers", label: "Blockers", href: "/blockers", icon: ShieldAlert, match: (p: string) => p.startsWith("/blockers") },
] as const;

export function BottomNav({
  user,
}: {
  user: {
    name: string;
    title: string | null;
    level: string;
    avatarColor: string;
    avatarEmoji: string | null;
  };
}) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const activeTab = TABS.find((t) => t.match(pathname));

  return (
    <>
      <nav className="md:hidden fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-border bg-surface/90 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
        {TABS.map((tab) => {
          const active = tab.key === activeTab?.key;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.key}
              href={tab.href}
              className="flex-1 flex flex-col items-center justify-center gap-[3px] py-[7px] min-w-11"
            >
              <span
                className={cn(
                  "flex h-[26px] w-9 items-center justify-center rounded-[9px] transition-colors",
                  active ? "bg-accent-soft text-accent" : "text-muted-2"
                )}
              >
                <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
              </span>
              <span className={cn("text-[10.5px] font-medium", active ? "text-accent font-semibold" : "text-muted-2")}>
                {tab.label}
              </span>
            </Link>
          );
        })}
        <button
          onClick={() => setMoreOpen(true)}
          className="flex-1 flex flex-col items-center justify-center gap-[3px] py-[7px] min-w-11"
        >
          <span
            className={cn(
              "flex h-[26px] w-9 items-center justify-center rounded-[9px] transition-colors",
              !activeTab ? "bg-accent-soft text-accent" : "text-muted-2"
            )}
          >
            <MoreHorizontal className="h-[18px] w-[18px]" strokeWidth={2} />
          </span>
          <span className={cn("text-[10.5px] font-medium", !activeTab ? "text-accent font-semibold" : "text-muted-2")}>
            More
          </span>
        </button>
      </nav>

      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} user={user} />
    </>
  );
}
