import { afterEach, describe, expect, it, vi } from "vitest";

import { createBrowserStorage, ExpiringStorage, type StorageLike } from "../../src/js/core/storage";

afterEach(() => {
  vi.unstubAllGlobals();
});

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

  it("falls back to in-memory storage when window.localStorage is blocked or throws", () => {
    vi.stubGlobal("window", {
      get localStorage() {
        throw new Error("SecurityError: storage disabled");
      },
    });
    const blockedStorage = createBrowserStorage();
    blockedStorage.set("theme", "dark", 2);
    expect(blockedStorage.get("theme")).toBe("dark");

    vi.stubGlobal("window", {
      localStorage: {
        getItem() {
          throw new Error("QuotaExceededError");
        },
        setItem() {
          throw new Error("QuotaExceededError");
        },
        removeItem() {
          throw new Error("QuotaExceededError");
        },
      },
    });
    const failingStorage = createBrowserStorage();
    failingStorage.set("aside-status", "hide", 2);
    expect(failingStorage.get("aside-status")).toBe("hide");
  });
});
