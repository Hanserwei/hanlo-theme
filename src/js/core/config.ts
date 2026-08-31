export interface ThemeConfig {
  readonly htmlType: string;
  readonly postTitle: string;
  readonly isPost: boolean;
  readonly isHome: boolean;
  readonly lazyload: Readonly<{
    enable: boolean;
    error: string;
    [key: string]: unknown;
  }>;
  readonly loadingBox: boolean;
  readonly loadProgressBar: boolean;
  readonly rightMenuEnable: boolean;
  readonly source: Readonly<Record<string, unknown>>;
  readonly [key: string]: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertField<T extends "boolean" | "string">(
  source: Record<string, unknown>,
  key: string,
  expectedType: T,
): void {
  if (typeof source[key] !== expectedType) {
    throw new TypeError(`GLOBAL_CONFIG.${key} must be a ${expectedType}.`);
  }
}

export function validateThemeConfig(value: unknown): asserts value is ThemeConfig {
  if (!isRecord(value)) throw new TypeError("GLOBAL_CONFIG must be an object.");

  assertField(value, "htmlType", "string");
  assertField(value, "postTitle", "string");
  assertField(value, "isPost", "boolean");
  assertField(value, "isHome", "boolean");
  assertField(value, "loadingBox", "boolean");
  assertField(value, "loadProgressBar", "boolean");
  assertField(value, "rightMenuEnable", "boolean");

  if (!isRecord(value.lazyload)) {
    throw new TypeError("GLOBAL_CONFIG.lazyload must be an object.");
  }
  assertField(value.lazyload, "enable", "boolean");
  assertField(value.lazyload, "error", "string");

  if (!isRecord(value.source)) {
    throw new TypeError("GLOBAL_CONFIG.source must be an object.");
  }
}

function deepFreeze<T>(value: T, visited = new WeakSet<object>()): Readonly<T> {
  if ((typeof value !== "object" && typeof value !== "function") || value === null) {
    return value;
  }
  if (visited.has(value)) return value;
  visited.add(value);

  for (const child of Object.values(value)) deepFreeze(child, visited);
  return Object.freeze(value);
}

export function parseThemeConfig(value: unknown): Readonly<ThemeConfig> {
  validateThemeConfig(value);
  return deepFreeze(value);
}

export class ThemeConfigStore {
  #current: Readonly<ThemeConfig> | undefined;

  get current(): Readonly<ThemeConfig> {
    if (!this.#current) throw new Error("Theme configuration has not been initialized.");
    return this.#current;
  }

  refresh(value: unknown = window.GLOBAL_CONFIG): Readonly<ThemeConfig> {
    this.#current = parseThemeConfig(value);
    window.GLOBAL_CONFIG = this.#current;
    return this.#current;
  }
}
