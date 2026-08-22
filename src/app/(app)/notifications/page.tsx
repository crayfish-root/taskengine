import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { NotificationRow } from "@/components/notifications/notification-row";
import { TypeFilterSelect, MarkAllReadButton } from "@/components/notifications/notifications-toolbar";
import { formatDate } from "@/lib/utils";
import { Bell } from "lucide-react";
import { isToday, isYesterday } from "date-fns";
import type { NotificationType } from "@prisma/client";

const VALID_TYPES: NotificationType[] = [
  "ASSIGNMENT",
  "DELEGATION",
  "STATUS_CHANGE",
  "MENTION",
  "BLOCKER",
  "UPDATE_REQUEST",
  "LEAVE",
  "KPI",
  "DEADLINE",
  "SYSTEM",
];

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;

  const { type } = await searchParams;
  const typeFilter = type && VALID_TYPES.includes(type as NotificationType) ? (type as NotificationType) : undefined;

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id, ...(typeFilter ? { type: typeFilter } : {}) },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const unread = notifications.filter((n) => !n.read);
  const read = notifications.filter((n) => n.read);

  const groups = new Map<string, typeof read>();
  for (const n of read) {
    const key = isToday(n.createdAt) ? "Today" : isYesterday(n.createdAt) ? "Yesterday" : formatDate(n.createdAt);
    groups.set(key, [...(groups.get(key) ?? []), n]);
  }

  const totalUnread = await prisma.notification.count({
    where: { userId: user.id, read: false, ...(typeFilter ? { type: typeFilter } : {}) },
  });

  return (
    <div>
      <PageHeader
        eyebrow="Stay in the loop"
        title="Notifications"
        description="Assignments, delegations, status changes and everything else that needs your attention."
        actions={
          <div className="flex items-center gap-2">
            <TypeFilterSelect current={typeFilter ?? "ALL"} />
            <MarkAllReadButton hasUnread={totalUnread > 0} type={typeFilter} />
          </div>
        }
      />

      {notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="Nothing here yet"
          description={typeFilter ? "No notifications of this type." : "You're all caught up."}
        />
      ) : (
        <div className="space-y-6">
          {unread.length > 0 && (
            <section>
              <p className="mb-2 px-1 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-muted-2">
                New · {unread.length}
              </p>
              <Card>
                <CardContent className="p-2 divide-y divide-border-soft">
                  {unread.map((n) => (
                    <NotificationRow key={n.id} notification={n} />
                  ))}
                </CardContent>
              </Card>
            </section>
          )}

          {[...groups.entries()].map(([day, items]) => (
            <section key={day}>
              <p className="mb-2 px-1 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-muted-2">{day}</p>
              <Card>
                <CardContent className="p-2 divide-y divide-border-soft">
                  {items.map((n) => (
                    <NotificationRow key={n.id} notification={n} />
                  ))}
                </CardContent>
              </Card>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
