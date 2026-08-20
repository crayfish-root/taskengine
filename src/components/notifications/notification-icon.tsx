import {
  UserPlus,
  ArrowRightLeft,
  RefreshCw,
  AtSign,
  ShieldAlert,
  MessageSquare,
  CalendarOff,
  Target,
  Clock,
  Bell,
  LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const NOTIFICATION_ICONS: Record<string, LucideIcon> = {
  ASSIGNMENT: UserPlus,
  DELEGATION: ArrowRightLeft,
  STATUS_CHANGE: RefreshCw,
  MENTION: AtSign,
  BLOCKER: ShieldAlert,
  UPDATE_REQUEST: MessageSquare,
  LEAVE: CalendarOff,
  KPI: Target,
  DEADLINE: Clock,
  SYSTEM: Bell,
};

const NOTIFICATION_TONES: Record<string, string> = {
  ASSIGNMENT: "text-accent bg-accent-soft",
  DELEGATION: "text-accent bg-accent-soft",
  STATUS_CHANGE: "text-info bg-info-soft",
  MENTION: "text-accent bg-accent-soft",
  BLOCKER: "text-danger bg-danger-soft",
  UPDATE_REQUEST: "text-warning bg-warning-soft",
  LEAVE: "text-info bg-info-soft",
  KPI: "text-success bg-success-soft",
  DEADLINE: "text-warning bg-warning-soft",
  SYSTEM: "text-muted bg-black/[0.05] dark:bg-white/[0.08]",
};

export function NotificationIcon({ type, className }: { type: string; className?: string }) {
  const Icon = NOTIFICATION_ICONS[type] ?? Bell;
  const tone = NOTIFICATION_TONES[type] ?? NOTIFICATION_TONES.SYSTEM;
  return (
    <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", tone, className)}>
      <Icon className="h-[16px] w-[16px]" strokeWidth={2} />
    </div>
  );
}
