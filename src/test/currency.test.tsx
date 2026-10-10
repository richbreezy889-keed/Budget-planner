import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppDataProvider } from "@/lib/store/AppDataProvider";
import { createSeedData } from "@/lib/store/seed";
import type { LoadResult, SaveResult, StorageAdapter } from "@/lib/store/storage";
import type { AppData } from "@/lib/types";
import { ThisWeek } from "@/routes/index";

function adapterReturning(data: AppData): StorageAdapter {
  return {
    load: vi.fn((): LoadResult => ({ data, status: "ok" })),
    save: vi.fn((): SaveResult => ({ ok: true })),
    clear: vi.fn(),
  };
}

const withOddCurrency = (): AppData => {
  const data = createSeedData();
  return { ...data, isDemo: false, settings: { ...data.settings, currency: "Tsh." } };
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(Date.UTC(2026, 9, 19, 8, 0, 0)));
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("previously saved odd currency", () => {
  it("loads and renders a screen without crashing", () => {
    render(
      <AppDataProvider storage={adapterReturning(withOddCurrency())}>
        <ThisWeek />
      </AppDataProvider>,
    );

    expect(screen.getByText("Safe to spend this week")).toBeInTheDocument();
    expect(document.body.textContent).toContain("Tsh.");
  });
});
