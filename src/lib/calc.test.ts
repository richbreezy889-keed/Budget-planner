import { describe, expect, it } from "vitest";
import { weeklyEquivalent } from "./calc";

describe("weeklyEquivalent", () => {
  it("returns weekly amounts unchanged", () => {
    expect(weeklyEquivalent(120, "weekly")).toBe(120);
  });

  it("converts monthly amounts with amount * 12 / 52", () => {
    expect(weeklyEquivalent(1450, "monthly")).toBeCloseTo(334.6154, 4);
    expect(weeklyEquivalent(85, "monthly")).toBeCloseTo(19.6154, 4);
  });

  it("converts yearly amounts with amount / 52", () => {
    expect(weeklyEquivalent(180, "yearly")).toBeCloseTo(3.4615, 4);
  });
});
