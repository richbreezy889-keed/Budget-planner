import { afterEach, describe, expect, it, vi } from "vitest";

import type { AppData } from "../types";
import { createSeedData } from "./seed";
import {
  BACKUP_PREFIX,
  CORRUPT_PREFIX,
  STORAGE_KEY,
  createStorageAdapter,
  type StorageLike,
} from "./storage";
import { exportData } from "./validate";

class FakeStorage implements StorageLike {
  private readonly map = new Map<string, string>();

  getItem(key: string): string | null {
    return this.map.has(key) ? (this.map.get(key) as string) : null;
  }

  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }

  removeItem(key: string): void {
    this.map.delete(key);
  }

  key(index: number): string | null {
    return Array.from(this.map.keys())[index] ?? null;
  }

  get length(): number {
    return this.map.size;
  }

  raw(key: string): string | null {
    return this.getItem(key);
  }

  corruptKeys(): string[] {
    return Array.from(this.map.keys()).filter((key) => key.startsWith(CORRUPT_PREFIX));
  }
}

const customData = (): AppData => {
  const data = createSeedData();
  data.isDemo = false;
  data.categories = data.categories.filter((category) => category.id !== "fun");
  data.transactions = data.transactions.filter((transaction) => transaction.categoryId !== "fun");
  data.bills = data.bills.filter((bill) => bill.categoryId !== "fun");
  return data;
};

const invalidData = (): AppData => {
  const data = createSeedData();
  data.transactions = [{ ...data.transactions[0]!, categoryId: "missing" }];
  return data;
};

afterEach(() => {
  vi.useRealTimers();
});

