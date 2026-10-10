import { createFileRoute } from "@tanstack/react-router";
import { format, parseISO } from "date-fns";
import { MainSkeleton } from "@/components/budget/AppShell";
import { IncomeSpendChart } from "@/components/budget/charts";
import { EmptyState, PageHeader, Panel } from "@/components/budget/Panel";
import { formatMoney } from "@/lib/format";
import { trendsView } from "@/lib/selectors";
import { useAppView } from "@/lib/store/useAppView";

export const Route = createFileRoute("/trends")({
  head: () => ({
    meta: [
      { title: "Trends — MNGS" },
      {
        name: "description",
        content: "Twelve weeks of income versus spending and a monthly rollup.",
      },
      { property: "og:title", content: "Trends — MNGS" },
      { property: "og:description", content: "Income vs spending over time." },
    ],
  }),
  component: TrendsPage,
});

export function TrendsPage() {
  const view = useAppView();
  if (view === null) return <MainSkeleton />;
  const currency = view.data.settings.currency;
  const trends = trendsView(view.data, view.today);
  const hasData = view.data.incomeEntries.length > 0 || view.data.transactions.length > 0;

  if (!view.isDemo && !hasData) {
    return (
      <div>
        <PageHeader title="Trends" subtitle="Income vs spending over the last 12 weeks." />
        <EmptyState
          title="No data yet"
          hint="Log some income and spending to compare income against spending over time."
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Trends" subtitle="Income vs spending over the last 12 weeks." />
      <Panel title="Income vs spending">
        <IncomeSpendChart series={trends.series} />
      </Panel>
      <Panel title="Monthly rollup" className="mt-6">
        <div className="-mx-2 overflow-x-auto">
          <table className="w-full min-w-[440px] text-[13px]">
            <thead>
              <tr className="label-caps text-left">
                <th className="px-2 pb-3 font-normal">Month</th>
                <th className="px-2 pb-3 text-right font-normal">Income</th>
                <th className="px-2 pb-3 text-right font-normal">Spending</th>
                <th className="px-2 pb-3 text-right font-normal">Net</th>
              </tr>
            </thead>
            <tbody>
              {trends.rollup.map((month, index) => (
                <tr key={month.month} className="border-t">
                  <td className="px-2 py-3">
                    {format(parseISO(`${month.month}-01`), "MMM yyyy")}
                    {index === trends.rollup.length - 1 ? " (so far)" : ""}
                  </td>
                  <td className="px-2 py-3 text-right font-mono">
                    {formatMoney(month.income, currency)}
                  </td>
                  <td className="px-2 py-3 text-right font-mono">
                    {formatMoney(month.spending, currency)}
                  </td>
                  <td
                    className={`px-2 py-3 text-right font-mono ${month.net >= 0 ? "text-safe" : "text-danger"}`}
                  >
                    {formatMoney(month.net, currency, { sign: true })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
