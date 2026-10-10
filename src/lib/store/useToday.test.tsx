import { act, renderHook } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useToday } from "./useToday";

let visibility: DocumentVisibilityState = "visible";

function Probe() {
  const today = useToday();
  return <span>{today ?? "none"}</span>;
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

  it("clears its midnight timer on unmount", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 5, 23, 59, 0));
    const clearSpy = vi.spyOn(globalThis, "clearTimeout");

    const { unmount } = renderHook(() => useToday());
    unmount();

    expect(clearSpy).toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(2 * 60 * 1000);
    });
  });
});
