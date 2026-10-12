import { createFileRoute } from "@tanstack/react-router";
import { format, parseISO } from "date-fns";
import { useEffect, useMemo, useRef, useState } from "react";

import { MainSkeleton } from "@/components/budget/AppShell";
import { DeleteControl } from "@/components/budget/DeleteControl";
import { EmptyState, PageHeader, Panel } from "@/components/budget/Panel";
import { QuickAddForm, type EditingEntry } from "@/components/budget/QuickAddForm";
import { formatMoney } from "@/lib/format";
import {
  filterHistory,
  groupHistoryByWeek,
  historyEntries,
  type HistoryEntry,
  type HistoryTypeFilter,
} from "@/lib/selectors";
import { useAppData } from "@/lib/store/context";
import { useAppView } from "@/lib/store/useAppView";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "History — MNGS" },
      {
        name: "description",
        content: "Every income and spending entry, grouped by week.",
      },
      { property: "og:title", content: "History — MNGS" },
      { property: "og:description", content: "All your entries, grouped by week." },
    ],
  }),
  component: HistoryPage,
});

const field =
  "w-full rounded-[10px] bg-muted px-3 py-2.5 text-[13px] text-foreground ring-1 ring-border outline-none placeholder:text-muted-foreground focus:ring-primary/50 disabled:opacity-60";
const WEEKS_PER_PAGE = 12;

function weekTitle(weekStart: string, weekEnd: string): string {
  return `Week of ${format(parseISO(weekStart), "d MMM")} – ${format(parseISO(weekEnd), "d MMM yyyy")}`;
}

/** Scrolls an element into view, tolerating environments (like tests) without it. */
function scrollIntoView(element: Element | null | undefined): void {
  element?.scrollIntoView?.({ block: "center" });
}

