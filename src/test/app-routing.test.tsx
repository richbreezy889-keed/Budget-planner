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

    expect(doc.title).toBe("This Week — MNGS");
    expect(doc.body.textContent).toContain("Safe to spend this week");
    expect(doc.body.textContent).toContain("Income logged");
  });

  it("renders the buffer route", async () => {
    const doc = await renderAt("/buffer");

    expect(doc.title).toBe("Buffer & Runway — MNGS");
    expect(doc.body.textContent).toContain("Buffer balance");
    expect(doc.body.textContent).toContain("Runway");
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
