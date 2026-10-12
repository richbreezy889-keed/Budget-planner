import { useEffect, useState, type FormEvent } from "react";

import { parseMoneyInput } from "@/lib/moneyInput";
import { useAppData } from "@/lib/store/context";
import { appReducer, type AppAction } from "@/lib/store/reducer";
import type { BudgetPeriod, Category, CategoryType } from "@/lib/types";
import { Panel } from "./Panel";

const field =
  "w-full rounded-[10px] bg-muted px-3 py-2.5 text-[13px] text-foreground ring-1 ring-border outline-none placeholder:text-muted-foreground focus:ring-primary/50 disabled:opacity-60";
const COOLDOWN_MS = 600;

type Message = { kind: "success" | "error"; text: string } | null;

export function CategoryForm({
  editing,
  onCancel,
}: {
  editing: Category | null;
  onCancel: () => void;
}) {
  const { data, dispatch } = useAppData();
  const [name, setName] = useState("");
  const [type, setType] = useState<CategoryType>("essential");
  const [amount, setAmount] = useState("");
  const [period, setPeriod] = useState<BudgetPeriod>("monthly");
  const [attempted, setAttempted] = useState(false);
  const [message, setMessage] = useState<Message>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!editing) return;
    setName(editing.name);
    setType(editing.type);
    setAmount(String(editing.budgetAmount));
    setPeriod(editing.budgetPeriod);
    setAttempted(false);
    setMessage(null);
  }, [editing]);

  const amountValue = parseMoneyInput(amount);
  const nameInvalid = name.trim() === "";
  const amountInvalid = amountValue === null;
  const valid = !nameInvalid && !amountInvalid;

  const resetFields = () => {
    setName("");
    setType("essential");
    setAmount("");
    setPeriod("monthly");
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    setAttempted(true);
    if (!valid) {
      setMessage(null);
      return;
    }
    const fields = {
      name: name.trim(),
      type,
      budgetAmount: amountValue ?? 0,
      budgetPeriod: period,
    };
    const action: AppAction = editing
      ? { type: "updateCategory", item: { ...fields, id: editing.id } }
      : { type: "addCategory", item: fields };
    const result = appReducer(data, action);
    if (!result.ok) {
      setMessage({ kind: "error", text: result.error });
      return;
    }
    dispatch(action);
    resetFields();
    setMessage({ kind: "success", text: editing ? "Category updated" : "Category added" });
    if (editing) onCancel();
    setSubmitting(true);
    setTimeout(() => setSubmitting(false), COOLDOWN_MS);
  };

  return (
    <Panel title={editing ? "Edit category" : "Add category"}>
      <form className="flex flex-col gap-3" onSubmit={submit}>
        <input
          className={field}
          value={name}
          placeholder="Name"
          aria-label="Category name"
          onChange={(event) => {
            setName(event.target.value);
            setMessage(null);
          }}
        />
        {attempted && nameInvalid && (
          <p className="-mt-1 text-[12px] text-danger">Enter a category name.</p>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <select
            className={field}
            value={type}
            aria-label="Category type"
            onChange={(event) => setType(event.target.value as typeof type)}
          >
            <option value="essential">Essential</option>
            <option value="savings">Savings</option>
            <option value="flexible">Flexible</option>
          </select>
          <select
            className={field}
            value={period}
            aria-label="Category period"
            onChange={(event) => setPeriod(event.target.value as typeof period)}
          >
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>

        <input
          className={field}
          value={amount}
          inputMode="decimal"
          placeholder="Amount"
          aria-label="Category amount"
          onChange={(event) => {
            setAmount(event.target.value);
            setMessage(null);
          }}
        />
        {attempted && amountInvalid && (
          <p className="-mt-1 text-[12px] text-danger">Enter an amount of zero or more.</p>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-[10px] bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {editing ? "Save changes" : "Add category"}
          </button>
          {editing && (
            <button
              type="button"
              className="rounded-[10px] px-4 py-2 text-sm ring-1 ring-border"
              onClick={() => {
                resetFields();
                setAttempted(false);
                setMessage(null);
                onCancel();
              }}
            >
              Cancel
            </button>
          )}
        </div>

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
