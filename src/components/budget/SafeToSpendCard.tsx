import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format";
import type { ThisWeekView } from "@/lib/selectors";

const statusMap = {
  safe: { text: "On track", dot: "bg-safe", label: "text-safe" },
  caution: { text: "Ease off", dot: "bg-warn", label: "text-warn" },
  danger: { text: "Over budget", dot: "bg-danger", label: "text-danger" },
};

export function SafeToSpendCard({ week, currency }: { week: ThisWeekView; currency: string }) {
  const s = statusMap[week.displayStatus];
  const statusText = week.isLean ? "Lean week" : s.text;
  return (
    <div className="glass relative overflow-hidden rounded-[20px] p-6 sm:p-7">
      <div className="relative flex flex-wrap items-start justify-between gap-6">
        <div>
          <div className="label-caps">Safe to spend this week</div>
          <div className="mt-2 font-mono text-[clamp(2.8rem,8vw,4.5rem)] font-bold leading-none">
            {formatMoney(week.safeToSpend, currency)}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className={cn("glow-pulse inline-block h-2 w-2 rounded-full", s.dot)} />
            <span className={cn("text-[13px]", s.label)}>
              {statusText} · {formatMoney(week.safeToSpend, currency)} of{" "}
              {formatMoney(week.flexibleBudget, currency)} flexible left
            </span>
          </div>
        </div>
        <div className="sm:text-right">
          <div className="label-caps">Income logged</div>
          <div className="mt-1 font-mono text-2xl font-semibold">
            {formatMoney(week.incomeLogged, currency)}
          </div>
          <div className="mt-1 text-[12px] text-muted-foreground">
            {week.incomeEntryCount} {week.incomeEntryCount === 1 ? "entry" : "entries"} this week
          </div>
        </div>
      </div>
    </div>
  );
}
