import { QueryClient } from "@tanstack/react-query";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { routeTree } from "@/routeTree.gen";

let activeRoot: ReturnType<typeof createRoot> | undefined;

// The root route's shellComponent renders a full <html> document, so testing-library's
// container-based render() cannot see it: React 19 hoists <html> out of the container
// and leaves it empty. Render into a detached document instead and query the markup.
async function renderAt(path: string) {
  const queryClient = new QueryClient();
  const router = createRouter({
    routeTree,
    context: { queryClient },
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  await router.load();

  const doc = document.implementation.createHTMLDocument("test");
  activeRoot = createRoot(doc);
  await act(async () => {
    activeRoot?.render(<RouterProvider router={router} />);
  });

  return doc;
}

afterEach(async () => {
  await act(async () => {
    activeRoot?.unmount();
  });
  activeRoot = undefined;
  vi.restoreAllMocks();
});

// Assert each route paints its own page heading, so a route that silently fails to
// render is caught instead of passing on an empty container.
describe("App routing", () => {
  it("renders the index route", async () => {
    const doc = await renderAt("/");
    const text = doc.body.textContent ?? "";

    expect(doc.title).toBe("This Week — MNGS");
    expect(text).toContain("Safe to spend this week");
    expect(text).toContain("Income logged");
    expect(text).toContain("Where this week's income goes");
    expect(text).toContain("Start fresh to add entries");
    expect(text).toContain("This week's activity");
  });

  it("shows the demo banner and a live week range once hydrated", async () => {
    const doc = await renderAt("/");
    const text = doc.body.textContent ?? "";

    expect(text).toContain("You are viewing demo data (read-only).");
    expect(text).toMatch(
      /[A-Z][a-z]{2} \d{1,2} [A-Z][a-z]{2} – [A-Z][a-z]{2} \d{1,2} [A-Z][a-z]{2}/,
    );
    expect(text).not.toMatch(/Week \d/);
  });

  it("renders the buffer route", async () => {
    const doc = await renderAt("/buffer");

    expect(doc.title).toBe("Buffer & Runway — MNGS");
    expect(doc.body.textContent).toContain("Buffer balance");
    expect(doc.body.textContent).toContain("Runway");
  });

  it("renders the history route", async () => {
    const doc = await renderAt("/history");

    expect(doc.title).toBe("History — MNGS");
    expect(doc.body.textContent).toContain("Every entry, newest first, grouped by week.");
    expect(doc.body.textContent).toContain("Week of");
  });

  it("renders the not-found route", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const doc = await renderAt("/this-route-does-not-exist");

    // No route matched, so the root route's default title stays in place.
    expect(doc.title).toBe("MNGS — Weekly budget planner");
    expect(doc.body.textContent).toContain("404");
    expect(doc.body.textContent).toContain("Page not found");
    expect(doc.querySelector("h1")?.textContent).toBe("404");
  });
});

// The phone layout relies on the shell clipping stray horizontal overflow, reserving
// room above the fixed tab bar (including the home-indicator inset), and letting wide
// data tables scroll inside their panel instead of widening the page.
describe("Phone layout guardrails", () => {
  it("clips overflow and clears the tab bar on the index route", async () => {
    const doc = await renderAt("/");
    const html = doc.body.innerHTML;

    expect(html).toContain("overflow-x-hidden");
    expect(html).toContain("pb-[calc(7rem+env(safe-area-inset-bottom))]");

    const tabBar = doc.querySelector("nav.fixed");
    expect(tabBar).not.toBeNull();
    expect(tabBar?.querySelectorAll("a")).toHaveLength(6);
    expect(tabBar?.className).toContain("env(safe-area-inset-bottom)");
    expect(doc.body.textContent).toContain("Where this week's income goes");
  });

  it("lets the wide bills table scroll inside its panel", async () => {
    const doc = await renderAt("/bills");

    const table = doc.querySelector("table");
    expect(table).not.toBeNull();
    expect(table?.closest('[class*="overflow-x-auto"]')).not.toBeNull();
  });
});
