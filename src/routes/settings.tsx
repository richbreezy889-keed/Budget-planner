import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { MainSkeleton } from "@/components/budget/AppShell";
import { PageHeader, Panel } from "@/components/budget/Panel";
import { isValidCurrencyCode, normalizeCurrency } from "@/lib/format";
import { parseMoneyInput } from "@/lib/moneyInput";
import {
  backupFileName,
  backupJson,
  isFileTooLarge,
  summarizeBackup,
  type BackupSummary,
} from "@/lib/store/backup";
import { useAppData } from "@/lib/store/context";
import { useAppView } from "@/lib/store/useAppView";
import { importData } from "@/lib/store/validate";
import type { AppData, Settings, WeekStartDay } from "@/lib/types";

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

type ImportState =
  | { kind: "idle" }
  | { kind: "error"; errors: string[] }
  | { kind: "confirm"; data: AppData; summary: BackupSummary }
  | { kind: "done" };

function readFileText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(reader.error ?? new Error("Could not read the file."));
    reader.readAsText(file);
  });
}

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
  const { data, dispatch } = useAppData();
  const [currency, setCurrency] = useState(settings.currency);
  const [weekStartDay, setWeekStartDay] = useState<WeekStartDay>(settings.weekStartDay);
  const [baseline, setBaseline] = useState(String(settings.baselineWeeklyIncome));
  const [buffer, setBuffer] = useState(String(settings.openingBufferBalance));
  const [saved, setSaved] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [importState, setImportState] = useState<ImportState>({ kind: "idle" });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const baselineValue = parseMoneyInput(baseline);
  const bufferValue = parseMoneyInput(buffer);
  const currencyInvalid = !isValidCurrencyCode(normalizeCurrency(currency));
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
        currency: normalizeCurrency(currency),
        weekStartDay,
        baselineWeeklyIncome: baselineValue ?? 0,
        openingBufferBalance: bufferValue ?? 0,
      },
    });
    setSaved(true);
  };

  const downloadBackup = () => {
    if (typeof URL === "undefined" || typeof URL.createObjectURL !== "function") return;
    const blob = new Blob([backupJson(data)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = backupFileName(new Date());
    anchor.rel = "noopener";
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const onFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const file = input.files?.[0];
    if (!file) return;
    if (isFileTooLarge(file.size)) {
      setImportState({ kind: "error", errors: ["File is too large. Choose a file under 5 MB."] });
      input.value = "";
      return;
    }
    let text: string;
    try {
      text = await readFileText(file);
    } catch {
      setImportState({ kind: "error", errors: ["Could not read the file."] });
      input.value = "";
      return;
    }
    const result = importData(text);
    if (!result.ok) {
      setImportState({ kind: "error", errors: result.errors.slice(0, 5) });
    } else {
      setImportState({ kind: "confirm", data: result.data, summary: summarizeBackup(result.data) });
    }
    input.value = "";
  };

  const confirmImport = () => {
    if (importState.kind !== "confirm") return;
    dispatch({ type: "replaceAll", data: importState.data });
    setImportState({ kind: "done" });
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
              setCurrency(event.target.value.toUpperCase());
              setSaved(false);
            }}
          />
          <datalist id="settings-currencies">
            {CURRENCY_CODES.map((code) => (
              <option key={code} value={code} />
            ))}
          </datalist>
          {showErrors && currencyInvalid && (
            <div className="mt-1 text-[12px] text-danger">Enter a three-letter currency code.</div>
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
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={downloadBackup}
            className="rounded-[10px] bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Export JSON
          </button>
          <label className="cursor-pointer rounded-[10px] bg-muted px-4 py-2 text-sm ring-1 ring-border hover:bg-muted/80">
            Import JSON
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="sr-only"
              aria-label="Import JSON file"
              onChange={onFileChange}
            />
          </label>
        </div>

        {importState.kind === "error" && (
          <div className="mt-4 rounded-[10px] bg-danger/10 px-4 py-3 text-[13px] text-danger">
            <p className="font-medium">Could not import this file.</p>
            <ul className="mt-1 list-disc pl-5">
              {importState.errors.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          </div>
        )}

        {importState.kind === "confirm" && (
          <div className="mt-4 rounded-[10px] bg-muted px-4 py-3 text-[13px]">
            <p className="font-medium">Ready to import</p>
            <p className="mt-1 text-muted-foreground">
              Income {importState.summary.incomeEntries} · Transactions{" "}
              {importState.summary.transactions} · Categories {importState.summary.categories} ·
              Bills {importState.summary.bills} · Goals {importState.summary.goals}
            </p>
            <p className="mt-2">This replaces everything you have saved.</p>
            <div className="mt-3 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={downloadBackup}
                className="rounded-[10px] bg-muted px-4 py-2 text-sm ring-1 ring-border hover:bg-muted/80"
              >
                Download current data first
              </button>
              <button
                type="button"
                onClick={confirmImport}
                className="rounded-[10px] bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Replace all data
              </button>
              <button
                type="button"
                onClick={() => setImportState({ kind: "idle" })}
                className="rounded-[10px] px-4 py-2 text-sm ring-1 ring-border"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {importState.kind === "done" && (
          <p className="mt-4 text-[13px] text-safe">Imported. Your data has been replaced.</p>
        )}
      </Panel>
    </div>
  );
}
