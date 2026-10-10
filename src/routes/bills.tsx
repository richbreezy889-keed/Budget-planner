import { createFileRoute } from "@tanstack/react-router";
import { format, parseISO } from "date-fns";
import { MainSkeleton } from "@/components/budget/AppShell";
import { EmptyState, PageHeader, Panel, Progress } from "@/components/budget/Panel";
import { formatMoney } from "@/lib/format";
import { billsGoalsView } from "@/lib/selectors";
import { useAppView } from "@/lib/store/useAppView";

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

export function BillsPage() {
  const view = useAppView();
  if (view === null) return <MainSkeleton />;
  const currency = view.data.settings.currency;
  const { bills, weeklyTotal, goals } = billsGoalsView(view.data, view.today);
  const showBillEmpty = !view.isDemo && bills.length === 0;
  const showGoalEmpty = !view.isDemo && goals.length === 0;

  return (
    <div>
      <PageHeader title="Bills & Goals" subtitle="Every bill converted to its weekly cost." />
      <Panel
        title="Recurring bills"
        {...(showBillEmpty
          ? {}
          : {
              action: (
                <span className="font-mono text-[12px] text-muted-foreground">
                  {formatMoney(weeklyTotal, currency, { cents: true })}/week
                </span>
              ),
            })}
      >
        {showBillEmpty ? (
          <EmptyState
            title="No bills yet"
            hint="Add recurring bills so their weekly cost is reserved before spending."
          />
        ) : (
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
                {bills.map((bill) => (
                  <tr key={bill.id} className="border-t">
                    <td className="px-2 py-3">{bill.name}</td>
                    <td className="px-2 py-3 text-right font-mono">
                      {formatMoney(bill.amount, currency, { cents: true })}
                    </td>
                    <td className="px-2 py-3 capitalize text-muted-foreground">{bill.period}</td>
                    <td className="px-2 py-3 text-right font-mono text-accent-foreground">
                      {formatMoney(bill.weekly, currency, { cents: true })}
                    </td>
                    <td className="px-2 py-3 text-right font-mono text-muted-foreground">
                      {bill.dueDay}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <h2 className="label-caps mb-4 mt-8">Savings goals</h2>
      {showGoalEmpty ? (
        <EmptyState
          title="No goals yet"
          hint="Add a savings goal to track progress toward it week by week."
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          {goals.map((goal) => (
            <Panel key={goal.id}>
              <div className="font-display text-xl font-semibold">{goal.name}</div>
              {goal.targetDate && (
                <div className="mt-1 text-[12px] text-muted-foreground">
                  by {format(parseISO(goal.targetDate), "MMM yyyy")}
                </div>
              )}
              <div className="mt-5 font-mono text-2xl font-bold">
                {formatMoney(goal.savedAmount, currency)}{" "}
                <span className="text-base font-normal text-muted-foreground">
                  / {formatMoney(goal.targetAmount, currency)}
                </span>
              </div>
              <div className="mt-3">
                <Progress value={goal.progress} />
              </div>
              <div className="mt-3 flex justify-between font-mono text-[12px] text-muted-foreground">
                <span>{Math.round(goal.progress * 100)}%</span>
                <span>{formatMoney(goal.weeklyContribution, currency)}/wk</span>
              </div>
              <div className="mt-1 flex justify-between font-mono text-[12px] text-muted-foreground">
                <span>Remaining {formatMoney(goal.remaining, currency)}</span>
                <span>
                  {goal.weeksLeft === null ? "No target date" : `${goal.weeksLeft} wks left`}
                </span>
              </div>
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}
