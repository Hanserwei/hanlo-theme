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

export function createBrowserStorage(): ExpiringStorage {
  return new ExpiringStorage(window.localStorage);
}
