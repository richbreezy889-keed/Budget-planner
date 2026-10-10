import { render, screen } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AppData } from "../types";
import { AppDataProvider } from "./AppDataProvider";
import { createSeedData } from "./seed";
import type { LoadResult, SaveResult, StorageAdapter } from "./storage";
import { useAppView } from "./useAppView";

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
  return { adapter };
}

function Probe() {
  const view = useAppView();
  if (view === null) {
    return createElement("span", { "data-testid": "view" }, "skeleton");
  }
  return createElement(
    "span",
    { "data-testid": "view" },
    `${view.today}|${view.isDemo ? "demo" : "real"}|${view.data.incomeEntries[0]?.date ?? "none"}`,
  );
}

const provider = (storage: StorageAdapter, children: ReactNode) => (
  <AppDataProvider storage={storage}>{children}</AppDataProvider>
);

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(Date.UTC(2026, 9, 19, 8, 0, 0)));
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("useAppView", () => {
  it("renders a skeleton before hydration (server render)", () => {
    const { adapter } = spyAdapter();
    const html = renderToString(provider(adapter, createElement(Probe)));

    expect(html).toContain("skeleton");
    expect(html).not.toContain("2026-10-19");
  });

  it("shows the demo data shifted onto today after hydration", () => {
    const { adapter } = spyAdapter();

    render(provider(adapter, createElement(Probe)));

    expect(screen.getByTestId("view").textContent).toBe("2026-10-19|demo|2026-10-19");
  });

  it("leaves non-demo data untouched once hydrated", () => {
    const stored = createSeedData();
    stored.isDemo = false;
    const { adapter } = spyAdapter(stored);

    render(provider(adapter, createElement(Probe)));

    expect(screen.getByTestId("view").textContent).toBe("2026-10-19|real|2026-09-28");
  });
});
