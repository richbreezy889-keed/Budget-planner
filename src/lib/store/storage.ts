import type { AppData } from "../types";
import { createSeedData } from "./seed";
import { exportData, importData, validateAppData } from "./validate";

export type LoadStatus = "ok" | "seeded" | "recovered" | "unavailable";
export type SaveFailureReason = "unavailable" | "quota" | "invalid";
export type SaveResult = { ok: true } | { ok: false; reason: SaveFailureReason };
export interface LoadResult {
  data: AppData;
  status: LoadStatus;
}

export interface StorageAdapter {
  /** Returns validated data plus how it was obtained (or the seed as a fallback). */
  load(): LoadResult;
  /** Persists validated data, reporting why a write was rejected when it was. */
  save(data: AppData): SaveResult;
  clear(): void;
}

export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export const STORAGE_KEY = "mngs:v1";
export const CORRUPT_KEY = "mngs:v1:corrupt";

function isQuotaError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const name = (error as { name?: unknown }).name;
  return name === "QuotaExceededError" || name === "NS_ERROR_DOM_QUOTA_REACHED";
}

/**
 * Builds a storage adapter around a Storage-like object. Every access is guarded,
 * and data that fails validation is preserved under the corrupt key (never overwritten)
 * before falling back to the seed.
 */
export function createStorageAdapter(storage: StorageLike | null): StorageAdapter {
  return {
    load(): LoadResult {
      if (!storage) return { data: createSeedData(), status: "unavailable" };

      let raw: string | null;
      try {
        raw = storage.getItem(STORAGE_KEY);
      } catch {
        return { data: createSeedData(), status: "unavailable" };
      }

      if (raw === null) return { data: createSeedData(), status: "seeded" };

      const result = importData(raw);
      if (!result.ok) {
        try {
          storage.setItem(CORRUPT_KEY, raw);
        } catch {
          // Best effort: a failed backup must not prevent startup.
        }
        return { data: createSeedData(), status: "recovered" };
      }

      return { data: result.data, status: "ok" };
    },

    save(data: AppData): SaveResult {
      if (!storage) return { ok: false, reason: "unavailable" };
      if (!validateAppData(data).ok) return { ok: false, reason: "invalid" };
      try {
        storage.setItem(STORAGE_KEY, exportData(data));
        return { ok: true };
      } catch (error) {
        return { ok: false, reason: isQuotaError(error) ? "quota" : "unavailable" };
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
