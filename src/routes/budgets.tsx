import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, Progress } from "@/components/budget/Panel";
import { categories, type Group } from "@/lib/mockData";
import { formatMoney, getCategoryProgress, getGroupTotal } from "@/lib/calc";

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

const groups: Group[] = ["Essential", "Savings", "Flexible"];

function BudgetsPage() {
  return (
    <div>
      <PageHeader title="Budgets" subtitle="Planned amounts per category, shown weekly or monthly." />
      <div className="flex flex-col gap-6">
        {groups.map((g) => (
          <Panel key={g} title={g} action={<span className="text-[12px] text-muted-foreground">{formatMoney(getGroupTotal(g))}/week</span>}>
            <ul className="flex flex-col gap-5">
              {categories.filter((c) => c.group === g).map((c) => {
                const p = getCategoryProgress(c);
                return (
                  <li key={c.id}>
                    <div className="mb-2 grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-[14px]">{c.name}</span>
                        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">{c.period}</span>
                      </div>
                      <span className="text-[13px]">{formatMoney(c.spent)} <span className="text-muted-foreground">/ {formatMoney(c.amount)}</span></span>
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
