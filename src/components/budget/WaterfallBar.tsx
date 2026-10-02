import { formatMoney, getWaterfall } from "@/lib/calc";
import { Panel } from "./Panel";

const shades = ["bg-primary", "bg-primary/70", "bg-primary/50", "bg-primary/30", "bg-sky/60"];

export function WaterfallBar() {
  const parts = getWaterfall();
  const total = parts.reduce((a, p) => a + p.amount, 0);
  return (
    <Panel title="Where this week's income goes">
      <div className="flex h-8 w-full overflow-hidden rounded-[10px] ring-1 ring-border">
        {parts.map((p, i) => (
          <div key={p.key} className={shades[i]} style={{ width: `${(p.amount / total) * 100}%` }} title={p.key} />
        ))}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-[12px] sm:grid-cols-5">
        {parts.map((p, i) => (
          <div key={p.key}>
            <div className={`mb-1 h-2 w-2 rounded-full ${shades[i]}`} />
            {p.key}<br /><span className="text-muted-foreground">{formatMoney(p.amount)}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}
