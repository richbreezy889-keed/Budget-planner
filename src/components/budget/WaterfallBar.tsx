import type { WaterfallBucket } from "@/lib/calc";
import { formatMoney } from "@/lib/format";
import type { ThisWeekView } from "@/lib/selectors";
import { cn } from "@/lib/utils";
import { Panel } from "./Panel";

interface ShadeParts {
  key: string;
  amount: number;
  shade: string;
}

const buckets: { bucket: WaterfallBucket; key: string; shade: string }[] = [
  { bucket: "essentials", key: "Essentials", shade: "bg-essentials" },
  { bucket: "savings", key: "Savings", shade: "bg-savings" },
  { bucket: "goals", key: "Goals", shade: "bg-goals" },
  { bucket: "flexible", key: "Flexible", shade: "bg-flexible" },
];

export function WaterfallBar({ week, currency }: { week: ThisWeekView; currency: string }) {
  const parts: ShadeParts[] = [
    ...buckets.map(({ bucket, key, shade }) => ({
      key,
      amount: week.waterfall.allocated[bucket],
      shade,
    })),
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
      <table className="mt-4 w-full text-[12px]">
        <thead>
          <tr className="label-caps text-left">
            <th className="pb-2 font-normal">Bucket</th>
            <th className="pb-2 text-right font-normal">Planned</th>
            <th className="pb-2 text-right font-normal">Funded</th>
            <th className="pb-2 text-right font-normal">Short</th>
          </tr>
        </thead>
        <tbody>
          {buckets.map(({ bucket, key }) => {
            const short = week.waterfall.shortfall[bucket];
            return (
              <tr key={key} className="border-t">
                <td className="py-2">{key}</td>
                <td className="py-2 text-right font-mono">
                  {formatMoney(week.plan[bucket], currency)}
                </td>
                <td className="py-2 text-right font-mono">
                  {formatMoney(week.waterfall.allocated[bucket], currency)}
                </td>
                <td
                  className={cn(
                    "py-2 text-right font-mono",
                    short > 0 ? "text-warn" : "text-muted-foreground",
                  )}
                >
                  {formatMoney(short, currency)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Panel>
  );
}
