import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, Progress } from "@/components/budget/Panel";
import { categories, settings, transactions } from "@/lib/mockData";
import type { CategoryType } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { categoryProgress, spentInCategory, weeklyTotalForType } from "@/lib/calc";

export const Route = createFileRoute("/budgets")({
  head: () => ({
    meta: [
      { title: "Budgets — Tidewell" },
      { name: "description", content: "Essential, savings and flexible budget categories with progress." },
      { property: "og:title", content: "Budgets — Tidewell" },
      { property: "og:description", content: "Category budgets grouped by Essential, Savings and Flexible." },
    ],
  }),
  component: BudgetsPage,
});

const groups: { type: CategoryType; label: string }[] = [
  { type: "essential", label: "Essential" },
  { type: "savings", label: "Savings" },
  { type: "flexible", label: "Flexible" },
];

function BudgetsPage() {
  const cur = settings.currency;
  return (
    <div>
      <PageHeader title="Budgets" subtitle="Planned amounts per category, shown weekly or monthly." />
      <div className="flex flex-col gap-6">
        {groups.map((g) => (
          <Panel key={g.type} title={g.label} action={<span className="text-[12px] text-muted-foreground">{formatMoney(weeklyTotalForType(g.type, categories), cur)}/week</span>}>
            <ul className="flex flex-col gap-5">
              {categories.filter((c) => c.type === g.type).map((c) => {
                const spent = spentInCategory(c.id, transactions, c.budgetPeriod);
                const p = categoryProgress(spent, c.budgetAmount);
                return (
                  <li key={c.id}>
                    <div className="mb-2 grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-[14px]">{c.name}</span>
                        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">{c.budgetPeriod}</span>
                      </div>
                      <span className="text-[13px]">{formatMoney(spent, cur)} <span className="text-muted-foreground">/ {formatMoney(c.budgetAmount, cur)}</span></span>
                    </div>
                    <Progress value={p} tone={p >= 1 ? "warn" : "primary"} />
                  </li>
                );
              })}
            </ul>
          </Panel>
        ))}
      </div>
    </div>
  );
}
