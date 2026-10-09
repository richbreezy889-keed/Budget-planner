import { describe, expect, it } from "vitest";
import { weekEnd, weekStart, weeklyEquivalent } from "./calc";

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

describe("weekStart / weekEnd", () => {
  it("finds the Monday week containing a mid-week date", () => {
    expect(weekStart("2026-09-30", "Monday")).toBe("2026-09-28");
    expect(weekEnd("2026-09-30", "Monday")).toBe("2026-10-04");
  });

  it("finds the Sunday week containing a mid-week date", () => {
    expect(weekStart("2026-09-30", "Sunday")).toBe("2026-09-27");
    expect(weekEnd("2026-09-30", "Sunday")).toBe("2026-10-03");
  });

  it("finds the Saturday week containing a mid-week date", () => {
    expect(weekStart("2026-09-30", "Saturday")).toBe("2026-09-26");
    expect(weekEnd("2026-09-30", "Saturday")).toBe("2026-10-02");
  });

  it("treats the first and last day of a week as inside it", () => {
    expect(weekStart("2026-09-28", "Monday")).toBe("2026-09-28");
    expect(weekStart("2026-10-04", "Monday")).toBe("2026-09-28");
    expect(weekEnd("2026-10-04", "Monday")).toBe("2026-10-04");
    expect(weekStart("2026-10-04", "Sunday")).toBe("2026-10-04");
  });

  it("handles month boundaries", () => {
    expect(weekStart("2026-10-01", "Monday")).toBe("2026-09-28");
    expect(weekEnd("2026-09-28", "Monday")).toBe("2026-10-04");
  });

  it("handles year boundaries", () => {
    expect(weekStart("2026-01-01", "Monday")).toBe("2025-12-29");
    expect(weekEnd("2026-01-01", "Monday")).toBe("2026-01-04");
    expect(weekStart("2026-01-01", "Sunday")).toBe("2025-12-28");
    expect(weekEnd("2026-01-01", "Sunday")).toBe("2026-01-03");
  });

  it("does not shift a date through UTC", () => {
    // A Monday stays the start of its own week regardless of local offset.
    expect(weekStart("2026-09-28", "Monday")).toBe("2026-09-28");
    expect(weekEnd("2026-09-28", "Monday")).toBe("2026-10-04");
  });
});
