import { formatMoney } from "@/lib/format";
import type { ThisWeekView } from "@/lib/selectors";
import { Panel } from "./Panel";

interface ShadeParts {
  key: string;
  amount: number;
  shade: string;
}

export function WaterfallBar({ week, currency }: { week: ThisWeekView; currency: string }) {
  const parts: ShadeParts[] = [
    {
      key: "Essentials",
      amount: week.waterfall.allocated.essentials,
      shade: "bg-essentials",
    },
    { key: "Savings", amount: week.waterfall.allocated.savings, shade: "bg-savings" },
    { key: "Goals", amount: week.waterfall.allocated.goals, shade: "bg-goals" },
    { key: "Flexible", amount: week.waterfall.allocated.flexible, shade: "bg-flexible" },
    { key: "Buffer", amount: week.waterfall.buffer, shade: "bg-buffer" },
  ];
  const total = parts.reduce((sum, part) => sum + part.amount, 0);
  return (
    <Panel title="Where this week's income goes">
      <div className="flex h-8 w-full overflow-hidden rounded-[10px] ring-1 ring-border">
        {parts.map((part) => (
          <div
            key={part.key}
            className={part.shade}
            style={{ width: `${total === 0 ? 0 : (part.amount / total) * 100}%` }}
            title={part.key}
          />
        ))}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-[12px] sm:grid-cols-5">
        {parts.map((part) => (
          <div key={part.key}>
            <div className={`mb-1 h-2 w-2 rounded-full ${part.shade}`} />
            {part.key}
            <br />
            <span className="font-mono text-muted-foreground">
              {formatMoney(part.amount, currency)}
            </span>
          </div>
        ))}
      </div>
    </Panel>
  );
}
