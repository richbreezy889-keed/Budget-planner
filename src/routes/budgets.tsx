import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MainSkeleton } from "@/components/budget/AppShell";
import { CategoryForm } from "@/components/budget/CategoryForm";
import { DeleteControl } from "@/components/budget/DeleteControl";
import { EmptyState, PageHeader, Panel, Progress } from "@/components/budget/Panel";
import { formatMoney } from "@/lib/format";
import { budgetsView } from "@/lib/selectors";
import { useAppData } from "@/lib/store/context";
import { appReducer } from "@/lib/store/reducer";
import { useAppView } from "@/lib/store/useAppView";
import type { Category, CategoryType } from "@/lib/types";

export const Route = createFileRoute("/budgets")({
  head: () => ({
    meta: [
      { title: "Budgets — MNGS" },
      {
        name: "description",
        content: "Planned amounts per category, shown weekly or monthly.",
      },
      { property: "og:title", content: "Budgets — MNGS" },
      { property: "og:description", content: "Recurring bills and savings goals at a glance." },
    ],
  }),
  component: BudgetsPage,
});

const groups: { type: CategoryType; label: string }[] = [
  { type: "essential", label: "Essential" },
  { type: "savings", label: "Savings" },
  { type: "flexible", label: "Flexible" },
];

export function BudgetsPage() {
  const { data, dispatch } = useAppData();
  const view = useAppView();
  const [editing, setEditing] = useState<Category | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (view === null) return <MainSkeleton />;
  const currency = view.data.settings.currency;
  const budgets = budgetsView(view.data, view.today);

  const removeCategory = (categoryId: string) => {
    const result = appReducer(data, { type: "deleteCategory", id: categoryId });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    dispatch({ type: "deleteCategory", id: categoryId });
    setError(null);
    if (editing?.id === categoryId) setEditing(null);
  };

  return (
    <div>
      <PageHeader
        title="Budgets"
        subtitle="Planned amounts per category, shown weekly or monthly."
      />
      {!view.isDemo && (
        <div className="mb-6">
          <CategoryForm editing={editing} onCancel={() => setEditing(null)} />
        </div>
      )}
      {error && (
        <p
          role="alert"
          className="mb-6 rounded-[10px] bg-danger/10 px-3 py-2 text-[13px] text-danger ring-1 ring-danger/30"
        >
          {error}
        </p>
      )}
      {view.data.categories.length === 0 ? (
        <EmptyState
          title="No budget categories yet"
          hint="Add a category to set an amount and period."
        />
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map((group) => (
            <Panel
              key={group.type}
              title={group.label}
              action={
                <span className="font-mono text-[12px] text-muted-foreground">
                  {formatMoney(budgets.totals[group.type], currency)}/week
                </span>
              }
            >
              <ul className="flex flex-col gap-5">
                {budgets.rows
                  .filter((row) => row.type === group.type)
                  .map((row) => {
                    const over = row.progress > 1;
                    const tone = over ? "danger" : row.progress >= 0.8 ? "warn" : "safe";
                    return (
                      <li key={row.categoryId}>
                        <div className="mb-2 flex items-baseline justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="truncate text-[14px]">{row.name}</span>
                            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                              {row.budgetPeriod}
                            </span>
                          </div>
                          <span className="text-right font-mono text-[13px]">
                            {formatMoney(row.spentInOwnPeriod, currency)}{" "}
                            <span className="text-muted-foreground">
                              / {formatMoney(row.plannedInOwnPeriod, currency)}
                            </span>
                            {row.budgetPeriod === "monthly" && (
                              <span className="block text-[11px] text-muted-foreground">
                                {formatMoney(row.plannedWeekly, currency)}/week
                              </span>
                            )}
                          </span>
                        </div>
                        <Progress value={row.progress} tone={tone} />
                        {over && (
                          <div className="mt-1 text-[12px] text-danger">
                            Over by {formatMoney(row.overBy, currency)}
                          </div>
                        )}
                        {row.drivenByBills && (
                          <div className="mt-1 text-[12px] text-muted-foreground">
                            Includes {row.billCount} {row.billCount === 1 ? "bill" : "bills"}
                          </div>
                        )}
                        {row.billsExceedBudget > 0 && (
                          <div className="mt-1 text-[12px] text-warn">
                            Bills exceed this budget by{" "}
                            {formatMoney(row.billsExceedBudget, currency)} per week
                          </div>
                        )}
                        {!view.isDemo && (
                          <div className="mt-2 flex flex-wrap items-center gap-3 text-[12px]">
                            <button
                              type="button"
                              className="text-muted-foreground hover:text-foreground"
                              aria-label={`Edit ${row.name}`}
                              onClick={() =>
                                setEditing(
                                  view.data.categories.find(
                                    (category) => category.id === row.categoryId,
                                  ) ?? null,
                                )
                              }
                            >
                              Edit
                            </button>
                            <DeleteControl
                              name={row.name}
                              message={`Delete "${row.name}"?`}
                              onConfirm={() => removeCategory(row.categoryId)}
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
      )}
    </div>
  );
}
