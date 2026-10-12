import { fireEvent, render, screen } from "@testing-library/react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppDataProvider } from "@/lib/store/AppDataProvider";
import { createSeedData, startFresh } from "@/lib/store/seed";
import type { StorageAdapter } from "@/lib/store/storage";
import type { AppData } from "@/lib/types";
import { QuickAddForm } from "./QuickAddForm";

const categories = [
  {
    id: "c1",
    name: "Rent",
    type: "essential" as const,
    budgetAmount: 1300,
    budgetPeriod: "monthly" as const,
  },
];

function demoAdapter(): StorageAdapter {
  const data = createSeedData();
  return {
    load: vi.fn(() => ({ data, status: "seeded" as const })),
    save: vi.fn(() => ({ ok: true as const })),
    clear: vi.fn(),
  };
}

function realAdapter(): StorageAdapter {
  const data = startFresh({
    currency: "USD",
    weekStartDay: "Monday",
    baselineWeeklyIncome: 500,
    openingBufferBalance: 0,
  });
  data.categories = [
    {
      id: "c1",
      name: "Groceries",
      type: "flexible",
      budgetAmount: 200,
      budgetPeriod: "weekly",
    },
  ];
  data.transactions = [
    { id: "t1", date: "2026-10-20", amount: 40, categoryId: "c1", note: "Food" },
  ];
  return {
    load: vi.fn(() => ({ data, status: "seeded" as const })),
    save: vi.fn(() => ({ ok: true as const })),
    clear: vi.fn(),
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(Date.UTC(2026, 9, 19, 8, 0, 0)));
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("QuickAddForm", () => {
  it("stays disabled in demo mode and explains how to add entries", () => {
    render(
      <AppDataProvider storage={demoAdapter()}>
        <QuickAddForm categories={categories} isDemo weekStartDay="Monday" today="2026-10-19" />
      </AppDataProvider>,
    );

    expect(screen.getByText("Start fresh to add entries")).toBeInTheDocument();
    expect(screen.getByLabelText("Amount")).toBeDisabled();
    expect(screen.getByLabelText("Date")).toBeDisabled();
    expect(screen.getByLabelText("Category")).toBeDisabled();
    expect(screen.getByLabelText("Note")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Add to week" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Income" })).toBeDisabled();
    expect(screen.getByRole("option", { name: "Essential · Rent" })).toBeTruthy();
  });

  it("adds income, clears the form and names the week it landed in", () => {
    const adapter = realAdapter();
    render(
      <AppDataProvider storage={adapter}>
        <QuickAddForm
          categories={categories}
          isDemo={false}
          weekStartDay="Monday"
          today="2026-10-19"
        />
      </AppDataProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Income" }));
    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "250" } });
    fireEvent.change(screen.getByLabelText("Note"), { target: { value: "Pay" } });
    fireEvent.click(screen.getByRole("button", { name: "Add to week" }));

    expect(screen.getByText("Added to week of Mon 19 Oct")).toBeInTheDocument();
    expect(screen.getByLabelText("Amount")).toHaveValue("");

    act(() => {
      vi.advanceTimersByTime(500);
    });
    const lastSaved = vi.mocked(adapter.save).mock.calls.at(-1)?.[0] as {
      incomeEntries: unknown[];
    };
    expect(lastSaved.incomeEntries).toHaveLength(1);
  });

  it("refuses an amount of zero with an inline message", () => {
    render(
      <AppDataProvider storage={realAdapter()}>
        <QuickAddForm
          categories={categories}
          isDemo={false}
          weekStartDay="Monday"
          today="2026-10-19"
        />
      </AppDataProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Add to week" }));
    expect(screen.getByText("Enter an amount greater than zero.")).toBeInTheDocument();
  });

  it("edits an existing spending entry through the same form", () => {
    const adapter = realAdapter();
    const onCancel = vi.fn();
    render(
      <AppDataProvider storage={adapter}>
        <QuickAddForm
          categories={categories}
          isDemo={false}
          weekStartDay="Monday"
          today="2026-10-19"
          editing={{
            kind: "spend",
            transaction: {
              id: "t1",
              date: "2026-10-20",
              amount: 40,
              categoryId: "c1",
              note: "Food",
            },
          }}
          onCancel={onCancel}
        />
      </AppDataProvider>,
    );

    expect(screen.getByLabelText("Amount")).toHaveValue("40");
    expect(screen.getByLabelText("Note")).toHaveValue("Food");

    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "55" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(onCancel).toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(500);
    });
    const lastSaved = vi.mocked(adapter.save).mock.calls.at(-1)?.[0] as AppData;
    expect(lastSaved.transactions[0]?.amount).toBe(55);
  });
});
