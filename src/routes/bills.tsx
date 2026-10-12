import { createFileRoute } from "@tanstack/react-router";
import { format, parseISO } from "date-fns";
import { useState } from "react";
import { MainSkeleton } from "@/components/budget/AppShell";
import { BillForm } from "@/components/budget/BillForm";
import { DeleteControl } from "@/components/budget/DeleteControl";
import { GoalForm } from "@/components/budget/GoalForm";
import { EmptyState, PageHeader, Panel, Progress } from "@/components/budget/Panel";
import { formatMoney } from "@/lib/format";
import { billsGoalsView } from "@/lib/selectors";
import { useAppData } from "@/lib/store/context";
import { useAppView } from "@/lib/store/useAppView";
import type { Goal, RecurringBill } from "@/lib/types";

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
  const { dispatch } = useAppData();
  const view = useAppView();
  const [billEditing, setBillEditing] = useState<RecurringBill | null>(null);
  const [goalEditing, setGoalEditing] = useState<Goal | null>(null);
  if (view === null) return <MainSkeleton />;
  const currency = view.data.settings.currency;
  const { bills, weeklyTotal, goals } = billsGoalsView(view.data, view.today);
  const showBillEmpty = !view.isDemo && bills.length === 0;
  const showGoalEmpty = !view.isDemo && goals.length === 0;

  const removeBill = (billId: string) => {
    dispatch({ type: "deleteBill", id: billId });
    if (billEditing?.id === billId) setBillEditing(null);
  };

  const removeGoal = (goalId: string) => {
    dispatch({ type: "deleteGoal", id: goalId });
    if (goalEditing?.id === goalId) setGoalEditing(null);
  };

  return (
    <div>
      <PageHeader title="Bills & Goals" subtitle="Every bill converted to its weekly cost." />

      {!view.isDemo && (
        <div className="mb-6">
          <BillForm editing={billEditing} onCancel={() => setBillEditing(null)} />
        </div>
      )}

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
                  {!view.isDemo && <th className="px-2 pb-3 text-right font-normal">Manage</th>}
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
                    {!view.isDemo && (
                      <td className="px-2 py-3 text-right">
                        <div className="flex flex-wrap items-center justify-end gap-3 text-[12px]">
                          <button
                            type="button"
                            className="text-muted-foreground hover:text-foreground"
                            aria-label={`Edit ${bill.name}`}
                            onClick={() =>
                              setBillEditing(
                                view.data.bills.find((row) => row.id === bill.id) ?? null,
                              )
                            }
                          >
                            Edit
                          </button>
                          <DeleteControl name={bill.name} onConfirm={() => removeBill(bill.id)} />
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <h2 className="label-caps mb-4 mt-8">Savings goals</h2>
      {!view.isDemo && (
        <div className="mb-6">
          <GoalForm editing={goalEditing} onCancel={() => setGoalEditing(null)} />
        </div>
      )}
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
              {!view.isDemo && (
                <div className="mt-4 flex flex-wrap items-center gap-3 text-[12px]">
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground"
                    aria-label={`Edit ${goal.name}`}
                    onClick={() =>
                      setGoalEditing(view.data.goals.find((row) => row.id === goal.id) ?? null)
                    }
                  >
                    Edit
                  </button>
                  <DeleteControl name={goal.name} onConfirm={() => removeGoal(goal.id)} />
                </div>
              )}
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}
