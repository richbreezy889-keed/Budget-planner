import { useEffect, useState, type FormEvent } from "react";

import { parseMoneyInput } from "@/lib/moneyInput";
import { useAppData } from "@/lib/store/context";
import { appReducer, type AppAction } from "@/lib/store/reducer";
import type { BillPeriod, RecurringBill } from "@/lib/types";
import { Panel } from "./Panel";

const field =
  "w-full rounded-[10px] bg-muted px-3 py-2.5 text-[13px] text-foreground ring-1 ring-border outline-none placeholder:text-muted-foreground focus:ring-primary/50 disabled:opacity-60";
const COOLDOWN_MS = 600;

type Message = { kind: "success" | "error"; text: string } | null;

export function BillForm({
  editing,
  onCancel,
}: {
  editing: RecurringBill | null;
  onCancel: () => void;
}) {
  const { data, dispatch } = useAppData();
  const categories = data.categories;
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [period, setPeriod] = useState<BillPeriod>("monthly");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [dueDay, setDueDay] = useState("");
  const [attempted, setAttempted] = useState(false);
  const [message, setMessage] = useState<Message>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (categories.length > 0 && categoryId === "") setCategoryId(categories[0]?.id ?? "");
  }, [categories, categoryId]);

  useEffect(() => {
    if (!editing) return;
    setName(editing.name);
    setAmount(String(editing.amount));
    setPeriod(editing.period);
    setCategoryId(editing.categoryId);
    setDueDay(editing.dueDay);
    setAttempted(false);
    setMessage(null);
  }, [editing]);

  const amountValue = parseMoneyInput(amount);
  const nameInvalid = name.trim() === "";
  const amountInvalid = amountValue === null || amountValue <= 0;
  const categoryInvalid = categoryId === "";
  const dueInvalid = dueDay.trim() === "";
  const valid = !nameInvalid && !amountInvalid && !categoryInvalid && !dueInvalid;

  const resetFields = () => {
    setName("");
    setAmount("");
    setPeriod("monthly");
    setCategoryId(categories[0]?.id ?? "");
    setDueDay("");
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
      amount: amountValue ?? 0,
      period,
      categoryId,
      dueDay: dueDay.trim(),
    };
    const action: AppAction = editing
      ? { type: "updateBill", item: { ...fields, id: editing.id } }
      : { type: "addBill", item: fields };
    const result = appReducer(data, action);
    if (!result.ok) {
      setMessage({ kind: "error", text: result.error });
      return;
    }
    dispatch(action);
    resetFields();
    setMessage({ kind: "success", text: editing ? "Bill updated" : "Bill added" });
    if (editing) onCancel();
    setSubmitting(true);
    setTimeout(() => setSubmitting(false), COOLDOWN_MS);
  };

  return (
    <Panel title={editing ? "Edit bill" : "Add bill"}>
      <form className="flex flex-col gap-3" onSubmit={submit}>
        <input
          className={field}
          value={name}
          placeholder="Name"
          aria-label="Bill name"
          onChange={(event) => {
            setName(event.target.value);
            setMessage(null);
          }}
        />
        {attempted && nameInvalid && (
          <p className="-mt-1 text-[12px] text-danger">Enter a bill name.</p>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <input
            className={field}
            value={amount}
            inputMode="decimal"
            placeholder="Amount"
            aria-label="Bill amount"
            onChange={(event) => {
              setAmount(event.target.value);
              setMessage(null);
            }}
          />
          <select
            className={field}
            value={period}
            aria-label="Bill period"
            onChange={(event) => setPeriod(event.target.value as typeof period)}
          >
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>
        {attempted && amountInvalid && (
          <p className="-mt-1 text-[12px] text-danger">Enter an amount greater than zero.</p>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <select
            className={field}
            value={categoryId}
            aria-label="Bill category"
            onChange={(event) => setCategoryId(event.target.value)}
          >
            {categories.length === 0 && <option value="">No categories yet</option>}
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <input
            className={field}
            value={dueDay}
            placeholder='Due day, e.g. "1st"'
            aria-label="Bill due day"
            onChange={(event) => {
              setDueDay(event.target.value);
              setMessage(null);
            }}
          />
        </div>
        {attempted && categoryId === "" && (
          <p className="-mt-1 text-[12px] text-danger">Add a category in Budgets first.</p>
        )}
        {attempted && dueDay.trim() === "" && (
          <p className="-mt-1 text-[12px] text-danger">
            Enter a due day such as "1st" or "Monday".
          </p>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-[10px] bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {editing ? "Save changes" : "Add bill"}
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
