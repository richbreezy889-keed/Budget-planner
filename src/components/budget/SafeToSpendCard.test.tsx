import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { ThisWeekView } from "@/lib/selectors";
import { SafeToSpendCard } from "./SafeToSpendCard";

const base: ThisWeekView = {
  weekStart: "2026-03-09",
  weekEnd: "2026-03-15",
  incomeLogged: 250,
  incomeEntryCount: 2,
  hasIncome: true,
  plan: { essentials: 400, savings: 50, goals: 200, flexible: 60 },
  waterfall: {
    allocated: { essentials: 250, savings: 0, goals: 0, flexible: 0 },
    buffer: 0,
    shortfall: { essentials: 150, savings: 50, goals: 200, flexible: 60 },
  },
  flexibleBudget: 60,
  flexibleSpent: 15,
  safeToSpend: 45,
  status: "safe",
  displayStatus: "caution",
  isLean: true,
  flexibleShortfall: 60,
  activity: [],
};

describe("SafeToSpendCard", () => {
  it("pluralizes the income entry count", () => {
    render(<SafeToSpendCard week={{ ...base, incomeEntryCount: 1 }} currency="USD" />);
    expect(screen.getByText("1 entry this week")).toBeTruthy();
  });

  it("uses the plural form for more than one entry", () => {
    render(<SafeToSpendCard week={{ ...base, incomeEntryCount: 2 }} currency="USD" />);
    expect(screen.getByText("2 entries this week")).toBeTruthy();
  });

  it("shows 'Lean week' when the safe status is downgraded on a lean week", () => {
    render(
      <SafeToSpendCard week={{ ...base, isLean: true, displayStatus: "caution" }} currency="USD" />,
    );
    expect(screen.getByText(/Lean week/)).toBeTruthy();
    expect(screen.queryByText(/Ease off/)).toBeNull();
  });

  it("shows 'Ease off' for a caution status that was not downgraded", () => {
    render(
      <SafeToSpendCard
        week={{ ...base, isLean: false, displayStatus: "caution", status: "caution" }}
        currency="USD"
      />,
    );
    expect(screen.getByText(/Ease off/)).toBeTruthy();
  });

  it("shows 'On track' for a safe status that was not downgraded", () => {
    render(
      <SafeToSpendCard
        week={{ ...base, isLean: false, displayStatus: "safe", status: "safe" }}
        currency="USD"
      />,
    );
    expect(screen.getByText(/On track/)).toBeTruthy();
  });
});
