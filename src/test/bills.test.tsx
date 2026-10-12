import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppDataProvider } from "@/lib/store/AppDataProvider";
import { createSeedData, startFresh } from "@/lib/store/seed";
import type { LoadResult, SaveResult, StorageAdapter } from "@/lib/store/storage";
import type { AppData } from "@/lib/types";
import { BillsPage } from "@/routes/bills";

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

const emptyReal = () => {
  const data = startFresh({
    currency: "USD",
    weekStartDay: "Monday",
    baselineWeeklyIncome: 500,
    openingBufferBalance: 1000,
  });
  data.categories = [
    { id: "c1", name: "Rent", type: "essential", budgetAmount: 1200, budgetPeriod: "monthly" },
  ];
  return data;
};

const wrap = (adapter: StorageAdapter) => (
  <AppDataProvider storage={adapter}>
    <BillsPage />
  </AppDataProvider>
);

const savedData = (adapter: StorageAdapter) =>
  vi.mocked(adapter.save).mock.calls.at(-1)?.[0] as AppData;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(Date.UTC(2026, 9, 19, 8, 0, 0)));
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("Recurring bill management", () => {
  it("adds a bill", () => {
    const adapter = spyAdapter(emptyReal());
    render(wrap(adapter));

    fireEvent.change(screen.getByLabelText("Bill name"), { target: { value: "Internet" } });
    fireEvent.change(screen.getByLabelText("Bill amount"), { target: { value: "60" } });
    fireEvent.change(screen.getByLabelText("Bill period"), { target: { value: "monthly" } });
    fireEvent.change(screen.getByLabelText("Bill due day"), { target: { value: "5th" } });
    fireEvent.click(screen.getByRole("button", { name: "Add bill" }));

    expect(screen.getByText("Bill added")).toBeInTheDocument();
    expect(screen.getByText("Internet")).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(savedData(adapter).bills[0]).toMatchObject({
      name: "Internet",
      amount: 60,
      period: "monthly",
      categoryId: "c1",
      dueDay: "5th",
    });
  });

  it("edits a bill", () => {
    const data = emptyReal();
    data.bills = [
      {
        id: "b1",
        name: "Internet",
        amount: 60,
        period: "monthly",
        categoryId: "c1",
        dueDay: "5th",
      },
    ];
    const adapter = spyAdapter(data);
    render(wrap(adapter));

    fireEvent.click(screen.getByRole("button", { name: "Edit Internet" }));
    expect(screen.getByText("Edit bill")).toBeInTheDocument();
    expect(screen.getByLabelText("Bill name")).toHaveValue("Internet");
    fireEvent.change(screen.getByLabelText("Bill amount"), { target: { value: "75" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(screen.getByText("Bill updated")).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(savedData(adapter).bills[0]?.amount).toBe(75);
  });

  it("deletes a bill after confirmation", () => {
    const data = emptyReal();
    data.bills = [
      {
        id: "b1",
        name: "Internet",
        amount: 60,
        period: "monthly",
        categoryId: "c1",
        dueDay: "5th",
      },
    ];
    const adapter = spyAdapter(data);
    render(wrap(adapter));

    fireEvent.click(screen.getByRole("button", { name: "Delete Internet" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm delete" }));

    expect(screen.queryByText("Internet")).not.toBeInTheDocument();
    expect(screen.getByText("No bills yet")).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(savedData(adapter).bills).toHaveLength(0);
  });

  it("validates a new bill", () => {
    const adapter = spyAdapter(emptyReal());
    render(wrap(adapter));

    fireEvent.click(screen.getByRole("button", { name: "Add bill" }));

    expect(screen.getByText("Enter a bill name.")).toBeInTheDocument();
    expect(screen.getByText("Enter an amount greater than zero.")).toBeInTheDocument();
    expect(screen.getByText('Enter a due day such as "1st" or "Monday".')).toBeInTheDocument();
    expect(adapter.save).not.toHaveBeenCalled();
  });
});

describe("Savings goal management", () => {
  it("adds a goal with an optional target date", () => {
    const adapter = spyAdapter(emptyReal());
    render(wrap(adapter));

    fireEvent.change(screen.getByLabelText("Goal name"), { target: { value: "Holiday" } });
    fireEvent.change(screen.getByLabelText("Goal target"), { target: { value: "1000" } });
    fireEvent.change(screen.getByLabelText("Goal saved"), { target: { value: "100" } });
    fireEvent.change(screen.getByLabelText("Goal target date"), {
      target: { value: "2027-01-15" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add goal" }));

    expect(screen.getByText("Goal added")).toBeInTheDocument();
    expect(screen.getByText("Holiday")).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(savedData(adapter).goals[0]).toMatchObject({
      name: "Holiday",
      targetAmount: 1000,
      savedAmount: 100,
      targetDate: "2027-01-15",
    });
  });

  it("updates progress by editing the saved amount", () => {
    const data = emptyReal();
    data.goals = [{ id: "g1", name: "Holiday", targetAmount: 1000, savedAmount: 100 }];
    const adapter = spyAdapter(data);
    render(wrap(adapter));

    fireEvent.click(screen.getByRole("button", { name: "Edit Holiday" }));
    expect(screen.getByText("Edit goal")).toBeInTheDocument();
    expect(screen.getByLabelText("Goal saved")).toHaveValue("100");
    fireEvent.change(screen.getByLabelText("Goal saved"), { target: { value: "400" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(screen.getByText("Goal updated")).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(savedData(adapter).goals[0]?.savedAmount).toBe(400);
  });

  it("deletes a goal after confirmation", () => {
    const data = emptyReal();
    data.goals = [{ id: "g1", name: "Holiday", targetAmount: 1000, savedAmount: 100 }];
    const adapter = spyAdapter(data);
    render(wrap(adapter));

    fireEvent.click(screen.getByRole("button", { name: "Delete Holiday" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm delete" }));

    expect(screen.queryByText("Holiday")).not.toBeInTheDocument();
    expect(screen.getByText("No goals yet")).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(savedData(adapter).goals).toHaveLength(0);
  });

  it("validates a new goal", () => {
    const adapter = spyAdapter(emptyReal());
    render(wrap(adapter));

    fireEvent.click(screen.getByRole("button", { name: "Add goal" }));

    expect(screen.getByText("Enter a goal name.")).toBeInTheDocument();
    expect(screen.getByText("Enter a target greater than zero.")).toBeInTheDocument();
    expect(adapter.save).not.toHaveBeenCalled();
  });
});

describe("Bills & Goals in demo mode", () => {
  it("hides the management controls", () => {
    render(wrap(spyAdapter()));

    expect(screen.queryByText("Add bill")).not.toBeInTheDocument();
    expect(screen.queryByText("Add goal")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Edit / })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Delete / })).not.toBeInTheDocument();
  });
});
