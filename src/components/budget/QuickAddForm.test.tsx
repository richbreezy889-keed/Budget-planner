import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

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

describe("QuickAddForm", () => {
  it("is visible but disabled and explains that adding comes next", () => {
    render(<QuickAddForm categories={categories} />);

    expect(screen.getByLabelText("Amount")).toBeDisabled();
    expect(screen.getByLabelText("Category")).toBeDisabled();
    expect(screen.getByLabelText("Note")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Add to week" })).toBeDisabled();
    expect(screen.getByText("Adding entries comes next")).toBeTruthy();
    expect(screen.getByRole("option", { name: "Essential · Rent" })).toBeTruthy();
  });
});
