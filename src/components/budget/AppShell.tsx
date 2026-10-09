import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { format, parseISO } from "date-fns";
import { navItems } from "./nav";
import { ThemeToggle } from "./ThemeToggle";
import { currentWeek } from "@/lib/mockData";

export function AppShell({ children }: { children: ReactNode }) {
  const range = `${format(parseISO(currentWeek.start), "EEE d MMM")} – ${format(parseISO(currentWeek.end), "EEE d MMM")}`;
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="ambient pointer-events-none fixed inset-0" />

      <div className="relative mx-auto max-w-[1200px] px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-10 lg:pt-8">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="glow-pulse grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-primary font-display text-lg font-extrabold text-primary-foreground">
              M
            </div>
            <div className="min-w-0">
              <div className="font-display font-bold leading-none tracking-tight">MNGS</div>
              <div className="mt-1 truncate text-[11px] text-muted-foreground">
                Week {currentWeek.number} · {range}
              </div>
            </div>
          </div>
          <ThemeToggle />
        </header>

        <div className="mt-8 grid gap-8 lg:grid-cols-[212px_1fr]">
          <aside className="hidden lg:block">
            <div className="glass sticky top-8 rounded-2xl p-3">
              <div className="label-caps px-3 pb-2">Navigate</div>
              <nav className="flex flex-col gap-1">
                {navItems.map((n) => (
                  <Link
                    key={n.to}
                    to={n.to}
                    activeOptions={{ exact: true }}
                    className="flex items-center gap-3 rounded-[10px] px-3 py-2 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
                    activeProps={{
                      className: "bg-accent text-accent-foreground! ring-1 ring-primary/25",
                    }}
                  >
                    <n.icon className="h-4 w-4 shrink-0" />
                    {n.label}
                  </Link>
                ))}
              </nav>
            </div>
          </aside>
          <main className="min-w-0">{children}</main>
        </div>
      </div>

      <nav className="glass fixed inset-x-3 bottom-3 z-20 grid grid-cols-6 rounded-2xl p-1.5 lg:hidden">
        {navItems.map((n) => (
          <Link
            key={n.to}
            to={n.to}
            activeOptions={{ exact: true }}
            className="flex flex-col items-center gap-1 rounded-xl py-2 text-[10px] text-muted-foreground"
            activeProps={{ className: "bg-accent text-accent-foreground!" }}
          >
            <n.icon className="h-4 w-4" />
            {n.short}
          </Link>
        ))}
      </nav>
    </div>
  );
}
