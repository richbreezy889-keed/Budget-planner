import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { WeekNotice } from "./WeekNotice";
import { thisWeekView } from "@/lib/selectors";
import type { AppData } from "@/lib/types";

const baseData = (): AppData => ({
  version: 1,
  isDemo: false,
  settings: {
    currency: "USD",
    weekStartDay: "Monday",
    baselineWeeklyIncome: 500,
    openingBufferBalance: 0,
  },
  incomeEntries: [],
  categories: [
    { id: "c1", name: "Rent", type: "essential", budgetAmount: 400, budgetPeriod: "weekly" },
    { id: "c2", name: "Savings", type: "savings", budgetAmount: 50, budgetPeriod: "weekly" },
    { id: "c3", name: "Fun", type: "flexible", budgetAmount: 60, budgetPeriod: "weekly" },
  ],
  transactions: [],
  bills: [],
  goals: [],
});

const renderNotice = (data: AppData) =>
  render(<WeekNotice week={thisWeekView(data, "2026-10-19")} currency="USD" />);

describe("WeekNotice", () => {
  it("shows a neutral state when no income is logged this week", () => {
    renderNotice(baseData());

    expect(screen.getByText("No income logged yet this week")).toBeTruthy();
  });

  it("warns when essentials are short and the buffer covers the gap", () => {
    const data = baseData();
    data.incomeEntries.push({ id: "i1", date: "2026-10-19", amount: 100, source: "Pay", note: "" });

    renderNotice(data);

    expect(
      screen.getByText(/Essentials are short by \$300 this week, your buffer covers the gap/),
    ).toBeTruthy();
  });

  it("notes when flexible spending is not fully funded", () => {
    const data = baseData();
    data.incomeEntries.push({ id: "i1", date: "2026-10-19", amount: 500, source: "Pay", note: "" });

    renderNotice(data);

    expect(
      screen.getByText("Flexible spending is not fully funded by this week's income yet"),
    ).toBeTruthy();
  });

  it("renders nothing when the week is fully funded", () => {
    const data = baseData();
    data.incomeEntries.push({ id: "i1", date: "2026-10-19", amount: 900, source: "Pay", note: "" });

    const { container } = renderNotice(data);

    expect(container.textContent).toBe("");
  });
});
