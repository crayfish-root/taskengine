import { levelLabel } from "@/lib/utils";
import { Bell } from "lucide-react";
import Link from "next/link";
import { UserMenu } from "./user-menu";
import { prisma } from "@/lib/prisma";

export async function Topbar({
  user,
}: {
  user: {
    id: string;
    name: string;
    email: string;
    title: string | null;
    level: string;
    avatarColor: string;
    avatarEmoji: string | null;
  };
}) {
  const unread = await prisma.notification.count({ where: { userId: user.id, read: false } }).catch(() => 0);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface/70 px-5 backdrop-blur-xl">
      <div className="flex items-center gap-2 text-[13px] text-muted">
        <span className="font-medium text-foreground">{levelLabel(user.level)}</span>
        <span>·</span>
        <span>{user.title ?? "Team Member"}</span>
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/notifications"
          className="relative flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-black/[0.05] dark:hover:bg-white/[0.08] hover:text-foreground transition-colors"
        >
          <Bell className="h-[17px] w-[17px]" strokeWidth={2} />
          {unread > 0 && (
            <span className="absolute top-1 right-1 h-[7px] w-[7px] rounded-full bg-danger ring-2 ring-surface" />
          )}
        </Link>
        <UserMenu user={user} />
      </div>
    </header>
  );
}
