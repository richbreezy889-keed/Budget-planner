import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, Stat } from "@/components/budget/Panel";
import { IncomeLineChart } from "@/components/budget/charts";
import { formatMoney } from "@/lib/format";
import { bufferBalance, bufferChangeThisWeek, rollingAverageIncome, runwayWeeks } from "@/lib/calc";
import { incomeEntries, settings, transactions } from "@/lib/mockData";

export const Route = createFileRoute("/buffer")({
  head: () => ({
    meta: [
      { title: "Buffer & Runway — MNGS" },
      {
        name: "description",
        content: "Buffer balance, runway in weeks and 12 weeks of income against your baseline.",
      },
      { property: "og:title", content: "Buffer & Runway — MNGS" },
      { property: "og:description", content: "How long your buffer can carry lean weeks." },
    ],
  }),
  component: BufferPage,
});

function BufferPage() {
  const cur = settings.currency;
  const balance = bufferBalance(settings, incomeEntries, transactions);
  return (
    <div>
      <PageHeader
        title="Buffer & Runway"
        subtitle="The buffer absorbs good and bad weeks so your baseline stays steady."
      />
      <div className="grid gap-6 sm:grid-cols-2">
        <Stat
          label="Buffer balance"
          value={formatMoney(balance, cur)}
          hint={`${formatMoney(bufferChangeThisWeek(settings, incomeEntries), cur, { sign: true })} added this week`}
        />
        <Stat
          label="Runway"
          value={`${runwayWeeks(balance, settings.baselineWeeklyIncome)} weeks`}
          hint={`of baseline ${formatMoney(settings.baselineWeeklyIncome, cur)}/week`}
        />
      </div>
      <Panel title="Weekly income · last 12 weeks" className="mt-6">
        <IncomeLineChart />
      </Panel>
      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <Stat
          label="4-week average"
          value={formatMoney(rollingAverageIncome(incomeEntries, 4), cur)}
          hint="Above baseline"
        />
        <Stat
          label="8-week average"
          value={formatMoney(rollingAverageIncome(incomeEntries, 8), cur)}
          hint="Above baseline"
        />
      </div>
    </div>
  );
}
