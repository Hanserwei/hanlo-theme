export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

interface StoredValue<T> {
  readonly value: T;
  readonly expiry: number;
}

function isStoredValue(value: unknown): value is StoredValue<unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  return "value" in candidate && typeof candidate["expiry"] === "number";
}

export class ExpiringStorage {
  readonly #now: () => number;
  readonly #storage: StorageLike;

  constructor(storage: StorageLike, now: () => number = Date.now) {
    this.#storage = storage;
    this.#now = now;
  }

  set<T>(key: string, value: T, ttlDays: number): void {
    if (ttlDays <= 0) return;
    const item: StoredValue<T> = {
      value,
      expiry: this.#now() + ttlDays * 86_400_000,
    };
    this.#storage.setItem(key, JSON.stringify(item));
  }

  get<T>(key: string): T | undefined {
    const itemText = this.#storage.getItem(key);
    if (!itemText) return undefined;

    try {
      const item: unknown = JSON.parse(itemText);
      if (!isStoredValue(item) || this.#now() > item.expiry) {
        this.#storage.removeItem(key);
        return undefined;
      }
      return item.value as T;
    } catch {
      this.#storage.removeItem(key);
      return undefined;
    }
  }
}

class MemoryStorage implements StorageLike {
  readonly #values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.#values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.#values.set(key, value);
  }

  removeItem(key: string): void {
    this.#values.delete(key);
  }
}

class SafeStorage implements StorageLike {
  readonly #fallback = new MemoryStorage();
  readonly #primary: StorageLike | undefined;

  constructor(primary: StorageLike | undefined) {
    this.#primary = primary;
  }

  getItem(key: string): string | null {
    if (this.#primary) {
      try {
        return this.#primary.getItem(key);
      } catch {
        // Fall through to in-memory storage when browser storage is blocked.
      }
    }
    return this.#fallback.getItem(key);
  }

  setItem(key: string, value: string): void {
    if (this.#primary) {
      try {
        this.#primary.setItem(key, value);
        return;
      } catch {
        // Fall through to in-memory storage on quota or security errors.
      }
    }
    this.#fallback.setItem(key, value);
  }

  removeItem(key: string): void {
    if (this.#primary) {
      try {
        this.#primary.removeItem(key);
      } catch {
        // Ignore storage errors and clear any fallback entry too.
      }
    }
    this.#fallback.removeItem(key);
  }
}

export function createBrowserStorage(): ExpiringStorage {
  let browserStorage: StorageLike | undefined;
  try {
    browserStorage = window.localStorage;
  } catch {
    browserStorage = undefined;
  }
  return new ExpiringStorage(new SafeStorage(browserStorage));
}
