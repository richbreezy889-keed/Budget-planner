import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel } from "@/components/budget/Panel";
import { IncomeSpendChart } from "@/components/budget/charts";
import { monthlyRollup } from "@/lib/mockData";
import { formatMoney } from "@/lib/calc";

export const Route = createFileRoute("/trends")({
  head: () => ({
    meta: [
      { title: "Trends — Tidewell" },
      { name: "description", content: "Twelve weeks of income versus spending and a monthly rollup." },
      { property: "og:title", content: "Trends — Tidewell" },
      { property: "og:description", content: "Income vs spending over time." },
    ],
  }),
  component: TrendsPage,
});

function TrendsPage() {
  return (
    <div>
      <PageHeader title="Trends" subtitle="Income vs spending over the last 12 weeks." />
      <Panel title="Income vs spending"><IncomeSpendChart /></Panel>
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
              {monthlyRollup.map((m) => (
                <tr key={m.month} className="border-t">
                  <td className="px-2 py-3">{m.month}</td>
                  <td className="px-2 py-3 text-right">{formatMoney(m.income)}</td>
                  <td className="px-2 py-3 text-right">{formatMoney(m.spending)}</td>
                  <td className="px-2 py-3 text-right text-safe">{formatMoney(m.saved, { sign: true })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
