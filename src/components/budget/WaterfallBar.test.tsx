import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { formatMoney } from "@/lib/format";
import type { ThisWeekView } from "@/lib/selectors";
import { WaterfallBar } from "./WaterfallBar";

const base: ThisWeekView = {
  weekStart: "2026-03-09",
  weekEnd: "2026-03-15",
  incomeLogged: 250,
  incomeEntryCount: 1,
  hasIncome: true,
  plan: { essentials: 400, savings: 50, goals: 200, flexible: 60 },
  waterfall: {
    allocated: { essentials: 250, savings: 0, goals: 0, flexible: 0 },
    buffer: 0,
    shortfall: { essentials: 150, savings: 50, goals: 200, flexible: 60 },
  },
  flexibleBudget: 60,
  flexibleSpent: 0,
  safeToSpend: 0,
  status: "caution",
  displayStatus: "caution",
  isLean: true,
  flexibleShortfall: 60,
  activity: [],
};

function rowCells(label: string) {
  const table = screen.getByRole("table");
  const rows = within(table).getAllByRole("row");
  const match = rows.find((row) => row.textContent?.startsWith(label));
  if (!match) throw new Error(`No row starting with ${label}`);
  return within(match).getAllByRole("cell");
}

describe("WaterfallBar", () => {
  it("breaks each bucket into planned, funded and short", () => {
    render(<WaterfallBar week={base} currency="USD" />);

    const cases = [
      ["Essentials", 400, 250, 150],
      ["Savings", 50, 0, 50],
      ["Goals", 200, 0, 200],
      ["Flexible", 60, 0, 60],
    ] as const;

    for (const [key, planned, funded, short] of cases) {
      const cells = rowCells(key);
      expect(cells[0]).toHaveTextContent(key);
      expect(cells[1]).toHaveTextContent(formatMoney(planned, "USD"));
      expect(cells[2]).toHaveTextContent(formatMoney(funded, "USD"));
      expect(cells[3]).toHaveTextContent(formatMoney(short, "USD"));
    }
  });

  it("highlights a short bucket in the warning colour", () => {
    render(<WaterfallBar week={base} currency="USD" />);
    expect(rowCells("Essentials")[3]).toHaveClass("text-warn");
  });

  it("keeps a fully funded bucket muted", () => {
    const funded: ThisWeekView = {
      ...base,
      waterfall: {
        allocated: { essentials: 400, savings: 50, goals: 200, flexible: 60 },
        buffer: 0,
        shortfall: { essentials: 0, savings: 0, goals: 0, flexible: 0 },
      },
    };
    render(<WaterfallBar week={funded} currency="USD" />);
    const short = rowCells("Essentials")[3];
    expect(short).not.toHaveClass("text-warn");
    expect(short).toHaveClass("text-muted-foreground");
  });

  it("keeps the table inside a horizontally scrollable wrapper", () => {
    render(<WaterfallBar week={base} currency="USD" />);
    expect(screen.getByRole("table").parentElement).toHaveClass("overflow-x-auto");
  });
});
