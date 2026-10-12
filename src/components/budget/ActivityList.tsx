import { format, parseISO } from "date-fns";
import { useState } from "react";
import type { Category } from "@/lib/types";
import type { ThisWeekView, WeekActivityItem } from "@/lib/selectors";
import { formatMoney } from "@/lib/format";
import { Panel } from "./Panel";

export function ActivityList({
  week,
  currency,
  categories,
  isDemo,
  onEdit,
  onDelete,
}: {
  week: ThisWeekView;
  currency: string;
  categories: Category[];
  isDemo: boolean;
  onEdit: (item: WeekActivityItem) => void;
  onDelete: (item: WeekActivityItem) => void;
}) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const nameOf = (item: WeekActivityItem): string => {
    if (item.kind === "income") return item.note.trim() || "Income";
    return (
      item.note.trim() ||
      categories.find((category) => category.id === item.categoryId)?.name ||
      "Spending"
    );
  };

  return (
    <Panel
      title="This week's activity"
      action={
        <a
          href="/history"
          className="text-[12px] text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          All history
        </a>
      }
    >
      <ul className="flex flex-col gap-1">
        {week.activity.map((item) => {
          const label =
            item.kind === "income"
              ? "Income"
              : (categories.find((category) => category.id === item.categoryId)?.name ?? "");
          const signed = item.kind === "income" ? item.amount : -item.amount;
          const name = nameOf(item);
          const confirming = confirmingId === item.id;
          return (
            <li key={item.id} className="rounded-[10px] px-2 py-2 hover:bg-muted">
              <div className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 sm:grid-cols-[2.5rem_minmax(0,1fr)_7rem_auto]">
                <span className="text-[12px] text-muted-foreground">
                  {format(parseISO(item.date), "EEE")}
                </span>
                <span className="truncate text-[13px]">{item.note}</span>
                <span className="hidden text-[12px] text-muted-foreground sm:block">{label}</span>
                <span
                  className={`font-mono text-right text-[13px] ${signed > 0 ? "text-safe" : ""}`}
                >
                  {formatMoney(signed, currency, { cents: true, sign: true })}
                </span>
              </div>
              {!isDemo && (
                <div className="mt-1 flex flex-wrap items-center gap-3 pl-[2.5rem] text-[12px]">
                  {confirming ? (
                    <>
                      <span className="text-muted-foreground">
                        Delete "{name}" ({formatMoney(item.amount, currency, { cents: true })})?
                      </span>
                      <button
                        type="button"
                        className="font-medium text-danger"
                        onClick={() => {
                          onDelete(item);
                          setConfirmingId(null);
                        }}
                      >
                        Confirm delete
                      </button>
                      <button
                        type="button"
                        className="text-muted-foreground"
                        onClick={() => setConfirmingId(null)}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground"
                        aria-label={`Edit ${name}`}
                        onClick={() => onEdit(item)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="text-danger hover:underline"
                        aria-label={`Delete ${name}`}
                        onClick={() => setConfirmingId(item.id)}
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
