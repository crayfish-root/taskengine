"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { relativeTime, cn } from "@/lib/utils";
import { NOTIFICATION_TYPE } from "@/lib/status";
import { NotificationIcon } from "./notification-icon";
import { Badge } from "@/components/ui/badge";

export interface NotificationRowData {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  createdAt: string | Date;
}

export function NotificationRow({ notification }: { notification: NotificationRowData }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [read, setRead] = useState(notification.read);

  async function handleClick() {
    if (pending) return;
    setPending(true);
    if (!read) {
      setRead(true);
      try {
        await fetch(`/api/notifications/${notification.id}/read`, { method: "POST" });
        router.refresh();
      } catch {
        // best-effort — leave the row marked read locally
      }
    }
    if (notification.link) {
      router.push(notification.link);
    }
    setPending(false);
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        "flex w-full items-start gap-3 rounded-[12px] px-3 py-3 text-left transition-colors",
        "hover:bg-black/[0.03] dark:hover:bg-white/[0.05]",
        !read && "bg-accent-soft/40"
      )}
    >
      <NotificationIcon type={notification.type} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className={cn("text-[13.5px] leading-snug", !read ? "font-semibold text-foreground" : "font-medium text-foreground")}>
            {notification.title}
          </p>
          {!read && <span className="h-[6px] w-[6px] shrink-0 rounded-full bg-accent" />}
        </div>
        {notification.body && <p className="mt-0.5 text-[12.5px] text-muted line-clamp-2">{notification.body}</p>}
        <div className="mt-1 flex items-center gap-2">
          <Badge tone="neutral" className="px-2 py-0.5 text-[10.5px]">
            {NOTIFICATION_TYPE[notification.type]?.label ?? notification.type}
          </Badge>
          <span className="text-[11.5px] text-muted-2">{relativeTime(notification.createdAt)}</span>
        </div>
      </div>
    </button>
  );
}
