import {
  LayoutDashboard,
  FolderKanban,
  ListChecks,
  Users,
  Network,
  Target,
  CalendarClock,
  CalendarOff,
  Flame,
  ShieldAlert,
  RefreshCw,
  FileText,
  Bell,
  Workflow,
  Building2,
  LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Workload", href: "/workload", icon: Flame },
    ],
  },
  {
    title: "Work",
    items: [
      { label: "Projects", href: "/projects", icon: FolderKanban },
      { label: "Tasks", href: "/tasks", icon: ListChecks },
      { label: "Blockers", href: "/blockers", icon: ShieldAlert },
    ],
  },
  {
    title: "People",
    items: [
      { label: "Org Chart", href: "/org", icon: Network },
      { label: "Users", href: "/org/users", icon: Users },
      { label: "Teams", href: "/org/teams", icon: Building2 },
      { label: "Leave", href: "/leave", icon: CalendarOff },
    ],
  },
  {
    title: "Tracking",
    items: [
      { label: "KPIs", href: "/kpis", icon: Target },
      { label: "Update Requests", href: "/updates", icon: RefreshCw },
      { label: "Workflows", href: "/workflows", icon: Workflow },
      { label: "Documents", href: "/documents", icon: FileText },
    ],
  },
];

export const NOTIFICATIONS_NAV: NavItem = { label: "Notifications", href: "/notifications", icon: Bell };
export const UPDATES_NAV = { label: "Scheduled Updates", href: "/updates", icon: CalendarClock };
