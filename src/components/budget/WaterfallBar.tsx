import { formatMoney } from "@/lib/format";
import { weeklyWaterfall, incomeForWeek, type AllocationKey } from "@/lib/calc";
import { bills, categories, currentWeek, goals, incomeEntries, settings } from "@/lib/mockData";
import { Panel } from "./Panel";

const shade: Record<AllocationKey, string> = {
  Essentials: "bg-essentials",
  Savings: "bg-savings",
  Goals: "bg-goals",
  Flexible: "bg-flexible",
  Buffer: "bg-buffer",
};

export function WaterfallBar() {
  const parts = weeklyWaterfall(
    incomeForWeek(incomeEntries, currentWeek.start),
    categories,
    bills,
    goals,
  );
  const total = parts.reduce((a, p) => a + p.amount, 0);
  return (
    <Panel title="Where this week's income goes">
      <div className="flex h-8 w-full overflow-hidden rounded-[10px] ring-1 ring-border">
        {parts.map((p) => (
          <div
            key={p.key}
            className={shade[p.key]}
            style={{ width: `${(p.amount / total) * 100}%` }}
            title={p.key}
          />
        ))}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-[12px] sm:grid-cols-5">
        {parts.map((p) => (
          <div key={p.key}>
            <div className={`mb-1 h-2 w-2 rounded-full ${shade[p.key]}`} />
            {p.key}
            <br />
            <span className="font-mono text-muted-foreground">
              {formatMoney(p.amount, settings.currency)}
            </span>
          </div>
        ))}
      </div>
    </Panel>
  );
}
