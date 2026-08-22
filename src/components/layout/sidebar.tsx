"use client";

import { NAV_SECTIONS } from "@/lib/nav";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark } from "@/components/ui/brand-mark";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-[232px] shrink-0 flex-col border-r border-border bg-surface/60 backdrop-blur-xl">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-accent text-white">
          <BrandMark className="h-4 w-4" />
        </div>
        <span className="text-[15px] font-semibold tracking-[-0.01em]">TaskEngine</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-6 space-y-6">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title}>
            <p className="px-2.5 mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-2">
              {section.title}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2.5 rounded-[9px] px-2.5 py-[7px] text-[13px] font-medium transition-colors",
                      active
                        ? "bg-accent-soft text-accent"
                        : "text-foreground/80 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] hover:text-foreground"
                    )}
                  >
                    <Icon className="h-[16px] w-[16px]" strokeWidth={2} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
