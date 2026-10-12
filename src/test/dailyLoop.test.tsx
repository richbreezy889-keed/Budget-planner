import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { bufferView, thisWeekView } from "@/lib/selectors";
import { AppDataProvider } from "@/lib/store/AppDataProvider";
import { createSeedData, startFresh } from "@/lib/store/seed";
import type { StorageAdapter } from "@/lib/store/storage";
import { useAppView } from "@/lib/store/useAppView";
import type { AppData } from "@/lib/types";
import { BufferPage } from "@/routes/buffer";
import { ThisWeek } from "@/routes/index";

function loopData(): AppData {
  const data = startFresh({
    currency: "USD",
    weekStartDay: "Monday",
    baselineWeeklyIncome: 500,
    openingBufferBalance: 1000,
  });
  data.categories = [
    { id: "c1", name: "Fun", type: "flexible", budgetAmount: 200, budgetPeriod: "weekly" },
  ];
  return data;
}

function adapterFor(data: AppData): StorageAdapter {
  return {
    load: vi.fn(() => ({ data, status: "seeded" as const })),
    save: vi.fn(() => ({ ok: true as const })),
    clear: vi.fn(),
  };
}

function LoopProbe() {
  const view = useAppView();
  if (view === null) return null;
  const week = thisWeekView(view.data, view.today);
  const buffer = bufferView(view.data, view.today);
  return (
    <div data-testid="probe">{`safe=${week.safeToSpend};income=${week.incomeLogged};buffer=${buffer.bufferBalance};change=${buffer.changeThisWeek}`}</div>
  );
}

function renderLoop(data: AppData = loopData()) {
  render(
    <AppDataProvider storage={adapterFor(data)}>
      <div data-testid="week">
        <ThisWeek />
      </div>
      <div data-testid="buffer">
        <BufferPage />
      </div>
      <LoopProbe />
    </AppDataProvider>,
  );
}

const probe = () => screen.getByTestId("probe").textContent;

function addEntry(week: HTMLElement, kind: "income" | "spend", amount: string, note: string) {
  fireEvent.click(
    within(week).getByRole("button", { name: kind === "income" ? "Income" : "Spend" }),
  );
  fireEvent.change(within(week).getByLabelText("Amount"), { target: { value: amount } });
  if (kind === "spend") {
    fireEvent.change(within(week).getByLabelText("Category"), { target: { value: "c1" } });
  }
  fireEvent.change(within(week).getByLabelText("Note"), { target: { value: note } });
  fireEvent.click(within(week).getByRole("button", { name: "Add to week" }));
}

async function settle() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(700);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(Date.UTC(2026, 9, 19, 8, 0, 0)));
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("daily loop", () => {
  it("keeps safe-to-spend, income logged and the buffer in step through add, edit and delete", async () => {
    renderLoop();
    const week = screen.getByTestId("week");
    const bufferScope = screen.getByTestId("buffer");

    expect(probe()).toBe("safe=200;income=0;buffer=1000;change=0");
    expect(within(bufferScope).getByText("No history yet")).toBeInTheDocument();

    addEntry(week, "income", "300", "Pay");
    await settle();
    expect(probe()).toBe("safe=200;income=300;buffer=1000;change=300");
    expect(within(bufferScope).getByText("Buffer balance")).toBeInTheDocument();
    expect(within(bufferScope).getByText(/this week so far/)).toBeInTheDocument();

    addEntry(week, "spend", "50", "Food");
    await settle();
    expect(probe()).toBe("safe=150;income=300;buffer=1000;change=250");

    fireEvent.click(within(week).getByRole("button", { name: "Edit Food" }));
    const amount = within(week).getByLabelText("Amount");
    expect(amount).toHaveValue("50");
    fireEvent.change(amount, { target: { value: "80" } });
    fireEvent.click(within(week).getByRole("button", { name: "Save changes" }));
    await settle();
    expect(probe()).toBe("safe=120;income=300;buffer=1000;change=220");

    fireEvent.click(within(week).getByRole("button", { name: "Delete Food" }));
    fireEvent.click(within(week).getByRole("button", { name: "Confirm delete" }));
    expect(probe()).toBe("safe=200;income=300;buffer=1000;change=300");

    fireEvent.click(within(week).getByRole("button", { name: "Delete Pay" }));
    fireEvent.click(within(week).getByRole("button", { name: "Confirm delete" }));
    expect(probe()).toBe("safe=200;income=0;buffer=1000;change=0");
  });

  it("shows disabled controls in demo mode", () => {
    renderLoop(createSeedData());
    const week = screen.getByTestId("week");

    expect(within(week).getByText("Start fresh to add entries")).toBeInTheDocument();
    expect(within(week).getByLabelText("Amount")).toBeDisabled();
    expect(within(week).getByLabelText("Date")).toBeDisabled();
    expect(within(week).getByRole("button", { name: "Add to week" })).toBeDisabled();
    expect(within(week).queryByRole("button", { name: /^Edit / })).not.toBeInTheDocument();
    expect(within(week).queryByRole("button", { name: /^Delete / })).not.toBeInTheDocument();
  });
});
