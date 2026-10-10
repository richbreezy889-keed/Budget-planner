import { render, screen } from "@testing-library/react";
import type { ComponentType } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppDataProvider } from "@/lib/store/AppDataProvider";
import { createSeedData, startFresh } from "@/lib/store/seed";
import type { LoadResult, SaveResult, StorageAdapter } from "@/lib/store/storage";
import type { AppData } from "@/lib/types";
import { BudgetsPage } from "@/routes/budgets";
import { ThisWeek } from "@/routes/index";

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

const emptyReal = () =>
  startFresh({
    currency: "USD",
    weekStartDay: "Monday",
    baselineWeeklyIncome: 500,
    openingBufferBalance: 1000,
  });

const wrap = (adapter: StorageAdapter, Page: ComponentType) => (
  <AppDataProvider storage={adapter}>
    <Page />
  </AppDataProvider>
);

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(Date.UTC(2026, 9, 19, 8, 0, 0)));
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("Empty states for non-demo data", () => {
  it("This Week explains how to get a safe-to-spend figure", () => {
    render(wrap(spyAdapter(emptyReal()), ThisWeek));

    expect(screen.getByText("Set a flexible budget to see your safe-to-spend")).toBeInTheDocument();
    expect(screen.queryByText("Safe to spend this week")).not.toBeInTheDocument();
  });

  it("Budgets explains there are no categories", () => {
    render(wrap(spyAdapter(emptyReal()), BudgetsPage));

    expect(screen.getByText("No budget categories yet")).toBeInTheDocument();
    expect(screen.queryByText("Essential")).not.toBeInTheDocument();
  });

  it("never treats demo data as empty", () => {
    render(wrap(spyAdapter(), ThisWeek));

    expect(screen.getByText("Safe to spend this week")).toBeInTheDocument();
    expect(
      screen.queryByText("Set a flexible budget to see your safe-to-spend"),
    ).not.toBeInTheDocument();
  });
});
