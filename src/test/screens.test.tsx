import { render } from "@testing-library/react";
import type { ComponentType } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppDataProvider } from "@/lib/store/AppDataProvider";
import { createSeedData } from "@/lib/store/seed";
import type { LoadResult, SaveResult, StorageAdapter } from "@/lib/store/storage";
import type { AppData } from "@/lib/types";
import { BillsPage } from "@/routes/bills";
import { BudgetsPage } from "@/routes/budgets";
import { BufferPage } from "@/routes/buffer";
import { ThisWeek } from "@/routes/index";
import { SettingsPage } from "@/routes/settings";
import { TrendsPage } from "@/routes/trends";

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

const wrap = (adapter: StorageAdapter, Page: ComponentType) => (
  <AppDataProvider storage={adapter}>
    <Page />
  </AppDataProvider>
);

interface Screen {
  name: string;
  Page: ComponentType;
  realText: string;
  showsMoney: boolean;
}

const screens: Screen[] = [
  { name: "This Week", Page: ThisWeek, realText: "Safe to spend this week", showsMoney: true },
  { name: "Buffer & Runway", Page: BufferPage, realText: "Buffer balance", showsMoney: true },
  {
    name: "Budgets",
    Page: BudgetsPage,
    realText: "Planned amounts per category, shown weekly or monthly.",
    showsMoney: true,
  },
  {
    name: "Bills & Goals",
    Page: BillsPage,
    realText: "Every bill converted to its weekly cost.",
    showsMoney: true,
  },
  {
    name: "Trends",
    Page: TrendsPage,
    realText: "Income vs spending over the last 12 weeks.",
    showsMoney: true,
  },
  { name: "Settings", Page: SettingsPage, realText: "Baseline weekly income", showsMoney: false },
];

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(Date.UTC(2026, 9, 19, 8, 0, 0)));
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("Screens render a skeleton before hydration", () => {
  it.each(screens)("$name server HTML has no figures or dates", ({ Page }) => {
    const html = renderToString(wrap(spyAdapter(), Page));

    expect(html).toContain("animate-pulse");
    expect(html).not.toMatch(/\$\d/);
    expect(html).not.toMatch(/\d{4}-\d{2}-\d{2}/);
  });
});

describe("Screens render real values after hydration", () => {
  it.each(screens)("$name paints its content", ({ Page, realText, showsMoney }) => {
    const { container } = render(wrap(spyAdapter(), Page));
    const text = container.textContent ?? "";

    expect(container.querySelector(".animate-pulse")).toBeNull();
    expect(text).toContain(realText);
    if (showsMoney) expect(text).toMatch(/\$\d/);
  });
});
