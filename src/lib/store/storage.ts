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

export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem" | "key" | "length">;

export const STORAGE_KEY = "mngs:v1";
export const CORRUPT_PREFIX = "mngs:v1:corrupt:";
const MAX_CORRUPT_BACKUPS = 3;

function isQuotaError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const name = (error as { name?: unknown }).name;
  return name === "QuotaExceededError" || name === "NS_ERROR_DOM_QUOTA_REACHED";
}

function listKeys(storage: StorageLike): string[] {
  const keys: string[] = [];
  try {
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (typeof key === "string") keys.push(key);
    }
  } catch {
    // Ignore unavailable storage.
  }
  return keys;
}

/**
 * Preserves unreadable data under a timestamped key, never overwriting an existing
 * backup, and keeps only the newest few. Best effort: failures must not block startup.
 */
function backupCorrupt(storage: StorageLike, raw: string): void {
  try {
    const existing = listKeys(storage).filter((key) => key.startsWith(CORRUPT_PREFIX));
    const alreadyBackedUp = existing.some((key) => storage.getItem(key) === raw);
    if (alreadyBackedUp) return;

    const taken = new Set(existing);
    const stamp = new Date().toISOString();
    let key = `${CORRUPT_PREFIX}${stamp}`;
    let counter = 1;
    while (taken.has(key)) {
      key = `${CORRUPT_PREFIX}${stamp}-${counter}`;
      counter += 1;
    }
    storage.setItem(key, raw);

    const backups = [...existing, key].sort();
    const excess = backups.slice(0, Math.max(0, backups.length - MAX_CORRUPT_BACKUPS));
    for (const stale of excess) storage.removeItem(stale);
  } catch {
    // Best effort: a failed backup must not prevent startup.
  }
}

/**
 * Builds a storage adapter around a Storage-like object. Every access is guarded,
 * and data that fails validation is preserved under a timestamped corrupt key
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
        backupCorrupt(storage, raw);
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
