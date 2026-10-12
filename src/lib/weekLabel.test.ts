import { describe, expect, it } from "vitest";

import { weekLabel } from "@/lib/weekLabel";

describe("weekLabel", () => {
  it("names the Monday-starting week a date lands in", () => {
    expect(weekLabel("2026-10-19", "Monday")).toBe("Mon 19 Oct");
    expect(weekLabel("2026-10-25", "Monday")).toBe("Mon 19 Oct");
  });

  it("respects a Sunday week start", () => {
    expect(weekLabel("2026-10-19", "Sunday")).toBe("Sun 18 Oct");
    expect(weekLabel("2026-10-18", "Sunday")).toBe("Sun 18 Oct");
  });

  it("names the Saturday-starting week", () => {
    expect(weekLabel("2026-10-19", "Saturday")).toBe("Sat 17 Oct");
  });

  it("naming a date that is already the week start returns that day", () => {
    expect(weekLabel("2026-10-05", "Monday")).toBe("Mon 5 Oct");
  });
});
