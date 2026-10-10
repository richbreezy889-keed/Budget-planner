import { act, render, renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { AppData } from "../types";
import { AppDataProvider } from "./AppDataProvider";
import { useAppData } from "./context";
import { createSeedData } from "./seed";
import type { LoadResult, SaveResult, StorageAdapter } from "./storage";

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
  return { adapter, load, save, clear };
}

function Probe() {
  const { data } = useAppData();
  return createElement("span", null, data.isDemo ? "demo" : "real");
}

const wrapper =
  (storage: StorageAdapter, debounceMs = 10) =>
  ({ children }: { children: ReactNode }) => (
    <AppDataProvider storage={storage} debounceMs={debounceMs}>
      {children}
    </AppDataProvider>
  );

afterEach(() => {
  vi.restoreAllMocks();
});

describe("AppDataProvider", () => {
  it("renders the seed on the first render without touching storage", () => {
    const { adapter, load, save } = spyAdapter();
    const html = renderToString(
      createElement(AppDataProvider, { storage: adapter, children: createElement(Probe) }),
    );
    expect(html).toContain("demo");
    expect(load).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
  });

  it("hydrates from storage after mount", async () => {
    const stored = createSeedData();
    stored.isDemo = false;
    const { adapter, load } = spyAdapter(stored);

    const { findByText } = render(
      <AppDataProvider storage={adapter}>
        <Probe />
      </AppDataProvider>,
    );

    expect(await findByText("real")).toBeTruthy();
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("does not save on mount when nothing changed", async () => {
    const stored = createSeedData();
    const { adapter, save } = spyAdapter(stored);

    render(
      <AppDataProvider storage={adapter} debounceMs={10}>
        <Probe />
      </AppDataProvider>,
    );

    await new Promise((resolve) => setTimeout(resolve, 40));
    expect(save).not.toHaveBeenCalled();
  });

  it("debounces and persists changes after hydration", async () => {
    const { adapter, save } = spyAdapter();
    const { result } = renderHook(() => useAppData(), { wrapper: wrapper(adapter) });

    await waitFor(() => expect(result.current.hydrated).toBe(true));

    act(() => {
      result.current.dispatch({
        type: "addIncome",
        item: { date: "2026-10-05", amount: 500, source: "Gig", note: "" },
      });
    });
    expect(save).not.toHaveBeenCalled();

    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(save.mock.calls[0]?.[0].incomeEntries).toHaveLength(3);
  });

  it("surfaces a clear error when refusing an action", async () => {
    const { adapter } = spyAdapter();
    const { result } = renderHook(() => useAppData(), { wrapper: wrapper(adapter) });

    await waitFor(() => expect(result.current.hydrated).toBe(true));
    act(() => {
      result.current.dispatch({ type: "deleteCategory", id: "groceries" });
    });

    expect(result.current.error).toContain("Groceries");
    expect(result.current.data.categories.some((category) => category.id === "groceries")).toBe(
      true,
    );
  });

  it("throws when useAppData is used outside a provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() => renderHook(() => useAppData())).toThrow(/AppDataProvider/);
    spy.mockRestore();
  });

  it("reports the load status and a successful save", async () => {
    const stored = createSeedData();
    const { adapter, save } = spyAdapter(stored);
    const { result } = renderHook(() => useAppData(), { wrapper: wrapper(adapter) });

    await waitFor(() => expect(result.current.hydrated).toBe(true));
    expect(result.current.storageStatus.load).toBe("ok");

    act(() => {
      result.current.dispatch({
        type: "addIncome",
        item: { date: "2026-10-05", amount: 500, source: "Gig", note: "" },
      });
    });

    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(result.current.storageStatus.save).toBe("ok"));
    expect(result.current.storageStatus.message).toBeNull();
  });

  it("maps a corrupt load to a recovered status", async () => {
    const adapter: StorageAdapter = {
      load: vi.fn((): LoadResult => ({ data: createSeedData(), status: "recovered" })),
      save: vi.fn((): SaveResult => ({ ok: true })),
      clear: vi.fn(),
    };
    const { result } = renderHook(() => useAppData(), { wrapper: wrapper(adapter) });
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    expect(result.current.storageStatus.load).toBe("recovered");
  });

  it("exposes a save error when the storage rejects a write", async () => {
    const adapter: StorageAdapter = {
      load: vi.fn((): LoadResult => ({ data: createSeedData(), status: "seeded" })),
      save: vi.fn((): SaveResult => ({ ok: false, reason: "quota" })),
      clear: vi.fn(),
    };
    const { result } = renderHook(() => useAppData(), { wrapper: wrapper(adapter) });

    await waitFor(() => expect(result.current.hydrated).toBe(true));
    act(() => {
      result.current.dispatch({
        type: "addIncome",
        item: { date: "2026-10-05", amount: 500, source: "Gig", note: "" },
      });
    });

    await waitFor(() => expect(result.current.storageStatus.save).toBe("error"));
    expect(result.current.storageStatus.message).toBe("quota");
  });
});
