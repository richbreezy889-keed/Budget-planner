import { format, parseISO } from "date-fns";
import type { Category } from "@/lib/types";
import type { ThisWeekView } from "@/lib/selectors";
import { formatMoney } from "@/lib/format";
import { Panel } from "./Panel";

export function ActivityList({
  week,
  currency,
  categories,
}: {
  week: ThisWeekView;
  currency: string;
  categories: Category[];
}) {
  return (
    <Panel title="This week's activity">
      <ul className="flex flex-col gap-1">
        {week.activity.map((item) => {
          const label =
            item.kind === "income"
              ? "Income"
              : (categories.find((category) => category.id === item.categoryId)?.name ?? "");
          const signed = item.kind === "income" ? item.amount : -item.amount;
          return (
            <li
              key={item.id}
              className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 rounded-[10px] px-2 py-2 hover:bg-muted sm:grid-cols-[2.5rem_minmax(0,1fr)_7rem_auto]"
            >
              <span className="text-[12px] text-muted-foreground">
                {format(parseISO(item.date), "EEE")}
              </span>
              <span className="truncate text-[13px]">{item.note}</span>
              <span className="hidden text-[12px] text-muted-foreground sm:block">{label}</span>
              <span className={`font-mono text-right text-[13px] ${signed > 0 ? "text-safe" : ""}`}>
                {formatMoney(signed, currency, { cents: true, sign: true })}
              </span>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
