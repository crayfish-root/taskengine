"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { X, LogOut } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { NAV_SECTIONS } from "@/lib/nav";
import { cn, levelLabel } from "@/lib/utils";

export function MoreSheet({
  open,
  onClose,
  user,
}: {
  open: boolean;
  onClose: () => void;
  user: {
    name: string;
    title: string | null;
    level: string;
    avatarColor: string;
    avatarEmoji: string | null;
  };
}) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  if (!open || typeof document === "undefined") return null;

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return createPortal(
    <div className="md:hidden fixed inset-0 z-50 flex flex-col bg-surface animate-fade-in">
      <div className="flex items-center justify-between px-4 pt-[calc(env(safe-area-inset-top)+14px)] pb-2">
        <span className="text-[17px] font-semibold tracking-[-0.01em]">Menu</span>
        <button
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-black/[0.04] dark:bg-white/[0.08] text-foreground"
        >
          <X className="h-[17px] w-[17px]" strokeWidth={2.25} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-6">
        <div className="flex items-center gap-3 mx-2 my-2.5 p-3.5 rounded-[16px] bg-background">
          <Avatar name={user.name} color={user.avatarColor} emoji={user.avatarEmoji} size="lg" />
          <div>
            <p className="text-[14.5px] font-semibold">{user.name}</p>
            <p className="text-[12px] text-muted mt-0.5">
              {levelLabel(user.level)}
              {user.title ? ` · ${user.title}` : ""}
            </p>
          </div>
        </div>

        {NAV_SECTIONS.map((section) => (
          <div key={section.title}>
            <p className="px-3.5 mb-1.5 mt-4 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-2">
              {section.title}
            </p>
            <div>
              {section.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3.5 h-12 px-3 rounded-[12px] text-[13.5px] font-medium",
                      active ? "bg-accent-soft text-accent" : "text-foreground"
                    )}
                  >
                    <Icon className="h-[19px] w-[19px]" strokeWidth={2} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        <div className="h-px bg-border-soft mx-3.5 my-3.5" />
        <button
          onClick={logout}
          className="flex w-full items-center gap-3.5 h-12 px-3 rounded-[12px] text-[13.5px] font-medium text-danger"
        >
          <LogOut className="h-[19px] w-[19px]" strokeWidth={2} />
          Sign out
        </button>
      </div>
    </div>,
    document.body
  );
}
