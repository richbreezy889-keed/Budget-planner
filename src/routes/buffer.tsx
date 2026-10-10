import { createFileRoute } from "@tanstack/react-router";
import { IncomeLineChart } from "@/components/budget/charts";
import { MainSkeleton } from "@/components/budget/AppShell";
import { EmptyState, PageHeader, Panel, Stat } from "@/components/budget/Panel";
import { formatMoney } from "@/lib/format";
import { bufferView } from "@/lib/selectors";
import { useAppView } from "@/lib/store/useAppView";

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

const vsBaseline = (vs: "above" | "below" | "equal" | null): string => {
  if (vs === null) return "Not enough history yet";
  if (vs === "above") return "Above baseline";
  if (vs === "below") return "Below baseline";
  return "On baseline";
};

export function BufferPage() {
  const view = useAppView();
  if (view === null) return <MainSkeleton />;
  const currency = view.data.settings.currency;
  const buffer = bufferView(view.data, view.today);
  const hasHistory = view.data.incomeEntries.length > 0 || view.data.transactions.length > 0;

  if (!view.isDemo && !hasHistory) {
    return (
      <div>
        <PageHeader
          title="Buffer & Runway"
          subtitle="The buffer absorbs good and bad weeks so your baseline stays steady."
        />
        <EmptyState
          title="No history yet"
          hint="Log income and spending to see your buffer, runway and weekly trends."
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Buffer & Runway"
        subtitle="The buffer absorbs good and bad weeks so your baseline stays steady."
      />
      <div className="grid gap-6 sm:grid-cols-2">
        <Stat
          label="Buffer balance"
          value={formatMoney(buffer.bufferBalance, currency)}
          hint={`this week so far: ${formatMoney(buffer.changeThisWeek, currency, { sign: true })}`}
        />
        <Stat
          label="Runway"
          value={buffer.runwayWeeks === null ? "—" : `${buffer.runwayWeeks.toFixed(1)} weeks`}
          {...(buffer.runwayWeeks === null ? { hint: "Add your essentials to see runway" } : {})}
        />
      </div>
      <Panel title="Weekly income · last 12 weeks" className="mt-6">
        <IncomeLineChart series={buffer.series} baseline={buffer.baseline} />
      </Panel>
      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <Stat
          label="4-week average"
          value={buffer.avg4 === null ? "—" : formatMoney(buffer.avg4, currency)}
          hint={vsBaseline(buffer.avg4VsBaseline)}
        />
        <Stat
          label="8-week average"
          value={buffer.avg8 === null ? "—" : formatMoney(buffer.avg8, currency)}
          hint={vsBaseline(buffer.avg8VsBaseline)}
        />
      </div>
      {buffer.suggestedBaseline !== null && (
        <div className="mt-3 text-[12px] text-muted-foreground">
          Suggested baseline: {formatMoney(buffer.suggestedBaseline, currency)}
        </div>
      )}
    </div>
  );
}
