import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ActivityList } from "@/components/budget/ActivityList";
import { MainSkeleton } from "@/components/budget/AppShell";
import { EmptyState } from "@/components/budget/Panel";
import { QuickAddForm, type EditingEntry } from "@/components/budget/QuickAddForm";
import { SafeToSpendCard } from "@/components/budget/SafeToSpendCard";
import { WaterfallBar } from "@/components/budget/WaterfallBar";
import { WeekNotice } from "@/components/budget/WeekNotice";
import type { WeekActivityItem } from "@/lib/selectors";
import { thisWeekView } from "@/lib/selectors";
import { useAppData } from "@/lib/store/context";
import { useAppView } from "@/lib/store/useAppView";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "This Week — MNGS" },
      {
        name: "description",
        content: "Your safe-to-spend number for this week, income logged and where it goes.",
      },
      { property: "og:title", content: "This Week — MNGS" },
      { property: "og:description", content: "Your safe-to-spend number for this week." },
    ],
  }),
  component: ThisWeek,
});

export function ThisWeek() {
  const { dispatch } = useAppData();
  const view = useAppView();
  const [editing, setEditing] = useState<EditingEntry | null>(null);
  if (view === null) return <MainSkeleton />;
  const week = thisWeekView(view.data, view.today);
  const currency = view.data.settings.currency;
  const showFlexibleNotice = !view.isDemo && week.flexibleBudget === 0;

  const startEdit = (item: WeekActivityItem) => {
    if (item.kind === "income") {
      const entry = view.data.incomeEntries.find((row) => row.id === item.id);
      if (entry) setEditing({ kind: "income", entry });
    } else {
      const transaction = view.data.transactions.find((row) => row.id === item.id);
      if (transaction) setEditing({ kind: "spend", transaction });
    }
  };

  const deleteEntry = (item: WeekActivityItem) => {
    dispatch(
      item.kind === "income"
        ? { type: "deleteIncome", id: item.id }
        : { type: "deleteTransaction", id: item.id },
    );
  };

  return (
    <div className="flex flex-col gap-6">
      {showFlexibleNotice ? (
        <EmptyState
          title="Set a flexible budget to see your safe-to-spend"
          hint="Add a flexible category in Budgets, or run Start fresh to include starter categories."
        />
      ) : (
        <SafeToSpendCard week={week} currency={currency} />
      )}
      <WeekNotice week={week} currency={currency} />
      <div className="grid items-start gap-6 lg:grid-cols-[1.4fr_1fr]">
        <WaterfallBar week={week} currency={currency} />
        <QuickAddForm
          categories={view.data.categories}
          isDemo={view.isDemo}
          weekStartDay={view.data.settings.weekStartDay}
          today={view.today}
          {...(editing ? { editing } : {})}
          onCancel={() => setEditing(null)}
        />
      </div>
      <ActivityList
        week={week}
        currency={currency}
        categories={view.data.categories}
        isDemo={view.isDemo}
        onEdit={startEdit}
        onDelete={deleteEntry}
      />
    </div>
  );
}
