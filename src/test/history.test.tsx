import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppDataProvider } from "@/lib/store/AppDataProvider";
import { createSeedData, startFresh } from "@/lib/store/seed";
import type { LoadResult, SaveResult, StorageAdapter } from "@/lib/store/storage";
import type { AppData, ISODate } from "@/lib/types";
import { HistoryPage } from "@/routes/history";

function spyAdapter(initial: AppData | null = null) {
  let stored = initial;
  const load = vi.fn((): LoadResult => ({
    data: stored ?? createSeedData(),
    status: stored ? "ok" : "seeded",
  }));
  const save = vi.fn((data: AppData): SaveResult => {
    stored = data;
    return { ok: true };
  });
  const clear = vi.fn(() => {
    stored = null;
  });
  const adapter: StorageAdapter = { load, save, clear };
  return adapter;
}

function addDays(iso: ISODate, days: number): ISODate {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(year!, month! - 1, day! + days);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${mm}-${dd}`;
}

const historyData = (): AppData => {
  const data = startFresh({
    currency: "USD",
    weekStartDay: "Monday",
    baselineWeeklyIncome: 500,
    openingBufferBalance: 0,
  });
  data.categories = [
    { id: "c1", name: "Groceries", type: "flexible", budgetAmount: 100, budgetPeriod: "weekly" },
  ];
  for (let index = 0; index < 14; index += 1) {
    const monday = addDays("2026-07-20", index * 7);
    data.transactions.push({
      id: `w${index}`,
      date: addDays(monday, 2),
      amount: 10 + index,
      categoryId: "c1",
      note: `Note week ${index}`,
    });
  }
  data.incomeEntries.push({
    id: "i1",
    date: "2026-10-21",
    amount: 500,
    source: "Pay",
    note: "Salary",
  });
  return data;
};

const wrap = (adapter: StorageAdapter) => (
  <AppDataProvider storage={adapter}>
    <HistoryPage />
  </AppDataProvider>
);

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(Date.UTC(2026, 9, 22, 8, 0, 0)));
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("History screen", () => {
  it("groups entries into weeks, newest first, with a week label", () => {
    render(wrap(spyAdapter(historyData())));

    expect(screen.getByText("Week of 19 Oct – 25 Oct 2026")).toBeInTheDocument();
    expect(screen.getByText("Salary")).toBeInTheDocument();
    expect(screen.getByText("Note week 13")).toBeInTheDocument();
  });

  it("shows twelve weeks at first and reveals more on demand", () => {
    render(wrap(spyAdapter(historyData())));

    expect(screen.getByText("Week of 12 Oct – 18 Oct 2026")).toBeInTheDocument();
    expect(screen.queryByText("Week of 20 Jul – 26 Jul 2026")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Show more" }));

    expect(screen.getByText("Week of 20 Jul – 26 Jul 2026")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Show more" })).not.toBeInTheDocument();
  });

  it("filters by type, category and note text", () => {
    render(wrap(spyAdapter(historyData())));

    fireEvent.change(screen.getByLabelText("Type"), { target: { value: "spend" } });
    expect(screen.queryByText("Salary")).not.toBeInTheDocument();
    expect(screen.getByText("Note week 13")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Type"), { target: { value: "all" } });
    fireEvent.change(screen.getByLabelText("Category"), { target: { value: "c1" } });
    expect(screen.queryByText("Salary")).not.toBeInTheDocument();
    expect(screen.getByText("Note week 5")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Category"), { target: { value: "all" } });
    fireEvent.change(screen.getByLabelText("Search notes"), { target: { value: "week 5" } });
    expect(screen.getByText("Note week 5")).toBeInTheDocument();
    expect(screen.queryByText("Note week 6")).not.toBeInTheDocument();
    expect(screen.queryByText("Salary")).not.toBeInTheDocument();
  });

  it("edits an entry from an older week through the shared form", () => {
    const adapter = spyAdapter(historyData());
    render(wrap(adapter));

    fireEvent.click(screen.getByRole("button", { name: "Edit Note week 5" }));
    expect(screen.getByText("Edit entry")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "99" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(screen.getByText("−$99.00")).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(500);
    });
    const saved = vi.mocked(adapter.save).mock.calls.at(-1)?.[0] as AppData;
    expect(saved.transactions.find((row) => row.id === "w5")?.amount).toBe(99);
  });

  it("deletes an entry from an older week after confirmation", () => {
    const adapter = spyAdapter(historyData());
    render(wrap(adapter));

    fireEvent.click(screen.getByRole("button", { name: "Delete Note week 6" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm delete" }));

    expect(screen.queryByText("Note week 6")).not.toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(500);
    });
    const saved = vi.mocked(adapter.save).mock.calls.at(-1)?.[0] as AppData;
    expect(saved.transactions.some((row) => row.id === "w6")).toBe(false);
  });

  it("hides the management controls in demo mode", () => {
    render(wrap(spyAdapter()));

    expect(screen.queryByRole("button", { name: /^Edit / })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Delete / })).not.toBeInTheDocument();
  });
});
