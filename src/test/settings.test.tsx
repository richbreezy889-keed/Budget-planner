import { fireEvent, render, screen } from "@testing-library/react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppDataProvider } from "@/lib/store/AppDataProvider";
import { backupJson } from "@/lib/store/backup";
import { createSeedData, startFresh } from "@/lib/store/seed";
import type { LoadResult, SaveResult, StorageAdapter } from "@/lib/store/storage";
import type { AppData } from "@/lib/types";
import { SettingsPage } from "@/routes/settings";

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

const wrap = (adapter: StorageAdapter) => (
  <AppDataProvider storage={adapter}>
    <SettingsPage />
  </AppDataProvider>
);

const realData = () =>
  startFresh({
    currency: "USD",
    weekStartDay: "Monday",
    baselineWeeklyIncome: 500,
    openingBufferBalance: 1000,
  });

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(Date.UTC(2026, 9, 19, 8, 0, 0)));
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("Settings screen", () => {
  it("keeps fields locked in demo mode with a start-fresh note", () => {
    render(wrap(spyAdapter()));

    expect(screen.getByText("Start fresh to edit your settings.")).toBeInTheDocument();
    expect(screen.getByLabelText("Baseline weekly income")).toBeDisabled();
    expect(screen.getByLabelText("Opening buffer balance")).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Save changes" })).not.toBeInTheDocument();
  });

  it("saves edited settings through the store", () => {
    const adapter = spyAdapter(realData());
    render(wrap(adapter));

    const baseline = screen.getByLabelText("Baseline weekly income");
    expect(baseline).toBeEnabled();

    act(() => {
      fireEvent.change(screen.getByLabelText("Currency"), { target: { value: "TZS" } });
      fireEvent.change(screen.getByLabelText("Week starts on"), { target: { value: "Sunday" } });
      fireEvent.change(screen.getByLabelText("Baseline weekly income"), {
        target: { value: "900" },
      });
      fireEvent.change(screen.getByLabelText("Opening buffer balance"), {
        target: { value: "1,200" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    });

    expect(screen.getByText("Settings saved.")).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(500);
    });

    const lastSaved = vi.mocked(adapter.save).mock.calls.at(-1)?.[0] as AppData;
    expect(lastSaved.settings).toEqual({
      currency: "TZS",
      weekStartDay: "Sunday",
      baselineWeeklyIncome: 900,
      openingBufferBalance: 1200,
    });
  });

  it("shows an error and does not save invalid input", () => {
    const adapter = spyAdapter(realData());
    render(wrap(adapter));

    act(() => {
      fireEvent.change(screen.getByLabelText("Baseline weekly income"), { target: { value: "" } });
      fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    });

    expect(screen.getByText("Enter a valid amount.")).toBeInTheDocument();
    expect(screen.queryByText("Settings saved.")).not.toBeInTheDocument();
    expect(vi.mocked(adapter.save)).not.toHaveBeenCalled();
  });

  it("rejects a currency that is not three letters when saving", () => {
    const adapter = spyAdapter(realData());
    render(wrap(adapter));

    fireEvent.change(screen.getByLabelText("Currency"), { target: { value: "TZ" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(screen.getByText("Enter a three-letter currency code.")).toBeInTheDocument();
    expect(screen.queryByText("Settings saved.")).not.toBeInTheDocument();
    expect(vi.mocked(adapter.save)).not.toHaveBeenCalled();
  });

  it("upper-cases a valid currency before saving", () => {
    const adapter = spyAdapter(realData());
    render(wrap(adapter));

    const currency = screen.getByLabelText("Currency");
    fireEvent.change(currency, { target: { value: "tzs" } });
    expect(currency).toHaveValue("TZS");
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(screen.getByText("Settings saved.")).toBeInTheDocument();
  });
});

async function chooseImportFile(file: File) {
  const input = screen.getByLabelText("Import JSON file");
  Object.defineProperty(input, "files", { value: [file], configurable: true });
  await act(async () => {
    fireEvent.change(input);
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(10);
  });
}

describe("Settings data import", () => {
  it("lists up to five errors for a file that is not valid app data", async () => {
    render(wrap(spyAdapter()));

    await chooseImportFile(
      new File([JSON.stringify({})], "bad.json", { type: "application/json" }),
    );

    expect(screen.getByText("Could not import this file.")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(5);
  });

  it("reports malformed JSON without crashing", async () => {
    render(wrap(spyAdapter()));

    await chooseImportFile(new File(["{not json"], "broken.json", { type: "application/json" }));

    expect(screen.getByText("Could not import this file.")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem").length).toBeGreaterThan(0);
  });

  it("summarises a valid file and replaces data on confirm", async () => {
    const adapter = spyAdapter(realData());
    render(wrap(adapter));

    const imported = createSeedData();
    imported.isDemo = false;
    await chooseImportFile(
      new File([backupJson(imported)], "good.json", { type: "application/json" }),
    );

    expect(screen.getByText("Ready to import")).toBeInTheDocument();
    expect(screen.getByText(/Categories \d+/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download current data first" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Replace all data" })).toBeInTheDocument();

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Replace all data" }));
    });
    expect(screen.getByText("Imported. Your data has been replaced.")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(500);
    });
    const lastSaved = vi.mocked(adapter.save).mock.calls.at(-1)?.[0] as AppData;
    expect(lastSaved.isDemo).toBe(false);
    expect(lastSaved.categories).toHaveLength(createSeedData().categories.length);
  });

  it("cancels an import without replacing data", async () => {
    const adapter = spyAdapter(realData());
    render(wrap(adapter));

    const imported = createSeedData();
    imported.isDemo = false;
    await chooseImportFile(
      new File([backupJson(imported)], "good.json", { type: "application/json" }),
    );

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    });

    expect(screen.queryByText("Ready to import")).not.toBeInTheDocument();
    expect(vi.mocked(adapter.save)).not.toHaveBeenCalled();
  });
});
