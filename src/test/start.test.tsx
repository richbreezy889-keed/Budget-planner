import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { fireEvent, within } from "@testing-library/react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppDataProvider } from "@/lib/store/AppDataProvider";
import { useAppData } from "@/lib/store/context";
import { createSeedData, startFresh } from "@/lib/store/seed";
import type { LoadResult, SaveResult, StorageAdapter } from "@/lib/store/storage";
import type { AppData } from "@/lib/types";
import { StartPage } from "@/routes/start";

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

function HomeProbe() {
  const { data } = useAppData();
  return (
    <div data-testid="home">
      HOME|{data.isDemo ? "demo" : "real"}|{data.settings.currency}|
      {data.settings.baselineWeeklyIncome}|{data.settings.openingBufferBalance}|
      {data.categories.length}|{data.categories.map((category) => category.name).join(",")}|
      {data.categories.every((category) => typeof category.id === "string" && category.id !== "")
        ? "ids"
        : "noid"}
    </div>
  );
}

let activeRoot: ReturnType<typeof createRoot> | undefined;

async function mountStart(initial: AppData | null = null) {
  const storage = spyAdapter(initial);
  const container = document.createElement("div");
  document.body.append(container);

  const rootRoute = createRootRoute({ component: () => <Outlet /> });
  const startRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/start",
    component: StartPage,
  });
  const homeRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    component: HomeProbe,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([startRoute, homeRoute]),
    history: createMemoryHistory({ initialEntries: ["/start"] }),
  });
  await router.load();

  activeRoot = createRoot(container);
  await act(async () => {
    activeRoot?.render(
      <AppDataProvider storage={storage}>
        <RouterProvider router={router} />
      </AppDataProvider>,
    );
  });

  return { container, router, storage };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(Date.UTC(2026, 9, 19, 8, 0, 0)));
});

afterEach(async () => {
  await act(async () => {
    activeRoot?.unmount();
  });
  activeRoot = undefined;
  vi.useRealTimers();
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

function fillStepOne(container: HTMLElement, baseline = "850", buffer = "2400") {
  const scope = within(container);
  fireEvent.change(scope.getByLabelText("Baseline weekly income"), { target: { value: baseline } });
  fireEvent.change(scope.getByLabelText("Opening buffer balance"), { target: { value: buffer } });
}

describe("Start fresh wizard", () => {
  it("keeps Next disabled until the settings step is valid", async () => {
    const { container } = await mountStart();
    const scope = within(container);

    const next = scope.getByRole("button", { name: "Next" });
    expect(next).toBeDisabled();

    fireEvent.change(scope.getByLabelText("Baseline weekly income"), { target: { value: "abc" } });
    fireEvent.change(scope.getByLabelText("Opening buffer balance"), { target: { value: "2400" } });
    expect(scope.getByRole("button", { name: "Next" })).toBeDisabled();

    fireEvent.change(scope.getByLabelText("Baseline weekly income"), { target: { value: "850" } });
    expect(scope.getByRole("button", { name: "Next" })).toBeEnabled();
  });

  it("replaces the demo with the chosen categories", async () => {
    const { container } = await mountStart();
    const scope = within(container);

    fillStepOne(container);
    fireEvent.click(scope.getByRole("button", { name: "Next" }));

    fireEvent.click(scope.getByLabelText("Include Rent"));
    fireEvent.click(scope.getByRole("button", { name: "Next" }));

    expect(scope.getByText(/replaces the demo data/)).toBeTruthy();
    await act(async () => {
      fireEvent.click(scope.getByRole("button", { name: "Start fresh" }));
    });

    const home = scope.getByTestId("home").textContent ?? "";
    expect(home).toContain("HOME|real|USD|850|2400|7|");
    expect(home).toContain("Groceries");
    expect(home).not.toContain("Rent");
    expect(home).toContain("ids");
  });

  it("requires an explicit confirmation when data is not demo", async () => {
    const existing = startFresh({
      currency: "TZS",
      weekStartDay: "Sunday",
      baselineWeeklyIncome: 500,
      openingBufferBalance: 1000,
    });
    const { container } = await mountStart(existing);
    const scope = within(container);

    expect(scope.getByText(/replaces everything you have saved/)).toBeTruthy();

    fillStepOne(container, "500", "1000");
    fireEvent.click(scope.getByRole("button", { name: "Next" }));
    fireEvent.click(scope.getByRole("button", { name: "Next" }));

    const start = scope.getByRole("button", { name: "Start fresh" });
    expect(start).toBeDisabled();

    fireEvent.click(scope.getByLabelText("Confirm replace"));
    expect(start).toBeEnabled();
    await act(async () => {
      fireEvent.click(start);
    });

    const home = scope.getByTestId("home").textContent ?? "";
    expect(home).toContain("HOME|real|USD|500|1000|8|");
  });
});
