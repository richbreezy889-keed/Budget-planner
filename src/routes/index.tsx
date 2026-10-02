import { createFileRoute } from "@tanstack/react-router";
import { SafeToSpendCard } from "@/components/budget/SafeToSpendCard";
import { WaterfallBar } from "@/components/budget/WaterfallBar";
import { QuickAddForm } from "@/components/budget/QuickAddForm";
import { TransactionList } from "@/components/budget/TransactionList";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "This Week — Tidewell" },
      { name: "description", content: "Your safe-to-spend number for this week, income logged and where it goes." },
      { property: "og:title", content: "This Week — Tidewell" },
      { property: "og:description", content: "Your safe-to-spend number for this week." },
    ],
  }),
  component: ThisWeek,
});

function ThisWeek() {
  return (
    <div className="flex flex-col gap-6">
      <SafeToSpendCard />
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <WaterfallBar />
        <QuickAddForm />
      </div>
      <TransactionList />
    </div>
  );
}
