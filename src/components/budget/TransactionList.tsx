import { format, parseISO } from "date-fns";
import { categories, incomeEntries, settings, transactions } from "@/lib/mockData";
import { formatMoney } from "@/lib/format";
import { Panel } from "./Panel";

interface Row {
  id: string;
  date: string;
  note: string;
  label: string;
  signed: number;
}

export function TransactionList() {
  const rows: Row[] = [
    ...incomeEntries.map((e) => ({
      id: e.id,
      date: e.date,
      note: e.note,
      label: "Income",
      signed: e.amount,
    })),
    ...transactions.map((t) => ({
      id: t.id,
      date: t.date,
      note: t.note,
      label: categories.find((c) => c.id === t.categoryId)?.name ?? "",
      signed: -t.amount,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <Panel title="This week's transactions">
      <ul className="flex flex-col gap-1">
        {rows.map((t) => (
          <li
            key={t.id}
            className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 rounded-[10px] px-2 py-2 hover:bg-muted sm:grid-cols-[2.5rem_minmax(0,1fr)_7rem_auto]"
          >
            <span className="text-[12px] text-muted-foreground">
              {format(parseISO(t.date), "EEE")}
            </span>
            <span className="truncate text-[13px]">{t.note}</span>
            <span className="hidden text-[12px] text-muted-foreground sm:block">{t.label}</span>
            <span className={`text-right text-[13px] ${t.signed > 0 ? "text-safe" : ""}`}>
              {formatMoney(t.signed, settings.currency, { cents: true, sign: true })}
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
