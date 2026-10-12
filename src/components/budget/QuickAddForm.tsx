import { useEffect, useRef, useState, type FormEvent } from "react";

import { parseMoneyInput } from "@/lib/moneyInput";
import { useAppData } from "@/lib/store/context";
import { appReducer, type AppAction } from "@/lib/store/reducer";
import { isISODate } from "@/lib/store/validate";
import type { Category, ISODate, WeekStartDay } from "@/lib/types";
import { weekLabel } from "@/lib/weekLabel";
import { Panel } from "./Panel";

const field =
  "w-full rounded-[10px] bg-muted px-3 py-2.5 text-[13px] text-foreground ring-1 ring-border outline-none placeholder:text-muted-foreground focus:ring-primary/50 disabled:opacity-60";
const typeLabel = { essential: "Essential", savings: "Savings", flexible: "Flexible" } as const;
const COOLDOWN_MS = 600;

type Mode = "income" | "spend";
type Message = { kind: "success" | "error"; text: string } | null;

export function QuickAddForm({
  categories,
  isDemo,
  weekStartDay,
  today,
}: {
  categories: Category[];
  isDemo: boolean;
  weekStartDay: WeekStartDay;
  today: ISODate;
}) {
  const { data, dispatch } = useAppData();
  const [mode, setMode] = useState<Mode>("spend");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today);
  const [note, setNote] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [attempted, setAttempted] = useState(false);
  const [message, setMessage] = useState<Message>(null);
  const [submitting, setSubmitting] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);
  const cooldownRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (categoryId === "" && categories.length > 0) setCategoryId(categories[0]?.id ?? "");
  }, [categories, categoryId]);

  useEffect(
    () => () => {
      if (cooldownRef.current !== undefined) clearTimeout(cooldownRef.current);
    },
    [],
  );

  const amountValue = parseMoneyInput(amount);
  const amountInvalid = amountValue === null || amountValue <= 0;
  const dateInvalid = !isISODate(date);
  const categoryMissing = mode === "spend" && categoryId === "";
  const valid = !amountInvalid && !dateInvalid && !categoryMissing;

  const reset = () => {
    setAmount("");
    setNote("");
    setDate(today);
    setCategoryId(categories[0]?.id ?? "");
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (isDemo || submitting) return;
    setAttempted(true);
    if (!valid) {
      setMessage(null);
      return;
    }
    const value = amountValue ?? 0;
    const action: AppAction =
      mode === "income"
        ? {
            type: "addIncome",
            item: { date, amount: value, source: note.trim() || "Income", note },
          }
        : { type: "addTransaction", item: { date, amount: value, categoryId, note } };
    const result = appReducer(data, action);
    if (!result.ok) {
      setMessage({ kind: "error", text: result.error });
      return;
    }
    dispatch(action);
    const label = weekLabel(date, weekStartDay);
    reset();
    setMessage({ kind: "success", text: `Added to week of ${label}` });
    setSubmitting(true);
    amountRef.current?.focus();
    cooldownRef.current = setTimeout(() => setSubmitting(false), COOLDOWN_MS);
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setAttempted(false);
    setMessage(null);
  };

  return (
    <Panel
      title="Quick add"
      action={
        isDemo ? (
          <span className="text-[11px] text-muted-foreground">Start fresh to add entries</span>
        ) : undefined
      }
    >
      <form className="flex flex-col gap-3" onSubmit={submit}>
        <div className="flex gap-2" role="group" aria-label="Entry type">
          {(["income", "spend"] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={mode === option}
              className={`flex-1 rounded-[10px] px-4 py-2 text-sm font-medium ring-1 ring-border disabled:opacity-60 ${
                mode === option ? "bg-primary text-primary-foreground ring-primary" : "bg-muted"
              }`}
              disabled={isDemo}
              onClick={() => switchMode(option)}
            >
              {option === "income" ? "Income" : "Spend"}
            </button>
          ))}
        </div>

        <input
          ref={amountRef}
          className={field}
          value={amount}
          inputMode="decimal"
          placeholder="Amount"
          aria-label="Amount"
          disabled={isDemo}
          onChange={(event) => {
            setAmount(event.target.value);
            setMessage(null);
          }}
        />
        {attempted && amountInvalid && (
          <p className="-mt-1 text-[12px] text-danger">Enter an amount greater than zero.</p>
        )}

        <input
          className={field}
          type="date"
          value={date}
          aria-label="Date"
          disabled={isDemo}
          onChange={(event) => {
            setDate(event.target.value);
            setMessage(null);
          }}
        />
        {attempted && dateInvalid && (
          <p className="-mt-1 text-[12px] text-danger">Enter a valid date (YYYY-MM-DD).</p>
        )}

        {mode === "spend" && (
          <>
            <select
              className={field}
              value={categoryId}
              aria-label="Category"
              disabled={isDemo}
              onChange={(event) => {
                setCategoryId(event.target.value);
                setMessage(null);
              }}
            >
              {categories.length === 0 && <option value="">No categories yet</option>}
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {typeLabel[category.type]} · {category.name}
                </option>
              ))}
            </select>
            {attempted && categoryMissing && (
              <p className="-mt-1 text-[12px] text-danger">
                Add a category in Budgets before logging spending.
              </p>
            )}
          </>
        )}

        <input
          className={field}
          value={note}
          placeholder="Note"
          aria-label="Note"
          disabled={isDemo}
          onChange={(event) => {
            setNote(event.target.value);
            setMessage(null);
          }}
        />

        <button
          type="submit"
          disabled={isDemo || submitting}
          className="self-start rounded-[10px] bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Add to week
        </button>

        {message && (
          <p
            className={`text-[13px] ${message.kind === "error" ? "text-danger" : "text-safe"}`}
            role={message.kind === "error" ? "alert" : "status"}
          >
            {message.text}
          </p>
        )}
      </form>
    </Panel>
  );
}
