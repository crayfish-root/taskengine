"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { NOTIFICATION_TYPE } from "@/lib/status";
import { CheckCheck } from "lucide-react";

export function TypeFilterSelect({ current }: { current: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  function onChange(value: string) {
    const params = new URLSearchParams();
    if (value !== "ALL") params.set("type", value);
    startTransition(() => {
      router.push(value === "ALL" ? pathname : `${pathname}?${params.toString()}`);
    });
  }

  return (
    <Select value={current} onChange={(e) => onChange(e.target.value)} className="w-[190px]">
      <option value="ALL">All types</option>
      {Object.entries(NOTIFICATION_TYPE).map(([key, meta]) => (
        <option key={key} value={key}>
          {meta.label}
        </option>
      ))}
    </Select>
  );
}

export function MarkAllReadButton({ hasUnread }: { hasUnread: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      await fetch("/api/notifications/mark-all-read", { method: "POST" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="secondary" size="sm" onClick={handleClick} disabled={!hasUnread || loading}>
      <CheckCheck className="h-3.5 w-3.5" />
      Mark all read
    </Button>
  );
}
