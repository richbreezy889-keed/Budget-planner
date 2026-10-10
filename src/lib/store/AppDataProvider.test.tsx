import { act, render, renderHook, screen } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AppData } from "../types";
import { AppDataProvider } from "./AppDataProvider";
import { useAppData } from "./context";
import { createSeedData } from "./seed";
import { STORAGE_KEY, type LoadResult, type SaveResult, type StorageAdapter } from "./storage";

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

function setVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => state });
}

function resetVisibility() {
  Reflect.deleteProperty(document, "visibilityState");
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
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

  it("hydrates from storage after mount", () => {
    const stored = createSeedData();
    stored.isDemo = false;
    const { adapter, load } = spyAdapter(stored);

    render(
      <AppDataProvider storage={adapter}>
        <Probe />
      </AppDataProvider>,
    );

    expect(screen.getByText("real")).toBeTruthy();
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("does not save on mount when nothing changed", () => {
    const stored = createSeedData();
    const { adapter, save } = spyAdapter(stored);

    render(
      <AppDataProvider storage={adapter} debounceMs={10}>
        <Probe />
      </AppDataProvider>,
    );

    act(() => {
      vi.advanceTimersByTime(40);
    });
    expect(save).not.toHaveBeenCalled();
  });

  it("debounces and persists changes after hydration", () => {
    const { adapter, save } = spyAdapter();
    const { result } = renderHook(() => useAppData(), { wrapper: wrapper(adapter) });

    expect(result.current.hydrated).toBe(true);

    act(() => {
      result.current.dispatch({
        type: "addIncome",
        item: { date: "2026-10-05", amount: 500, source: "Gig", note: "" },
      });
    });
    expect(save).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(10);
    });
    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0]?.[0].incomeEntries).toHaveLength(3);
  });

  it("surfaces a clear error when refusing an action", () => {
    const { adapter } = spyAdapter();
    const { result } = renderHook(() => useAppData(), { wrapper: wrapper(adapter) });

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

  it("reports the load status and a successful save", () => {
    const stored = createSeedData();
    const { adapter, save } = spyAdapter(stored);
    const { result } = renderHook(() => useAppData(), { wrapper: wrapper(adapter) });

    expect(result.current.hydrated).toBe(true);
    expect(result.current.storageStatus.load).toBe("ok");

    act(() => {
      result.current.dispatch({
        type: "addIncome",
        item: { date: "2026-10-05", amount: 500, source: "Gig", note: "" },
      });
    });
    act(() => {
      vi.advanceTimersByTime(10);
    });

    expect(save).toHaveBeenCalledTimes(1);
    expect(result.current.storageStatus.save).toBe("ok");
    expect(result.current.storageStatus.message).toBeNull();
  });

  it("maps a corrupt load to a recovered status", () => {
    const adapter: StorageAdapter = {
      load: vi.fn((): LoadResult => ({ data: createSeedData(), status: "recovered" })),
      save: vi.fn((): SaveResult => ({ ok: true })),
      clear: vi.fn(),
    };
    const { result } = renderHook(() => useAppData(), { wrapper: wrapper(adapter) });
    expect(result.current.hydrated).toBe(true);
    expect(result.current.storageStatus.load).toBe("recovered");
  });

  it("exposes a save error when the storage rejects a write", () => {
    const adapter: StorageAdapter = {
      load: vi.fn((): LoadResult => ({ data: createSeedData(), status: "seeded" })),
      save: vi.fn((): SaveResult => ({ ok: false, reason: "quota" })),
      clear: vi.fn(),
    };
    const { result } = renderHook(() => useAppData(), { wrapper: wrapper(adapter) });
    expect(result.current.hydrated).toBe(true);

    act(() => {
      result.current.dispatch({
        type: "addIncome",
        item: { date: "2026-10-05", amount: 500, source: "Gig", note: "" },
      });
    });
    act(() => {
      vi.advanceTimersByTime(10);
    });

    expect(result.current.storageStatus.save).toBe("error");
    expect(result.current.storageStatus.message).toBe("quota");
  });

  it("flushes pending changes when the document becomes hidden", () => {
    setVisibility("hidden");
    const { adapter, save } = spyAdapter();
    const { result } = renderHook(() => useAppData(), { wrapper: wrapper(adapter, 1000) });

    act(() => {
      result.current.dispatch({
        type: "addIncome",
        item: { date: "2026-10-05", amount: 500, source: "Gig", note: "" },
      });
    });
    expect(save).not.toHaveBeenCalled();

    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(save).toHaveBeenCalledTimes(1);

    resetVisibility();
  });

  it("flushes pending changes on pagehide", () => {
    const { adapter, save } = spyAdapter();
    const { result } = renderHook(() => useAppData(), { wrapper: wrapper(adapter, 1000) });

    act(() => {
      result.current.dispatch({
        type: "addIncome",
        item: { date: "2026-10-05", amount: 500, source: "Gig", note: "" },
      });
    });

    act(() => {
      window.dispatchEvent(new Event("pagehide"));
    });
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("does not save on exit when nothing has changed", () => {
    setVisibility("hidden");
    const { adapter, save } = spyAdapter();
    renderHook(() => useAppData(), { wrapper: wrapper(adapter, 1000) });

    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(save).not.toHaveBeenCalled();

    resetVisibility();
  });

  it("removes its exit listeners on unmount", () => {
    const documentRemove = vi.spyOn(document, "removeEventListener");
    const windowRemove = vi.spyOn(window, "removeEventListener");
    const { adapter } = spyAdapter();
    const { unmount } = renderHook(() => useAppData(), { wrapper: wrapper(adapter, 1000) });

    unmount();

    expect(documentRemove).toHaveBeenCalledWith("visibilitychange", expect.any(Function));
    expect(windowRemove).toHaveBeenCalledWith("pagehide", expect.any(Function));
  });

  it("applies a change made by another tab without writing it back", () => {
    const { adapter, save } = spyAdapter();
    const { result } = renderHook(() => useAppData(), { wrapper: wrapper(adapter) });
    expect(result.current.hydrated).toBe(true);

    const other = createSeedData();
    other.isDemo = false;

    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", { key: STORAGE_KEY, newValue: JSON.stringify(other) }),
      );
    });

    expect(result.current.data.isDemo).toBe(false);

    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(save).not.toHaveBeenCalled();
  });

  it("ignores an invalid value broadcast by another tab", () => {
    const { adapter } = spyAdapter();
    const { result } = renderHook(() => useAppData(), { wrapper: wrapper(adapter) });
    expect(result.current.hydrated).toBe(true);
    const before = result.current.data;

    act(() => {
      window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY, newValue: "{broken" }));
    });

    expect(result.current.data).toBe(before);
  });
});