export function HistoryPage() {
  const { dispatch } = useAppData();
  const view = useAppView();
  const [type, setType] = useState<HistoryTypeFilter>("all");
  const [categoryId, setCategoryId] = useState("all");
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(WEEKS_PER_PAGE);
  const [editing, setEditing] = useState<EditingEntry | null>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef(new Map<string, HTMLLIElement>());
  const editingRowId = useRef<string | null>(null);

  // Bring the edit form into view as soon as editing opens.
  useEffect(() => {
    if (editing) scrollIntoView(formRef.current);
  }, [editing]);

  const weeks = useMemo(() => {
    if (view === null) return [];
    const all = historyEntries(view.data);
    const filtered = filterHistory(all, { type, categoryId, query });
    return groupHistoryByWeek(filtered, view.data.settings.weekStartDay);
  }, [view, type, categoryId, query]);

  if (view === null) return <MainSkeleton />;
  const currency = view.data.settings.currency;
  const categories = view.data.categories;
  const shown = weeks.slice(0, visibleCount);

  const nameOf = (entry: HistoryEntry): string => {
    if (entry.kind === "income") return entry.note.trim() || "Income";
    return (
      entry.note.trim() ||
      categories.find((category) => category.id === entry.categoryId)?.name ||
      "Spending"
    );
  };

  const startEdit = (entry: HistoryEntry) => {
    if (entry.kind === "income") {
      const found = view.data.incomeEntries.find((row) => row.id === entry.id);
      if (found) {
        editingRowId.current = entry.id;
        setEditing({ kind: "income", entry: found });
      }
    } else {
      const found = view.data.transactions.find((row) => row.id === entry.id);
      if (found) {
        editingRowId.current = entry.id;
        setEditing({ kind: "spend", transaction: found });
      }
    }
  };

  // Close the form and return the reader to the row they were editing.
  const closeEdit = () => {
    const id = editingRowId.current;
    editingRowId.current = null;
    setEditing(null);
    scrollIntoView(rowRefs.current.get(id ?? ""));
  };

  const deleteEntry = (entry: HistoryEntry) => {
    dispatch(
      entry.kind === "income"
        ? { type: "deleteIncome", id: entry.id }
        : { type: "deleteTransaction", id: entry.id },
    );
  };

  return (
    <div>
      <PageHeader title="History" subtitle="Every entry, newest first, grouped by week." />

      {editing && !view.isDemo && (
        <div ref={formRef} className="mb-6">
          <QuickAddForm
            categories={categories}
            isDemo={view.isDemo}
            weekStartDay={view.data.settings.weekStartDay}
            today={view.today}
            editing={editing}
            onCancel={closeEdit}
          />
        </div>
      )}

      <Panel title="Filters">
        <div className="grid gap-3 sm:grid-cols-3">
          <select
            className={field}
            value={type}
            aria-label="Type"
            onChange={(event) => {
              const next = event.target.value as HistoryTypeFilter;
              setType(next);
              if (next === "income") setCategoryId("all");
            }}
          >
            <option value="all">All</option>
            <option value="income">Income</option>
            <option value="spend">Spend</option>
          </select>
          <select
            className={field}
            value={categoryId}
            aria-label="Category"
            disabled={type === "income"}
            onChange={(event) => setCategoryId(event.target.value)}
          >
            <option value="all">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <input
            className={field}
            value={query}
            placeholder="Search notes"
            aria-label="Search notes"
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </Panel>

      <div className="mt-6 flex flex-col gap-4">
        {shown.length === 0 && (
          <EmptyState
            title="No entries match these filters"
            hint="Try clearing a filter or search."
          />
        )}
        {shown.map((week) => (
          <Panel key={week.weekStart} title={weekTitle(week.weekStart, week.weekEnd)}>
            <ul className="flex flex-col gap-1">
              {week.entries.map((entry) => {
                const name = nameOf(entry);
                const label =
                  entry.kind === "income"
                    ? "Income"
                    : (categories.find((category) => category.id === entry.categoryId)?.name ?? "");
                const signed = entry.kind === "income" ? entry.amount : -entry.amount;
                return (
                  <li
                    key={entry.id}
                    ref={(element) => {
                      if (element) rowRefs.current.set(entry.id, element);
                      else rowRefs.current.delete(entry.id);
                    }}
                    className="rounded-[10px] px-2 py-2 hover:bg-muted"
                  >
                    <div className="grid grid-cols-[6rem_minmax(0,1fr)_auto] items-center gap-3 sm:grid-cols-[6rem_minmax(0,1fr)_7rem_auto]">
                      <span className="text-[12px] text-muted-foreground">
                        {format(parseISO(entry.date), "EEE d MMM")}
                      </span>
                      <span className="truncate text-[13px]">{entry.note}</span>
                      <span className="hidden text-[12px] text-muted-foreground sm:block">
                        {label}
                      </span>
                      <span
                        className={`font-mono text-right text-[13px] ${signed > 0 ? "text-safe" : ""}`}
                      >
                        {formatMoney(signed, currency, { cents: true, sign: true })}
                      </span>
                    </div>
                    {!view.isDemo && (
                      <div className="mt-1 flex flex-wrap items-center gap-3 pl-2 text-[12px]">
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-foreground"
                          aria-label={`Edit ${name}`}
                          onClick={() => startEdit(entry)}
                        >
                          Edit
                        </button>
                        <DeleteControl
                          name={name}
                          message={`Delete "${name}" (${formatMoney(entry.amount, currency, { cents: true })})?`}
                          onConfirm={() => deleteEntry(entry)}
                        />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </Panel>
        ))}
      </div>

      {weeks.length > visibleCount && (
        <div className="mt-6">
          <button
            type="button"
            className="rounded-[10px] bg-muted px-4 py-2 text-sm ring-1 ring-border hover:bg-muted/80"
            onClick={() => setVisibleCount((count) => count + WEEKS_PER_PAGE)}
          >
            Show more
          </button>
        </div>
      )}
    </div>
  );
}
