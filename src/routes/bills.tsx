import { createFileRoute } from "@tanstack/react-router";
import { format, parseISO } from "date-fns";
import { PageHeader, Panel, Progress } from "@/components/budget/Panel";
import { bills, goals, settings } from "@/lib/mockData";
import { formatMoney } from "@/lib/format";
import {
  goalProgress,
  goalWeeklyContribution,
  weeklyBillsTotal,
  weeklyEquivalent,
  weeksToGoal,
} from "@/lib/calc";

export const Route = createFileRoute("/bills")({
  head: () => ({
    meta: [
      { title: "Bills & Goals — MNGS" },
      {
        name: "description",
        content: "Recurring bills with weekly equivalents and savings goal progress.",
      },
      { property: "og:title", content: "Bills & Goals — MNGS" },
      { property: "og:description", content: "Recurring bills and savings goals at a glance." },
    ],
  }),
  component: BillsPage,
});

function BillsPage() {
  const cur = settings.currency;
  return (
    <div>
      <PageHeader title="Bills & Goals" subtitle="Every bill converted to its weekly cost." />
      <Panel
        title="Recurring bills"
        action={
          <span className="font-mono text-[12px] text-muted-foreground">
            {formatMoney(weeklyBillsTotal(bills), cur, { cents: true })}/week
          </span>
        }
      >
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
                  <td className="px-2 py-3 text-right font-mono">
                    {formatMoney(b.amount, cur, { cents: true })}
                  </td>
                  <td className="px-2 py-3 capitalize text-muted-foreground">{b.period}</td>
                  <td className="px-2 py-3 text-right font-mono text-accent-foreground">
                    {formatMoney(weeklyEquivalent(b.amount, b.period), cur, { cents: true })}
                  </td>
                  <td className="px-2 py-3 text-right font-mono text-muted-foreground">
                    {b.dueDay}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <h2 className="label-caps mb-4 mt-8">Savings goals</h2>
      <div className="grid gap-6 md:grid-cols-3">
        {goals.map((g) => {
          const p = goalProgress(g);
          return (
            <Panel key={g.id}>
              <div className="font-display text-xl font-semibold">{g.name}</div>
              {g.targetDate && (
                <div className="mt-1 text-[12px] text-muted-foreground">
                  by {format(parseISO(g.targetDate), "MMM yyyy")}
                </div>
              )}
              <div className="mt-5 font-mono text-2xl font-bold">
                {formatMoney(g.savedAmount, cur)}{" "}
                <span className="text-base font-normal text-muted-foreground">
                  / {formatMoney(g.targetAmount, cur)}
                </span>
              </div>
              <div className="mt-3">
                <Progress value={p} />
              </div>
              <div className="mt-3 flex justify-between font-mono text-[12px] text-muted-foreground">
                <span>{Math.round(p * 100)}%</span>
                <span>
                  {formatMoney(goalWeeklyContribution(g), cur)}/wk · {weeksToGoal(g)} wks left
                </span>
              </div>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}
