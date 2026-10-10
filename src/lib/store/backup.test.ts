import { describe, expect, it } from "vitest";

import { createSeedData } from "./seed";
import {
  MAX_IMPORT_BYTES,
  backupFileName,
  backupJson,
  isFileTooLarge,
  summarizeBackup,
} from "./backup";

describe("backupFileName", () => {
  it("formats the local date", () => {
    expect(backupFileName(new Date(2026, 9, 19))).toBe("mngs-backup-2026-10-19.json");
    expect(backupFileName(new Date(2026, 0, 3))).toBe("mngs-backup-2026-01-03.json");
  });
});

describe("summarizeBackup", () => {
  it("counts every collection", () => {
    const data = createSeedData();
    const summary = summarizeBackup(data);
    expect(summary).toEqual({
      incomeEntries: data.incomeEntries.length,
      transactions: data.transactions.length,
      categories: data.categories.length,
      bills: data.bills.length,
      goals: data.goals.length,
    });
  });

  it("counts an empty dataset as all zeros", () => {
    const empty = { ...createSeedData(), incomeEntries: [], categories: [] };
    expect(summarizeBackup({ ...empty, categories: [] })).toEqual({
      incomeEntries: 0,
      transactions: createSeedData().transactions.length,
      categories: 0,
      bills: createSeedData().bills.length,
      goals: createSeedData().goals.length,
    });
  });
});

describe("backupJson", () => {
  it("round trips through JSON", () => {
    const data = createSeedData();
    expect(JSON.parse(backupJson(data))).toEqual(data);
  });
});

describe("isFileTooLarge", () => {
  it("allows files up to the 5 MB limit", () => {
    expect(isFileTooLarge(0)).toBe(false);
    expect(isFileTooLarge(MAX_IMPORT_BYTES)).toBe(false);
  });

  it("refuses files over the limit", () => {
    expect(isFileTooLarge(MAX_IMPORT_BYTES + 1)).toBe(true);
  });
});
