import { cn } from "@/lib/utils";
import { formatMoney, getFlexibleBudgetThisWeek, getIncomeEntryCount, getIncomeThisWeek, getSafeStatus, getSafeToSpend } from "@/lib/calc";

const statusMap = {
  safe: { text: "On track", dot: "bg-safe", label: "text-safe" },
  caution: { text: "Ease off", dot: "bg-warn", label: "text-warn" },
  danger: { text: "Over budget", dot: "bg-danger", label: "text-danger" },
};

export function SafeToSpendCard() {
  const safe = getSafeToSpend();
  const s = statusMap[getSafeStatus()];
  return (
    <div className="glass relative overflow-hidden rounded-[20px] p-6 sm:p-7">
      <div className="slab-a pointer-events-none absolute inset-y-0 right-0 w-2/3 origin-top-right translate-x-1/4 rotate-[16deg] border-0" />
      <div className="relative flex flex-wrap items-start justify-between gap-6">
        <div>
          <div className="label-caps">Safe to spend this week</div>
          <div className="mt-2 font-display text-[clamp(2.8rem,8vw,4.5rem)] font-bold leading-none">{formatMoney(safe)}</div>
          <div className="mt-3 flex items-center gap-2">
            <span className={cn("glow-pulse inline-block h-2 w-2 rounded-full", s.dot)} />
            <span className={cn("text-[13px]", s.label)}>{s.text} · {formatMoney(safe)} of {formatMoney(getFlexibleBudgetThisWeek())} flexible left</span>
          </div>
        </div>
        <div className="sm:text-right">
          <div className="label-caps">Income logged</div>
          <div className="mt-1 font-display text-2xl font-semibold">{formatMoney(getIncomeThisWeek())}</div>
          <div className="mt-1 text-[12px] text-muted-foreground">{getIncomeEntryCount()} entries this week</div>
        </div>
      </div>
    </div>
  );
}
