import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { format, parseISO } from "date-fns";
import { navItems } from "./nav";
import { ThemeToggle } from "./ThemeToggle";
import { buildShellBanners, type ShellBanner } from "./shellBanners";
import { Skeleton } from "@/components/ui/skeleton";
import { thisWeekView } from "@/lib/selectors";
import { useAppData } from "@/lib/store/context";
import { useAppView, type AppView } from "@/lib/store/useAppView";

const bannerTone: Record<ShellBanner["tone"], string> = {
  info: "bg-accent/60 text-accent-foreground",
  warn: "bg-warn/10 text-warn ring-1 ring-warn/30",
  danger: "bg-danger/10 text-danger ring-1 ring-danger/30",
};

function WeekRange({ view }: { view: AppView }) {
  const week = thisWeekView(view.data, view.today);
  const range = `${format(parseISO(week.weekStart), "EEE d MMM")} – ${format(parseISO(week.weekEnd), "EEE d MMM")}`;
  return <div className="mt-1 truncate text-[11px] text-muted-foreground">{range}</div>;
}

export function MainSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-hidden="true">
      <div className="glass rounded-[20px] p-6 sm:p-7">
        <Skeleton className="h-3 w-36" />
        <Skeleton className="mt-3 h-12 w-56 max-w-full" />
        <div className="mt-4 flex items-center gap-2">
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="glass rounded-2xl p-5 sm:p-6">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="mt-4 h-8 w-full rounded-[10px]" />
          <div className="mt-4 grid grid-cols-3 gap-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
        <div className="glass rounded-2xl p-5 sm:p-6">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-4 h-9 w-full" />
          <Skeleton className="mt-3 h-9 w-full" />
          <Skeleton className="mt-3 h-9 w-full" />
        </div>
      </div>
      <div className="glass rounded-2xl p-5 sm:p-6">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="mt-4 h-9 w-full" />
        <Skeleton className="mt-2 h-9 w-full" />
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const view = useAppView();
  const { storageStatus } = useAppData();
  const banners = buildShellBanners(view, storageStatus);

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="ambient pointer-events-none fixed inset-0" />

      <div className="relative mx-auto max-w-[1200px] px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-6 sm:px-6 lg:px-10 lg:pb-10 lg:pt-8">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="glow-pulse grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-primary font-display text-lg font-extrabold text-primary-foreground">
              M
            </div>
            <div className="min-w-0">
              <div className="font-display font-bold leading-none tracking-tight">MNGS</div>
              {view === null ? <Skeleton className="mt-1 h-3.5 w-40" /> : <WeekRange view={view} />}
            </div>
          </div>
          <ThemeToggle />
        </header>

        {banners.length > 0 && (
          <div className="mt-6 flex flex-col gap-2">
            {banners.map((banner) => (
              <div
                key={banner.message}
                className={`rounded-[10px] px-3 py-2 text-[12px] font-medium ${bannerTone[banner.tone]}`}
              >
                {banner.message}
              </div>
            ))}
          </div>
        )}

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
          <main className="min-w-0">{view === null ? <MainSkeleton /> : children}</main>
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
