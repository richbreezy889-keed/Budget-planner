import { describe, expect, it } from "vitest";

import { buildShellBanners } from "./shellBanners";
import type { AppView } from "@/lib/store/useAppView";
import type { StorageStatus } from "@/lib/store/context";
import { createSeedData } from "@/lib/store/seed";

const view = (isDemo: boolean): AppView => ({
  data: createSeedData(),
  today: "2026-10-19",
  isDemo,
});

const status = (overrides: Partial<StorageStatus> = {}): StorageStatus => ({
  load: "seeded",
  save: "idle",
  message: null,
  ...overrides,
});

describe("buildShellBanners", () => {
  it("is empty before mount", () => {
    expect(buildShellBanners(null, status())).toEqual([]);
  });

  it("flags demo data with a start-fresh link", () => {
    expect(buildShellBanners(view(true), status())).toEqual([
      {
        tone: "info",
        message: "You are viewing demo data (read-only).",
        link: { to: "/start", label: "Start fresh" },
      },
    ]);
  });

  it("flags a recovered load", () => {
    expect(buildShellBanners(view(false), status({ load: "recovered" }))).toEqual([
      { tone: "warn", message: "Your saved data could not be read. A backup was kept." },
    ]);
  });

  it("maps an unavailable save error", () => {
    expect(
      buildShellBanners(view(false), status({ save: "error", message: "unavailable" })),
    ).toEqual([
      {
        tone: "danger",
        message: "Your browser is blocking storage, changes are not being saved.",
      },
    ]);
  });

  it("maps a quota save error", () => {
    expect(buildShellBanners(view(false), status({ save: "error", message: "quota" }))).toEqual([
      { tone: "danger", message: "Storage is full, changes are not being saved." },
    ]);
  });

  it("maps an invalid save error", () => {
    expect(buildShellBanners(view(false), status({ save: "error", message: "invalid" }))).toEqual([
      { tone: "danger", message: "Some data is invalid, changes are not being saved." },
    ]);
  });

  it("ignores an unknown save error reason", () => {
    expect(buildShellBanners(view(false), status({ save: "error", message: "unknown" }))).toEqual(
      [],
    );
  });

  it("combines demo and recovered banners", () => {
    expect(buildShellBanners(view(true), status({ load: "recovered" }))).toEqual([
      {
        tone: "info",
        message: "You are viewing demo data (read-only).",
        link: { to: "/start", label: "Start fresh" },
      },
      { tone: "warn", message: "Your saved data could not be read. A backup was kept." },
    ]);
  });
});
