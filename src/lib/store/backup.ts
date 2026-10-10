import type { AppData } from "../types";
import { exportData } from "./validate";

/** Files larger than this are refused before reading. */
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

/** The default export name, e.g. "mngs-backup-2026-10-19.json" (local date). */
export function backupFileName(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `mngs-backup-${year}-${month}-${day}.json`;
}

export interface BackupSummary {
  incomeEntries: number;
  transactions: number;
  categories: number;
  bills: number;
  goals: number;
}

/** Record counts for a validated import, shown before the user confirms. */
export function summarizeBackup(data: AppData): BackupSummary {
  return {
    incomeEntries: data.incomeEntries.length,
    transactions: data.transactions.length,
    categories: data.categories.length,
    bills: data.bills.length,
    goals: data.goals.length,
  };
}

/** Serialises the current data for download. */
export function backupJson(data: AppData): string {
  return exportData(data);
}

/** True when a file is too large to import. */
export function isFileTooLarge(bytes: number): boolean {
  return bytes > MAX_IMPORT_BYTES;
}
