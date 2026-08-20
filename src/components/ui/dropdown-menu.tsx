"use client";

import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

export function DropdownMenu({
  trigger,
  children,
  align = "start",
}: {
  trigger: React.ReactNode;
  children: (close: () => void) => React.ReactNode;
  align?: "start" | "end";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div className="relative inline-block" ref={ref}>
      <div onClick={() => setOpen((v) => !v)}>{trigger}</div>
      {open && (
        <div
          className={cn(
            "absolute z-40 mt-1.5 min-w-[180px] rounded-[12px] border border-border bg-surface p-1.5 shadow-[var(--shadow-md)] animate-fade-in",
            align === "end" ? "right-0" : "left-0"
          )}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

export function MenuItem({
  className,
  danger,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { danger?: boolean }) {
  return (
    <button
      className={cn(
        "flex w-full items-center gap-2 rounded-[8px] px-2.5 py-2 text-left text-[13px] transition-colors",
        danger ? "text-danger hover:bg-danger-soft" : "text-foreground hover:bg-black/[0.05] dark:hover:bg-white/[0.08]",
        className
      )}
      {...props}
    />
  );
}
