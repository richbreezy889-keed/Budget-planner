import { act, render, renderHook } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ISODate } from "../types";
import { useToday } from "./useToday";

let visibility: DocumentVisibilityState = "visible";

function Probe() {
  const today = useToday();
  return <span>{today ?? "none"}</span>;
}

function ChangeCounter() {
  const today = useToday();
  const countRef = useRef(0);
  const lastRef = useRef<ISODate | null>(null);
  if (today !== lastRef.current) {
    lastRef.current = today;
    countRef.current += 1;
  }
  return <span>{countRef.current}</span>;
}

beforeEach(() => {
  visibility = "visible";
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => visibility,
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("useToday", () => {
  it("returns null on the server (before mount)", () => {
    const html = renderToString(<Probe />);
    expect(html).toContain("none");
  });

  it("returns the local calendar date as YYYY-MM-DD after mount", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 5, 10, 0, 0));

    const { result } = renderHook(() => useToday());
    expect(result.current).toBe("2026-10-05");
  });

  it("re-checks the date when the tab becomes visible again", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 5, 23, 59, 0));

    const { result } = renderHook(() => useToday());
    expect(result.current).toBe("2026-10-05");

    act(() => {
      vi.setSystemTime(new Date(2026, 9, 6, 0, 1, 0));
      visibility = "visible";
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(result.current).toBe("2026-10-06");
  });

  it("does not update while the tab stays hidden", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 5, 23, 59, 0));

    const { result } = renderHook(() => useToday());
    expect(result.current).toBe("2026-10-05");

    act(() => {
      vi.setSystemTime(new Date(2026, 9, 6, 0, 1, 0));
      visibility = "hidden";
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(result.current).toBe("2026-10-05");
  });

  it("rolls over the date when the tab stays open across midnight", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 5, 23, 59, 0));

    const { result } = renderHook(() => useToday());
    expect(result.current).toBe("2026-10-05");

    act(() => {
      vi.advanceTimersByTime(2 * 60 * 1000);
    });

    expect(result.current).toBe("2026-10-06");
  });

  it("updates via the 60-second interval", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 5, 23, 59, 30));

    const { result } = renderHook(() => useToday());
    expect(result.current).toBe("2026-10-05");

    act(() => {
      vi.advanceTimersByTime(60 * 1000);
    });

    expect(result.current).toBe("2026-10-06");
  });

  it("re-checks on window focus after a simulated sleep (timer skipped)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 5, 23, 59, 0));

    const { result } = renderHook(() => useToday());
    expect(result.current).toBe("2026-10-05");

    act(() => {
      vi.setSystemTime(new Date(2026, 9, 6, 0, 5, 0));
      window.dispatchEvent(new Event("focus"));
    });

    expect(result.current).toBe("2026-10-06");
  });

  it("re-checks the date on pageshow", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 5, 23, 59, 0));

    const { result } = renderHook(() => useToday());
    expect(result.current).toBe("2026-10-05");

    act(() => {
      vi.setSystemTime(new Date(2026, 9, 6, 0, 2, 0));
      window.dispatchEvent(new Event("pageshow"));
    });

    expect(result.current).toBe("2026-10-06");
  });

  it("only updates state when the date string actually changed", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 5, 10, 0, 0));

    const { container } = render(<ChangeCounter />);
    expect(container.textContent).toBe("1");

    act(() => {
      vi.setSystemTime(new Date(2026, 9, 5, 14, 0, 0));
      window.dispatchEvent(new Event("focus"));
    });
    expect(container.textContent).toBe("1");

    act(() => {
      window.dispatchEvent(new Event("pageshow"));
    });
    expect(container.textContent).toBe("1");

    act(() => {
      vi.setSystemTime(new Date(2026, 9, 6, 10, 0, 0));
      window.dispatchEvent(new Event("focus"));
    });
    expect(container.textContent).toBe("2");
  });

  it("cleans up all listeners and timers on unmount", () => {
    vi.useFakeTimers();
    const documentRemove = vi.spyOn(document, "removeEventListener");
    const windowRemove = vi.spyOn(window, "removeEventListener");
    const clearSpy = vi.spyOn(globalThis, "clearTimeout");

    const { unmount } = renderHook(() => useToday());
    unmount();

    expect(documentRemove).toHaveBeenCalledWith("visibilitychange", expect.any(Function));
    expect(windowRemove).toHaveBeenCalledWith("focus", expect.any(Function));
    expect(windowRemove).toHaveBeenCalledWith("pageshow", expect.any(Function));
    expect(clearSpy).toHaveBeenCalled();
  });
});
