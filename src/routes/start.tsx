import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { MainSkeleton } from "@/components/budget/AppShell";
import { PageHeader, Panel } from "@/components/budget/Panel";
import { parseMoneyInput } from "@/lib/moneyInput";
import type { NewCategory } from "@/lib/store/reducer";
import { starterCategories } from "@/lib/store/starter";
import { useAppData } from "@/lib/store/context";
import { useAppView } from "@/lib/store/useAppView";
import type { BudgetPeriod, CategoryType, WeekStartDay } from "@/lib/types";

export const Route = createFileRoute("/start")({
  head: () => ({
    meta: [
      { title: "Start fresh — MNGS" },
      {
        name: "description",
        content: "Set up your planner: currency, week start and starter categories.",
      },
      { property: "og:title", content: "Start fresh — MNGS" },
      { property: "og:description", content: "Replace the demo with your own planner." },
    ],
  }),
  component: StartPage,
});

const field =
  "w-full rounded-[10px] bg-muted px-3 py-2.5 text-[13px] text-foreground ring-1 ring-border outline-none placeholder:text-muted-foreground focus:ring-primary/50 disabled:opacity-60";
const primary =
  "rounded-[10px] bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60";
const secondary = "rounded-[10px] px-4 py-2 text-sm font-medium ring-1 ring-border";

const STEPS = ["Settings", "Categories", "Confirm"];
const WEEK_START_DAYS: WeekStartDay[] = ["Monday", "Sunday", "Saturday"];
const CURRENCY_CODES = ["USD", "EUR", "GBP", "TZS"];

interface CategoryRow {
  key: string;
  name: string;
  type: CategoryType;
  budgetPeriod: BudgetPeriod;
  amount: string;
  checked: boolean;
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string | undefined;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-2 border-t py-4 first:border-t-0 first:pt-0 sm:grid-cols-[1fr_260px] sm:items-center">
      <span>
        <span className="block text-[14px]">{label}</span>
        {hint && <span className="block text-[12px] text-muted-foreground">{hint}</span>}
      </span>
      <span>
        {children}
        {error && <span className="mt-1 block text-[12px] text-danger">{error}</span>}
      </span>
    </label>
  );
}

