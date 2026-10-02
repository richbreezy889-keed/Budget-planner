import { createFileRoute } from "@tanstack/react-router";
import { format, parseISO } from "date-fns";
import { PageHeader, Panel, Progress } from "@/components/budget/Panel";
import { bills, goals } from "@/lib/mockData";
import { formatMoney, getGoalProgress, getTotalWeeklyBills, getWeeksToGoal, weeklyEquivalent } from "@/lib/calc";

export const Route = createFileRoute("/bills")({
  head: () => ({
    meta: [
      { title: "Bills & Goals — Tidewell" },
      { name: "description", content: "Recurring bills with weekly equivalents and savings goal progress." },
      { property: "og:title", content: "Bills & Goals — Tidewell" },
      { property: "og:description", content: "Recurring bills and savings goals at a glance." },
    ],
  }),
  component: BillsPage,
});

function BillsPage() {
  return (
    <div>
      <PageHeader title="Bills & Goals" subtitle="Every bill converted to its weekly cost." />
      <Panel title="Recurring bills" action={<span className="text-[12px] text-muted-foreground">{formatMoney(getTotalWeeklyBills(), { cents: true })}/week</span>}>
        <div className="-mx-2 overflow-x-auto">
          <table className="w-full min-w-[520px] text-[13px]">
            <thead>
              <tr className="label-caps text-left">
                <th className="px-2 pb-3 font-normal">Bill</th>
                <th className="px-2 pb-3 text-right font-normal">Amount</th>
                <th className="px-2 pb-3 font-normal">Period</th>
                <th className="px-2 pb-3 text-right font-normal">Weekly</th>
                <th className="px-2 pb-3 text-right font-normal">Due</th>
              </tr>
            </thead>
            <tbody>
              {bills.map((b) => (
                <tr key={b.id} className="border-t">
                  <td className="px-2 py-3">{b.name}</td>
                  <td className="px-2 py-3 text-right">{formatMoney(b.amount, { cents: true })}</td>
                  <td className="px-2 py-3 capitalize text-muted-foreground">{b.period}</td>
                  <td className="px-2 py-3 text-right text-accent-foreground">{formatMoney(weeklyEquivalent(b), { cents: true })}</td>
                  <td className="px-2 py-3 text-right text-muted-foreground">{b.dueDay}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <h2 className="label-caps mb-4 mt-8">Savings goals</h2>
      <div className="grid gap-6 md:grid-cols-3">
        {goals.map((g) => {
          const p = getGoalProgress(g.saved, g.target);
          return (
            <Panel key={g.id}>
              <div className="font-display text-xl font-semibold">{g.name}</div>
              <div className="mt-1 text-[12px] text-muted-foreground">by {format(parseISO(g.targetDate), "MMM yyyy")}</div>
              <div className="mt-5 text-2xl font-display font-bold">{formatMoney(g.saved)} <span className="text-base font-normal text-muted-foreground">/ {formatMoney(g.target)}</span></div>
              <div className="mt-3"><Progress value={p} /></div>
              <div className="mt-3 flex justify-between text-[12px] text-muted-foreground">
                <span>{Math.round(p * 100)}%</span>
                <span>{formatMoney(g.weeklyContribution)}/wk · {getWeeksToGoal(g.id)} wks left</span>
              </div>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}
