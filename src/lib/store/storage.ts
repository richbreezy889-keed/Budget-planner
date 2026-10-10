import type { AppData } from "../types";
import { createSeedData } from "./seed";
import { exportData, importData } from "./validate";

export interface StorageAdapter {
  /** Returns validated data, or the seed when there is none / it is unusable. */
  load(): AppData;
  save(data: AppData): void;
  clear(): void;
}

export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export const STORAGE_KEY = "mngs:v1";
export const CORRUPT_KEY = "mngs:v1:corrupt";

/**
 * Builds a storage adapter around a Storage-like object. Every access is guarded,
 * and data that fails validation is preserved under the corrupt key (never overwritten)
 * before falling back to the seed.
 */
export function createStorageAdapter(storage: StorageLike | null): StorageAdapter {
  return {
    load(): AppData {
      if (!storage) return createSeedData();

      let raw: string | null;
      try {
        raw = storage.getItem(STORAGE_KEY);
      } catch {
        return createSeedData();
      }

      if (raw === null) return createSeedData();

      const result = importData(raw);
      if (!result.ok) {
        try {
          storage.setItem(CORRUPT_KEY, raw);
        } catch {
          // Best effort: a failed backup must not prevent startup.
        }
        return createSeedData();
      }

      return result.data;
    },

    save(data: AppData): void {
      if (!storage) return;
      try {
        storage.setItem(STORAGE_KEY, exportData(data));
      } catch {
        // Ignore quota / unavailable storage.
      }
    },

    clear(): void {
      if (!storage) return;
      try {
        storage.removeItem(STORAGE_KEY);
      } catch {
        // Ignore unavailable storage.
      }
    },
  };
}

/** Resolves `window.localStorage`, or null on the server / when blocked. */
export function getBrowserStorage(): StorageLike | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

export const localStorageAdapter: StorageAdapter = createStorageAdapter(getBrowserStorage());
