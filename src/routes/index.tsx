import { createFileRoute } from "@tanstack/react-router";
import { ActivityList } from "@/components/budget/ActivityList";
import { MainSkeleton } from "@/components/budget/AppShell";
import { QuickAddForm } from "@/components/budget/QuickAddForm";
import { SafeToSpendCard } from "@/components/budget/SafeToSpendCard";
import { WaterfallBar } from "@/components/budget/WaterfallBar";
import { WeekNotice } from "@/components/budget/WeekNotice";
import { thisWeekView } from "@/lib/selectors";
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

function ThisWeek() {
  const view = useAppView();
  if (view === null) return <MainSkeleton />;
  const week = thisWeekView(view.data, view.today);
  const currency = view.data.settings.currency;
  return (
    <div className="flex flex-col gap-6">
      <SafeToSpendCard week={week} currency={currency} />
      <WeekNotice week={week} currency={currency} />
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <WaterfallBar week={week} currency={currency} />
        <QuickAddForm categories={view.data.categories} />
      </div>
      <ActivityList week={week} currency={currency} categories={view.data.categories} />
    </div>
  );
}
