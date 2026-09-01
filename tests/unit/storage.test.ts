import { describe, expect, it } from "vitest";

import { ExpiringStorage, type StorageLike } from "../../src/js/core/storage";

function createStorage(): StorageLike & { readonly values: Map<string, string> } {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => {
      values.delete(key);
    },
  };
}

describe("ExpiringStorage", () => {
  it("stores values until their expiry time", () => {
    const storage = createStorage();
    let now = 1_000;
    const expiringStorage = new ExpiringStorage(storage, () => now);

    expiringStorage.set("theme", "dark", 2);
    expect(expiringStorage.get("theme")).toBe("dark");

    now += 2 * 86_400_000 + 1;
    expect(expiringStorage.get("theme")).toBeUndefined();
    expect(storage.values.has("theme")).toBe(false);
  });

  it("removes malformed entries instead of breaking page initialization", () => {
    const storage = createStorage();
    storage.values.set("theme", "not json");

    expect(new ExpiringStorage(storage).get("theme")).toBeUndefined();
    expect(storage.values.has("theme")).toBe(false);
  });
});
