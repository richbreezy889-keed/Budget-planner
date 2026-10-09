import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format";
import {
  bills,
  categories,
  currentWeek,
  goals,
  incomeEntries,
  settings,
  transactions,
} from "@/lib/mockData";
import { flexibleBudgetForWeek, incomeForWeek, safeStatus, safeToSpend } from "@/lib/calc";

const statusMap = {
  safe: { text: "On track", dot: "bg-safe", label: "text-safe" },
  caution: { text: "Ease off", dot: "bg-warn", label: "text-warn" },
  danger: { text: "Over budget", dot: "bg-danger", label: "text-danger" },
};

export function SafeToSpendCard() {
  const cur = settings.currency;
  const safe = safeToSpend(settings, incomeEntries, transactions, categories, bills, goals);
  const flex = flexibleBudgetForWeek(categories);
  const s = statusMap[safeStatus(safe, flex)];
  return (
    <div className="glass relative overflow-hidden rounded-[20px] p-6 sm:p-7">
      <div className="relative flex flex-wrap items-start justify-between gap-6">
        <div>
          <div className="label-caps">Safe to spend this week</div>
          <div className="mt-2 font-display text-[clamp(2.8rem,8vw,4.5rem)] font-bold leading-none">
            {formatMoney(safe, cur)}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className={cn("glow-pulse inline-block h-2 w-2 rounded-full", s.dot)} />
            <span className={cn("text-[13px]", s.label)}>
              {s.text} · {formatMoney(safe, cur)} of {formatMoney(flex, cur)} flexible left
            </span>
          </div>
        </div>
        <div className="sm:text-right">
          <div className="label-caps">Income logged</div>
          <div className="mt-1 font-display text-2xl font-semibold">
            {formatMoney(incomeForWeek(incomeEntries, currentWeek.start), cur)}
          </div>
          <div className="mt-1 text-[12px] text-muted-foreground">
            {incomeEntries.length} entries this week
          </div>
        </div>
      </div>
    </div>
  );
}