export function StartPage() {
  const view = useAppView();
  const { dispatch } = useAppData();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [currency, setCurrency] = useState("USD");
  const [weekStartDay, setWeekStartDay] = useState<WeekStartDay>("Monday");
  const [baseline, setBaseline] = useState("");
  const [buffer, setBuffer] = useState("");
  const [rows, setRows] = useState<CategoryRow[]>(() =>
    starterCategories().map((category, index) => ({
      key: `${index}-${category.name}`,
      name: category.name,
      type: category.type,
      budgetPeriod: category.budgetPeriod,
      amount: "",
      checked: true,
    })),
  );
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [confirmed, setConfirmed] = useState(false);

  if (view === null) return <MainSkeleton />;
  const isDemo = view.isDemo;

  const touch = (key: string) => setTouched((current) => ({ ...current, [key]: true }));
  const updateRow = (index: number, patch: Partial<CategoryRow>) =>
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const baselineValue = parseMoneyInput(baseline);
  const bufferValue = parseMoneyInput(buffer);
  const currencyInvalid = currency.trim() === "";
  const settingsValid = !currencyInvalid && baselineValue !== null && bufferValue !== null;

  const amountOf = (text: string): number | null =>
    text.trim() === "" ? 0 : parseMoneyInput(text);
  const activeRows = rows.filter((row) => row.checked);
  const noCategories = activeRows.length === 0;
  const badAmount = activeRows.some((row) => amountOf(row.amount) === null);
  const categoriesValid = !noCategories && !badAmount;

  const categoriesPayload: NewCategory[] = activeRows.map((row) => ({
    name: row.name,
    type: row.type,
    budgetAmount: amountOf(row.amount) ?? 0,
    budgetPeriod: row.budgetPeriod,
  }));

  const canStart = isDemo || confirmed;

  const startFresh = () => {
    if (!settingsValid || !categoriesValid || !canStart) return;
    dispatch({
      type: "startFreshWithCategories",
      settings: {
        currency: currency.trim(),
        weekStartDay,
        baselineWeeklyIncome: baselineValue ?? 0,
        openingBufferBalance: bufferValue ?? 0,
      },
      categories: categoriesPayload,
    });
    navigate({ to: "/" });
  };

  const stepTouched =
    touched["step-1"] ||
    touched["currency"] ||
    touched["baseline"] ||
    touched["buffer"] ||
    Object.keys(touched).some((key) => key.startsWith("amount-"));

  return (
    <div>
      <PageHeader title="Start fresh" subtitle="Set up your planner in three steps." />

      {!isDemo && (
        <div className="mb-6 rounded-[10px] bg-warn/10 px-4 py-3 text-[13px] text-warn">
          You already have your own data. Continuing replaces everything you have saved — income,
          transactions, bills and goals.
        </div>
      )}

      <ol className="mb-4 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted-foreground">
        {STEPS.map((label, index) => (
          <li key={label} className={index === step ? "font-medium text-foreground" : ""}>
            {index + 1}. {label}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <Panel title="Your settings">
          <Field label="Currency" hint="Any code works, e.g. USD or TZS">
            <input
              className={field}
              value={currency}
              list="starter-currencies"
              aria-label="Currency"
              onChange={(event) => setCurrency(event.target.value)}
              onBlur={() => touch("currency")}
            />
            <datalist id="starter-currencies">
              {CURRENCY_CODES.map((code) => (
                <option key={code} value={code} />
              ))}
            </datalist>
          </Field>
          {touched["currency"] && currencyInvalid && (
            <p className="text-[12px] text-danger">Enter a currency code.</p>
          )}
          <Field label="Week starts on" hint="Defines your weekly period">
            <select
              className={field}
              value={weekStartDay}
              aria-label="Week starts on"
              onChange={(event) => setWeekStartDay(event.target.value as WeekStartDay)}
            >
              {WEEK_START_DAYS.map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Baseline weekly income" hint="A conservative, lean-week figure">
            <input
              className={field}
              value={baseline}
              inputMode="decimal"
              placeholder="0"
              aria-label="Baseline weekly income"
              onChange={(event) => setBaseline(event.target.value)}
              onBlur={() => touch("baseline")}
            />
          </Field>
          {touched["baseline"] && baselineValue === null && (
            <p className="text-[12px] text-danger">Enter a valid baseline weekly income.</p>
          )}
          <Field label="Opening buffer balance" hint="Starting amount in your buffer">
            <input
              className={field}
              value={buffer}
              inputMode="decimal"
              placeholder="0"
              aria-label="Opening buffer balance"
              onChange={(event) => setBuffer(event.target.value)}
              onBlur={() => touch("buffer")}
            />
          </Field>
          {touched["buffer"] && bufferValue === null && (
            <p className="text-[12px] text-danger">Enter a valid opening buffer balance.</p>
          )}
        </Panel>
      )}

      {step === 1 && (
        <Panel title="Starter categories">
          <p className="mb-4 text-[13px] text-muted-foreground">
            Untick anything you do not use. Set an amount and period for the rest.
          </p>
          <ul className="flex flex-col divide-y divide-border">
            {rows.map((row, index) => (
              <li
                key={row.key}
                className="grid gap-3 py-4 first:pt-0 sm:grid-cols-[auto_1fr_130px_130px] sm:items-center"
              >
                <input
                  type="checkbox"
                  checked={row.checked}
                  aria-label={`Include ${row.name}`}
                  onChange={(event) => {
                    touch("step-1");
                    updateRow(index, { checked: event.target.checked });
                  }}
                />
                <span className="flex items-center gap-2">
                  <span className="text-[14px]">{row.name}</span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                    {row.type}
                  </span>
                </span>
                <input
                  className={field}
                  value={row.amount}
                  disabled={!row.checked}
                  inputMode="decimal"
                  placeholder="0"
                  aria-label={`${row.name} amount`}
                  onChange={(event) => updateRow(index, { amount: event.target.value })}
                  onBlur={() => touch(`amount-${index}`)}
                />
                <select
                  className={field}
                  value={row.budgetPeriod}
                  disabled={!row.checked}
                  aria-label={`${row.name} period`}
                  onChange={(event) =>
                    updateRow(index, { budgetPeriod: event.target.value as BudgetPeriod })
                  }
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </li>
            ))}
          </ul>
          {stepTouched && noCategories && (
            <p className="mt-3 text-[12px] text-danger">Choose at least one category.</p>
          )}
          {stepTouched && !noCategories && badAmount && (
            <p className="mt-3 text-[12px] text-danger">
              Enter a valid amount for each selected category.
            </p>
          )}
        </Panel>
      )}

      {step === 2 && (
        <Panel title="Confirm">
          <p className="text-[14px]">
            {isDemo
              ? "This replaces the demo data and starts your own planner with the categories you chose."
              : "This replaces everything you have saved and starts a fresh planner with the categories you chose."}
          </p>
          <dl className="mt-4 grid gap-2 text-[13px] sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Currency</dt>
              <dd className="font-medium">{currency.trim()}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Week starts on</dt>
              <dd className="font-medium">{weekStartDay}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Categories</dt>
              <dd className="font-medium">{activeRows.length}</dd>
            </div>
          </dl>
          {!isDemo && (
            <label className="mt-5 flex items-center gap-2 text-[13px]">
              <input
                type="checkbox"
                checked={confirmed}
                aria-label="Confirm replace"
                onChange={(event) => setConfirmed(event.target.checked)}
              />
              I understand this replaces all my saved data.
            </label>
          )}
        </Panel>
      )}

      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          className={secondary}
          disabled={step === 0}
          onClick={() => setStep((current) => Math.max(0, current - 1))}
        >
          Back
        </button>
        {step < 2 ? (
          <button
            type="button"
            className={primary}
            disabled={step === 0 ? !settingsValid : !categoriesValid}
            onClick={() => setStep((current) => Math.min(2, current + 1))}
          >
            Next
          </button>
        ) : (
          <button type="button" className={primary} disabled={!canStart} onClick={startFresh}>
            Start fresh
          </button>
        )}
      </div>
    </div>
  );
}
