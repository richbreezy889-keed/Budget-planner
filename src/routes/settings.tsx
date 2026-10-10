import { createFileRoute } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { MainSkeleton } from "@/components/budget/AppShell";
import { PageHeader, Panel } from "@/components/budget/Panel";
import { parseMoneyInput } from "@/lib/moneyInput";
import { useAppData } from "@/lib/store/context";
import { useAppView } from "@/lib/store/useAppView";
import type { Settings, WeekStartDay } from "@/lib/types";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — MNGS" },
      {
        name: "description",
        content: "Currency, week start, baseline income, opening buffer and data tools.",
      },
      { property: "og:title", content: "Settings — MNGS" },
      { property: "og:description", content: "Configure your weekly planner." },
    ],
  }),
  component: SettingsPage,
});

const field =
  "w-full rounded-[10px] bg-muted px-3 py-2.5 text-[13px] text-foreground ring-1 ring-border outline-none focus:ring-primary/50 disabled:opacity-60";
const WEEK_START_DAYS: WeekStartDay[] = ["Monday", "Sunday", "Saturday"];
const CURRENCY_CODES = ["USD", "EUR", "GBP", "TZS"];

function Row({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint: string;
  error?: string | undefined;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-2 border-t py-4 first:border-t-0 first:pt-0 sm:grid-cols-[1fr_240px] sm:items-center">
      <div>
        <div className="text-[14px]">{label}</div>
        <div className="text-[12px] text-muted-foreground">{hint}</div>
      </div>
      <div>
        {children}
        {error && <div className="mt-1 text-[12px] text-danger">{error}</div>}
      </div>
    </div>
  );
}

export function SettingsPage() {
  const view = useAppView();
  if (view === null) return <MainSkeleton />;
  return <SettingsContent isDemo={view.isDemo} settings={view.data.settings} />;
}

function SettingsContent({ isDemo, settings }: { isDemo: boolean; settings: Settings }) {
  const { dispatch } = useAppData();
  const [currency, setCurrency] = useState(settings.currency);
  const [weekStartDay, setWeekStartDay] = useState<WeekStartDay>(settings.weekStartDay);
  const [baseline, setBaseline] = useState(String(settings.baselineWeeklyIncome));
  const [buffer, setBuffer] = useState(String(settings.openingBufferBalance));
  const [saved, setSaved] = useState(false);
  const [attempted, setAttempted] = useState(false);

  const baselineValue = parseMoneyInput(baseline);
  const bufferValue = parseMoneyInput(buffer);
  const currencyInvalid = currency.trim() === "";
  const valid = !currencyInvalid && baselineValue !== null && bufferValue !== null;
  const showErrors = attempted && !valid;

  const save = () => {
    setAttempted(true);
    if (!valid) {
      setSaved(false);
      return;
    }
    dispatch({
      type: "setSettings",
      settings: {
        currency: currency.trim(),
        weekStartDay,
        baselineWeeklyIncome: baselineValue ?? 0,
        openingBufferBalance: bufferValue ?? 0,
      },
    });
    setSaved(true);
  };

  return (
    <div>
      <PageHeader title="Settings" />
      {isDemo && (
        <p className="mb-4 text-[13px] text-muted-foreground">Start fresh to edit your settings.</p>
      )}
      <Panel title="Planner">
        <Row label="Currency" hint="Any code works, e.g. USD or TZS">
          <input
            className={field}
            value={currency}
            list="settings-currencies"
            disabled={isDemo}
            aria-label="Currency"
            onChange={(event) => {
              setCurrency(event.target.value);
              setSaved(false);
            }}
          />
          <datalist id="settings-currencies">
            {CURRENCY_CODES.map((code) => (
              <option key={code} value={code} />
            ))}
          </datalist>
          {showErrors && currencyInvalid && (
            <div className="mt-1 text-[12px] text-danger">Enter a currency code.</div>
          )}
        </Row>
        <Row label="Week starts on" hint="Defines your weekly period">
          <select
            className={field}
            value={weekStartDay}
            disabled={isDemo}
            aria-label="Week starts on"
            onChange={(event) => {
              setWeekStartDay(event.target.value as WeekStartDay);
              setSaved(false);
            }}
          >
            {WEEK_START_DAYS.map((day) => (
              <option key={day} value={day}>
                {day}
              </option>
            ))}
          </select>
        </Row>
        <Row label="Baseline weekly income" hint="A conservative, lean-week figure">
          <input
            className={field}
            value={baseline}
            disabled={isDemo}
            inputMode="decimal"
            aria-label="Baseline weekly income"
            onChange={(event) => {
              setBaseline(event.target.value);
              setSaved(false);
            }}
          />
          {showErrors && baselineValue === null && (
            <div className="mt-1 text-[12px] text-danger">Enter a valid amount.</div>
          )}
        </Row>
        <Row label="Opening buffer balance" hint="Starting amount in your buffer">
          <input
            className={field}
            value={buffer}
            disabled={isDemo}
            inputMode="decimal"
            aria-label="Opening buffer balance"
            onChange={(event) => {
              setBuffer(event.target.value);
              setSaved(false);
            }}
          />
          {showErrors && bufferValue === null && (
            <div className="mt-1 text-[12px] text-danger">Enter a valid amount.</div>
          )}
        </Row>
        {!isDemo && (
          <div className="flex items-center gap-3 border-t pt-4">
            <button
              type="button"
              className="rounded-[10px] bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
              onClick={save}
            >
              Save changes
            </button>
            {saved && <span className="text-[13px] text-muted-foreground">Settings saved.</span>}
            {showErrors && <span className="text-[13px] text-danger">Fix the fields above.</span>}
          </div>
        )}
      </Panel>
      <Panel title="Data" className="mt-6">
        <div className="flex flex-wrap gap-3">
          <button
            className="rounded-[10px] bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
            disabled
          >
            Export JSON
          </button>
          <button
            className="rounded-[10px] bg-muted px-4 py-2 text-sm ring-1 ring-border disabled:opacity-60"
            disabled
          >
            Import JSON
          </button>
          <button
            className="rounded-[10px] px-4 py-2 text-sm text-danger ring-1 ring-danger/40 disabled:opacity-60"
            disabled
          >
            Reset
          </button>
        </div>
      </Panel>
    </div>
  );
}
