import {
  CalendarDays,
  History,
  LifeBuoy,
  PieChart,
  Receipt,
  Settings,
  TrendingUp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavTarget =
  "/" | "/history" | "/buffer" | "/budgets" | "/bills" | "/trends" | "/settings";

export interface NavItem {
  to: NavTarget;
  label: string;
  short: string;
  icon: LucideIcon;
  /** Shown in the desktop sidebar only, keeping the phone tab bar at six items. */
  desktopOnly?: boolean;
}

export const navItems: NavItem[] = [
  { to: "/", label: "This Week", short: "Week", icon: CalendarDays },
  { to: "/history", label: "History", short: "History", icon: History, desktopOnly: true },
  { to: "/buffer", label: "Buffer & Runway", short: "Buffer", icon: LifeBuoy },
  { to: "/budgets", label: "Budgets", short: "Budgets", icon: PieChart },
  { to: "/bills", label: "Bills & Goals", short: "Bills", icon: Receipt },
  { to: "/trends", label: "Trends", short: "Trends", icon: TrendingUp },
  { to: "/settings", label: "Settings", short: "Settings", icon: Settings },
];

/** The phone tab bar drops desktop-only entries so it stays a tidy six. */
export const tabBarItems = navItems.filter((item) => !item.desktopOnly);
