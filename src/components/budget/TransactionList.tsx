import { format, parseISO } from "date-fns";
import { categories, transactions } from "@/lib/mockData";
import { formatMoney } from "@/lib/calc";
import { Panel } from "./Panel";

export function TransactionList() {
  const catName = (id: string) => (id === "income" ? "Income" : categories.find((c) => c.id === id)?.name ?? "");
  return (
    <Panel title="This week's transactions">
      <ul className="flex flex-col gap-1">
        {[...transactions].reverse().map((t) => (
          <li key={t.id} className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 rounded-[10px] px-2 py-2 hover:bg-muted sm:grid-cols-[2.5rem_minmax(0,1fr)_7rem_auto]">
            <span className="text-[12px] text-muted-foreground">{format(parseISO(t.date), "EEE")}</span>
            <span className="truncate text-[13px]">{t.note}</span>
            <span className="hidden text-[12px] text-muted-foreground sm:block">{catName(t.categoryId)}</span>
            <span className={`text-right text-[13px] ${t.amount > 0 ? "text-safe" : ""}`}>{formatMoney(t.amount, { cents: true, sign: true })}</span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
