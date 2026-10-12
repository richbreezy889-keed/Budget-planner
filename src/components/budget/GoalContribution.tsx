import { useEffect, useState, type FormEvent } from "react";

import { formatMoney } from "@/lib/format";
import { parseMoneyInput } from "@/lib/moneyInput";
import { useAppData } from "@/lib/store/context";
import { appReducer, type AppAction } from "@/lib/store/reducer";
import { isISODate } from "@/lib/store/validate";
import type { Category, Goal, ISODate } from "@/lib/types";

const field =
  "w-full rounded-[10px] bg-muted px-3 py-2.5 text-[13px] text-foreground ring-1 ring-border outline-none placeholder:text-muted-foreground focus:ring-primary/50 disabled:opacity-60";
const COOLDOWN_MS = 600;

type Message = { kind: "success" | "error"; text: string } | null;

/** A per-goal control that logs a savings contribution and updates the goal at once. */
export function GoalContribution({
  goal,
  categories,
  today,
}: {
  goal: Goal;
  categories: Category[];
  today: ISODate;
}) {
  const { data, dispatch } = useAppData();
  const savings = categories.filter((category) => category.type === "savings");
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today);
  const [categoryId, setCategoryId] = useState(savings[0]?.id ?? "");
  const [attempted, setAttempted] = useState(false);
  const [message, setMessage] = useState<Message>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (categoryId === "" && savings.length > 0) setCategoryId(savings[0]?.id ?? "");
  }, [savings, categoryId]);

  const amountValue = parseMoneyInput(amount);
  const amountInvalid = amountValue === null || amountValue <= 0;
  const dateInvalid = !isISODate(date);
  const categoryMissing = categoryId === "";
  const valid = !amountInvalid && !dateInvalid && !categoryMissing;

  const close = () => {
    setOpen(false);
    setAmount("");
    setDate(today);
    setAttempted(false);
    setMessage(null);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    setAttempted(true);
    if (!valid) {
      setMessage(null);
      return;
    }
    const action: AppAction = {
      type: "contributeToGoal",
      goalId: goal.id,
      amount: amountValue ?? 0,
      date,
      categoryId,
    };
    const result = appReducer(data, action);
    if (!result.ok) {
      setMessage({ kind: "error", text: result.error });
      return;
    }
    dispatch(action);
    setMessage({
      kind: "success",
      text: `Added ${formatMoney(amountValue ?? 0, data.settings.currency, { cents: true })} to ${goal.name}.`,
    });
    setAmount("");
    setDate(today);
    setAttempted(false);
    setSubmitting(true);
    window.setTimeout(() => setSubmitting(false), COOLDOWN_MS);
  };

  if (!open) {
    return (
      <button
        type="button"
        className="rounded-[10px] bg-muted px-3 py-1.5 text-[12px] font-medium ring-1 ring-border hover:bg-muted/80 disabled:opacity-60"
        aria-label={`Add to goal ${goal.name}`}
        disabled={savings.length === 0}
        onClick={() => setOpen(true)}
      >
        Add to goal
      </button>
    );
  }

  return (
    <form className="mt-3 flex flex-col gap-2" onSubmit={submit}>
      {savings.length === 0 ? (
        <p className="text-[12px] text-muted-foreground">
          Add a savings category in Budgets before contributing.
        </p>
      ) : (
        <>
          <input
            className={field}
            value={amount}
            inputMode="decimal"
            placeholder="Amount"
            aria-label="Contribution amount"
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
            aria-label="Contribution date"
            onChange={(event) => {
              setDate(event.target.value);
              setMessage(null);
            }}
          />
          {attempted && dateInvalid && (
            <p className="-mt-1 text-[12px] text-danger">Enter a valid date (YYYY-MM-DD).</p>
          )}

          <select
            className={field}
            value={categoryId}
            aria-label="Contribution category"
            onChange={(event) => {
              setCategoryId(event.target.value);
              setMessage(null);
            }}
          >
            {savings.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting || savings.length === 0}
          className="rounded-[10px] bg-primary px-3 py-2 text-[13px] font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          Add contribution
        </button>
        <button
          type="button"
          className="rounded-[10px] px-3 py-2 text-[13px] ring-1 ring-border"
          onClick={close}
        >
          Cancel
        </button>
      </div>

      {message && (
        <p
          className={`text-[12px] ${message.kind === "error" ? "text-danger" : "text-safe"}`}
          role={message.kind === "error" ? "alert" : "status"}
        >
          {message.text}
        </p>
      )}
    </form>
  );
}