describe("createStorageAdapter", () => {
  it("returns the seed when nothing is stored", () => {
    const adapter = createStorageAdapter(new FakeStorage());
    const result = adapter.load();
    expect(result.status).toBe("seeded");
    expect(result.data.isDemo).toBe(true);
  });

  it("saves and loads valid data", () => {
    const storage = new FakeStorage();
    const adapter = createStorageAdapter(storage);
    const data = customData();

    expect(adapter.save(data)).toEqual({ ok: true });
    expect(storage.raw(STORAGE_KEY)).toBe(exportData(data));

    const loaded = adapter.load();
    expect(loaded.status).toBe("ok");
    expect(loaded.data).toEqual(data);
  });

  it("clears the stored data", () => {
    const storage = new FakeStorage();
    const adapter = createStorageAdapter(storage);
    adapter.save(customData());
    adapter.clear();
    expect(storage.raw(STORAGE_KEY)).toBeNull();
    expect(adapter.load().data.isDemo).toBe(true);
  });

  it("backs up malformed JSON and falls back to the seed", () => {
    const storage = new FakeStorage();
    storage.setItem(STORAGE_KEY, "{not json");
    const adapter = createStorageAdapter(storage);

    const result = adapter.load();
    expect(result.status).toBe("recovered");
    expect(result.data.isDemo).toBe(true);

    const backups = storage.corruptKeys();
    expect(backups).toHaveLength(1);
    expect(storage.raw(backups[0]!)).toBe("{not json");
    expect(storage.raw(STORAGE_KEY)).toBe("{not json");
  });

  it("backs up schema-invalid data and falls back to the seed", () => {
    const storage = new FakeStorage();
    storage.setItem(STORAGE_KEY, JSON.stringify({ ...createSeedData(), version: 99 }));
    const adapter = createStorageAdapter(storage);

    const result = adapter.load();
    expect(result.status).toBe("recovered");
    expect(storage.corruptKeys()).toHaveLength(1);
    expect(storage.raw(STORAGE_KEY)).toContain('"version":99');
  });

  it("backs up data with a dangling categoryId", () => {
    const storage = new FakeStorage();
    storage.setItem(STORAGE_KEY, JSON.stringify(invalidData()));
    const adapter = createStorageAdapter(storage);

    expect(adapter.load().status).toBe("recovered");
    expect(storage.corruptKeys()).toHaveLength(1);
  });

  it("does not create a corrupt backup for valid data", () => {
    const storage = new FakeStorage();
    const adapter = createStorageAdapter(storage);
    adapter.save(customData());
    adapter.load();
    expect(storage.corruptKeys()).toHaveLength(0);
  });

  it("names corrupt backups with an ISO timestamp", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-02T03:04:05.000Z"));
    const storage = new FakeStorage();
    storage.setItem(STORAGE_KEY, "{not json");
    const adapter = createStorageAdapter(storage);

    adapter.load();
    expect(storage.raw(`${CORRUPT_PREFIX}2026-01-02T03:04:05.000Z`)).toBe("{not json");
  });

  it("does not overwrite an existing corrupt backup", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-02T03:04:05.000Z"));
    const storage = new FakeStorage();
    const existing = `${CORRUPT_PREFIX}2026-01-02T03:04:05.000Z`;
    storage.setItem(existing, "old");
    storage.setItem(STORAGE_KEY, "{not json");
    const adapter = createStorageAdapter(storage);

    adapter.load();
    expect(storage.raw(existing)).toBe("old");

    const fresh = storage.corruptKeys().filter((key) => key !== existing);
    expect(fresh).toHaveLength(1);
    expect(storage.raw(fresh[0]!)).toBe("{not json");
  });

  it("keeps only the newest three corrupt backups", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-04T00:00:00.000Z"));
    const storage = new FakeStorage();
    const oldest = `${CORRUPT_PREFIX}2020-01-01T00:00:00.000Z`;
    storage.setItem(oldest, "x");
    storage.setItem(`${CORRUPT_PREFIX}2020-01-02T00:00:00.000Z`, "x");
    storage.setItem(`${CORRUPT_PREFIX}2020-01-03T00:00:00.000Z`, "x");
    storage.setItem(STORAGE_KEY, "{not json");
    const adapter = createStorageAdapter(storage);

    adapter.load();
    expect(storage.corruptKeys()).toHaveLength(3);
    expect(storage.raw(oldest)).toBeNull();
  });

  it("does not duplicate a backup whose identical raw data is already stored", () => {
    vi.useFakeTimers();
    const storage = new FakeStorage();
    storage.setItem(STORAGE_KEY, "corrupt-data");
    const adapter = createStorageAdapter(storage);

    adapter.load();
    adapter.load();
    expect(storage.corruptKeys()).toHaveLength(1);
    expect(storage.raw(storage.corruptKeys()[0]!)).toBe("corrupt-data");
  });

  it("repeated loads of the same corrupt data never evict an older, different backup", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    const storage = new FakeStorage();
    const older = [
      `${CORRUPT_PREFIX}2020-01-01T00:00:00.000Z`,
      `${CORRUPT_PREFIX}2020-01-02T00:00:00.000Z`,
    ];
    for (const key of older) storage.setItem(key, "different");
    storage.setItem(STORAGE_KEY, "corrupt-data");
    const adapter = createStorageAdapter(storage);

    adapter.load();
    adapter.load();
    adapter.load();

    expect(storage.corruptKeys()).toHaveLength(3);
    expect(storage.raw(older[0]!)).toBe("different");
    expect(storage.raw(older[1]!)).toBe("different");
  });

  it("refuses to persist invalid data and writes nothing", () => {
    const storage = new FakeStorage();
    const adapter = createStorageAdapter(storage);

    expect(adapter.save(invalidData())).toEqual({ ok: false, reason: "invalid" });
    expect(storage.raw(STORAGE_KEY)).toBeNull();
  });

  it("reports quota when storage rejects the write", () => {
    const quota: StorageLike = {
      getItem: () => null,
      setItem: () => {
        const error = new Error("full");
        error.name = "QuotaExceededError";
        throw error;
      },
      removeItem: () => undefined,
      key: () => null,
      length: 0,
    };
    const adapter = createStorageAdapter(quota);
    expect(adapter.save(customData())).toEqual({ ok: false, reason: "quota" });
  });

  it("works without storage (unavailable)", () => {
    const adapter = createStorageAdapter(null);
    expect(adapter.load().status).toBe("unavailable");
    expect(adapter.save(customData())).toEqual({ ok: false, reason: "unavailable" });
    expect(() => adapter.clear()).not.toThrow();
  });

  it("survives a storage that throws on every access", () => {
    const throwing: StorageLike = {
      getItem() {
        throw new Error("nope");
      },
      setItem() {
        throw new Error("nope");
      },
      removeItem() {
        throw new Error("nope");
      },
      key() {
        throw new Error("nope");
      },
      get length(): number {
        throw new Error("nope");
      },
    };
    const adapter = createStorageAdapter(throwing);
    expect(adapter.load().status).toBe("unavailable");
    expect(adapter.save(customData())).toEqual({ ok: false, reason: "unavailable" });
    expect(() => adapter.clear()).not.toThrow();
  });

  it("writes a snapshot and lists snapshots newest first", () => {
    vi.useFakeTimers();
    const storage = new FakeStorage();
    const adapter = createStorageAdapter(storage);

    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    expect(adapter.backup?.(customData())).toBe(true);
    vi.setSystemTime(new Date("2026-01-02T00:00:00.000Z"));
    adapter.backup?.(customData());

    expect(adapter.listBackups?.().map((entry) => entry.savedAt)).toEqual([
      "2026-01-02T00:00:00.000Z",
      "2026-01-01T00:00:00.000Z",
    ]);
    expect(storage.raw(`${BACKUP_PREFIX}2026-01-01T00:00:00.000Z`)).toBe(exportData(customData()));
  });

  it("reads a snapshot back and reports a missing one", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    const adapter = createStorageAdapter(new FakeStorage());
    adapter.backup?.(customData());

    expect(adapter.readBackup?.("2026-01-01T00:00:00.000Z")).toEqual(customData());
    expect(adapter.readBackup?.("nope")).toBeNull();
  });

  it("returns null for an unreadable snapshot", () => {
    const storage = new FakeStorage();
    storage.setItem(`${BACKUP_PREFIX}bad`, "{not json");
    const adapter = createStorageAdapter(storage);

    expect(adapter.readBackup?.("bad")).toBeNull();
  });

  it("deletes a snapshot", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    const adapter = createStorageAdapter(new FakeStorage());
    adapter.backup?.(customData());

    adapter.deleteBackup?.("2026-01-01T00:00:00.000Z");
    expect(adapter.listBackups?.()).toEqual([]);
  });

  it("keeps only the newest five snapshots", () => {
    vi.useFakeTimers();
    const adapter = createStorageAdapter(new FakeStorage());
    for (let day = 1; day <= 6; day += 1) {
      vi.setSystemTime(new Date(`2026-01-0${day}T00:00:00.000Z`));
      adapter.backup?.(customData());
    }

    const list = adapter.listBackups?.() ?? [];
    expect(list).toHaveLength(5);
    expect(list.some((entry) => entry.savedAt === "2026-01-01T00:00:00.000Z")).toBe(false);
  });

  it("handles snapshots without storage", () => {
    const adapter = createStorageAdapter(null);
    expect(adapter.backup?.(customData())).toBe(false);
    expect(adapter.listBackups?.()).toEqual([]);
    expect(adapter.readBackup?.("x")).toBeNull();
    expect(() => adapter.deleteBackup?.("x")).not.toThrow();
  });

  it("lists, reads and deletes unreadable backups newest first", () => {
    const storage = new FakeStorage();
    storage.setItem(`${CORRUPT_PREFIX}2026-01-01T00:00:00.000Z`, "{not json");
    storage.setItem(`${CORRUPT_PREFIX}2026-01-02T00:00:00.000Z`, "also bad");
    storage.setItem(`${CORRUPT_PREFIX}2026-01-03T00:00:00.000Z`, "newest bad");
    const adapter = createStorageAdapter(storage);

    expect(adapter.listCorruptBackups?.().map((entry) => entry.id)).toEqual([
      "2026-01-03T00:00:00.000Z",
      "2026-01-02T00:00:00.000Z",
      "2026-01-01T00:00:00.000Z",
    ]);
    expect(adapter.readCorruptRaw?.("2026-01-02T00:00:00.000Z")).toBe("also bad");
    expect(adapter.readCorruptRaw?.("missing")).toBeNull();

    adapter.deleteCorrupt?.("2026-01-02T00:00:00.000Z");
    expect(adapter.listCorruptBackups?.().map((entry) => entry.id)).toEqual([
      "2026-01-03T00:00:00.000Z",
      "2026-01-01T00:00:00.000Z",
    ]);
  });

  it("handles unreadable backups without storage", () => {
    const adapter = createStorageAdapter(null);
    expect(adapter.listCorruptBackups?.()).toEqual([]);
    expect(adapter.readCorruptRaw?.("x")).toBeNull();
    expect(() => adapter.deleteCorrupt?.("x")).not.toThrow();
  });
});
