import { useEffect, useState, type FormEvent } from "react";

import { parseMoneyInput } from "@/lib/moneyInput";
import { useAppData } from "@/lib/store/context";
import { appReducer, type AppAction } from "@/lib/store/reducer";
import { isISODate } from "@/lib/store/validate";
import type { Goal } from "@/lib/types";
import { Panel } from "./Panel";

const field =
  "w-full rounded-[10px] bg-muted px-3 py-2.5 text-[13px] text-foreground ring-1 ring-border outline-none placeholder:text-muted-foreground focus:ring-primary/50 disabled:opacity-60";
const COOLDOWN_MS = 600;

type Message = { kind: "success" | "error"; text: string } | null;

export function GoalForm({ editing, onCancel }: { editing: Goal | null; onCancel: () => void }) {
  const { data, dispatch } = useAppData();
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [savedAmount, setSavedAmount] = useState("0");
  const [targetDate, setTargetDate] = useState("");
  const [attempted, setAttempted] = useState(false);
  const [message, setMessage] = useState<Message>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!editing) return;
    setName(editing.name);
    setTargetAmount(String(editing.targetAmount));
    setSavedAmount(String(editing.savedAmount));
    setTargetDate(editing.targetDate ?? "");
    setAttempted(false);
    setMessage(null);
  }, [editing]);

  const targetValue = parseMoneyInput(targetAmount);
  const savedValue = parseMoneyInput(savedAmount);
  const nameInvalid = name.trim() === "";
  const targetInvalid = targetValue === null || targetValue <= 0;
  const savedInvalid = savedValue === null;
  const dateInvalid = targetDate !== "" && !isISODate(targetDate);
  const valid = !nameInvalid && !targetInvalid && !savedInvalid && !dateInvalid;

  const resetFields = () => {
    setName("");
    setTargetAmount("");
    setSavedAmount("0");
    setTargetDate("");
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
      targetAmount: targetValue ?? 0,
      savedAmount: savedValue ?? 0,
      ...(targetDate !== "" ? { targetDate } : {}),
    };
    const action: AppAction = editing
      ? { type: "updateGoal", item: { ...fields, id: editing.id } }
      : { type: "addGoal", item: fields };
    const result = appReducer(data, action);
    if (!result.ok) {
      setMessage({ kind: "error", text: result.error });
      return;
    }
    dispatch(action);
    resetFields();
    setMessage({ kind: "success", text: editing ? "Goal updated" : "Goal added" });
    if (editing) onCancel();
    setSubmitting(true);
    setTimeout(() => setSubmitting(false), COOLDOWN_MS);
  };

  return (
    <Panel title={editing ? "Edit goal" : "Add goal"}>
      <form className="flex flex-col gap-3" onSubmit={submit}>
        <input
          className={field}
          value={name}
          placeholder="Name"
          aria-label="Goal name"
          onChange={(event) => {
            setName(event.target.value);
            setMessage(null);
          }}
        />
        {attempted && nameInvalid && (
          <p className="-mt-1 text-[12px] text-danger">Enter a goal name.</p>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <input
            className={field}
            value={targetAmount}
            inputMode="decimal"
            placeholder="Target amount"
            aria-label="Goal target"
            onChange={(event) => {
              setTargetAmount(event.target.value);
              setMessage(null);
            }}
          />
          <input
            className={field}
            value={savedAmount}
            inputMode="decimal"
            placeholder="Saved amount"
            aria-label="Goal saved"
            onChange={(event) => {
              setSavedAmount(event.target.value);
              setMessage(null);
            }}
          />
        </div>
        {attempted && targetInvalid && (
          <p className="-mt-1 text-[12px] text-danger">Enter a target greater than zero.</p>
        )}
        {attempted && savedInvalid && (
          <p className="-mt-1 text-[12px] text-danger">Enter a saved amount of zero or more.</p>
        )}

        <input
          className={field}
          type="date"
          value={targetDate}
          aria-label="Goal target date"
          onChange={(event) => {
            setTargetDate(event.target.value);
            setMessage(null);
          }}
        />
        {attempted && dateInvalid && (
          <p className="-mt-1 text-[12px] text-danger">Enter a valid date (YYYY-MM-DD).</p>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-[10px] bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {editing ? "Save changes" : "Add goal"}
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
