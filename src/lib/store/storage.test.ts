import { describe, expect, it } from "vitest";

import type { AppData } from "../types";
import { createSeedData } from "./seed";
import { CORRUPT_KEY, STORAGE_KEY, createStorageAdapter, type StorageLike } from "./storage";
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

  raw(key: string): string | null {
    return this.getItem(key);
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

  it("backs up malformed JSON without overwriting it and falls back to the seed", () => {
    const storage = new FakeStorage();
    storage.setItem(STORAGE_KEY, "{not json");
    const adapter = createStorageAdapter(storage);

    const result = adapter.load();
    expect(result.status).toBe("recovered");
    expect(result.data.isDemo).toBe(true);
    expect(storage.raw(CORRUPT_KEY)).toBe("{not json");
    expect(storage.raw(STORAGE_KEY)).toBe("{not json");
  });

  it("backs up schema-invalid data and falls back to the seed", () => {
    const storage = new FakeStorage();
    storage.setItem(STORAGE_KEY, JSON.stringify({ ...createSeedData(), version: 99 }));
    const adapter = createStorageAdapter(storage);

    const result = adapter.load();
    expect(result.status).toBe("recovered");
    expect(storage.raw(CORRUPT_KEY)).not.toBeNull();
    expect(storage.raw(STORAGE_KEY)).toContain('"version":99');
  });

  it("backs up data with a dangling categoryId", () => {
    const storage = new FakeStorage();
    storage.setItem(STORAGE_KEY, JSON.stringify(invalidData()));
    const adapter = createStorageAdapter(storage);

    expect(adapter.load().status).toBe("recovered");
    expect(storage.raw(CORRUPT_KEY)).not.toBeNull();
  });

  it("does not create a corrupt backup for valid data", () => {
    const storage = new FakeStorage();
    const adapter = createStorageAdapter(storage);
    adapter.save(customData());
    adapter.load();
    expect(storage.raw(CORRUPT_KEY)).toBeNull();
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
    };
    const adapter = createStorageAdapter(throwing);
    expect(adapter.load().status).toBe("unavailable");
    expect(adapter.save(customData())).toEqual({ ok: false, reason: "unavailable" });
    expect(() => adapter.clear()).not.toThrow();
  });
});
