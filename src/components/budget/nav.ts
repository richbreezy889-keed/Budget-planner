import { CalendarDays, LifeBuoy, PieChart, Receipt, TrendingUp, Settings } from "lucide-react";

export const navItems = [
  { to: "/", label: "This Week", short: "Week", icon: CalendarDays },
  { to: "/buffer", label: "Buffer & Runway", short: "Buffer", icon: LifeBuoy },
  { to: "/budgets", label: "Budgets", short: "Budgets", icon: PieChart },
  { to: "/bills", label: "Bills & Goals", short: "Bills", icon: Receipt },
  { to: "/trends", label: "Trends", short: "Trends", icon: TrendingUp },
  { to: "/settings", label: "Settings", short: "Settings", icon: Settings },
] as const;
