import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { PageHeader, Panel } from "@/components/budget/Panel";
import { settings } from "@/lib/mockData";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Tidewell" },
      {
        name: "description",
        content: "Currency, week start, baseline income, opening buffer and data tools.",
      },
      { property: "og:title", content: "Settings — Tidewell" },
      { property: "og:description", content: "Configure your weekly planner." },
    ],
  }),
  component: SettingsPage,
});

const field =
  "w-full rounded-[10px] bg-muted px-3 py-2.5 text-[13px] text-foreground ring-1 ring-border outline-none focus:ring-primary/50";

function Row({ label, hint, children }: { label: string; hint: string; children: ReactNode }) {
  return (
    <div className="grid gap-2 border-t py-4 first:border-t-0 first:pt-0 sm:grid-cols-[1fr_240px] sm:items-center">
      <div>
        <div className="text-[14px]">{label}</div>
        <div className="text-[12px] text-muted-foreground">{hint}</div>
      </div>
      {children}
    </div>
  );
}

function SettingsPage() {
  return (
    <div>
      <PageHeader title="Settings" />
      <Panel title="Planner">
        <Row label="Currency" hint="Used for all amounts">
          <select className={field} defaultValue={settings.currency}>
            <option>USD</option>
            <option>EUR</option>
            <option>GBP</option>
            <option>TZS</option>
          </select>
        </Row>
        <Row label="Week starts on" hint="Defines your weekly period">
          <select className={field} defaultValue={settings.weekStartDay}>
            <option>Monday</option>
            <option>Sunday</option>
            <option>Saturday</option>
          </select>
        </Row>
        <Row label="Baseline weekly income" hint="A conservative, lean-week figure">
          <input
            className={field}
            defaultValue={settings.baselineWeeklyIncome}
            inputMode="decimal"
          />
        </Row>
        <Row label="Opening buffer balance" hint="Starting amount in your buffer">
          <input
            className={field}
            defaultValue={settings.openingBufferBalance}
            inputMode="decimal"
          />
        </Row>
      </Panel>
      <Panel title="Data" className="mt-6">
        <div className="flex flex-wrap gap-3">
          <button className="rounded-[10px] bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
            Export JSON
          </button>
          <button className="rounded-[10px] bg-muted px-4 py-2 text-sm ring-1 ring-border">
            Import JSON
          </button>
          <button className="rounded-[10px] px-4 py-2 text-sm text-danger ring-1 ring-danger/40">
            Reset
          </button>
        </div>
      </Panel>
    </div>
  );
}
