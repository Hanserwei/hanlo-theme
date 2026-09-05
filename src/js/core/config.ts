export interface ThemeSourceConfig extends Readonly<Record<string, unknown>> {
  readonly post?: Readonly<{ readonly dynamicBackground?: boolean }>;
  readonly tool?: Readonly<{ readonly switch?: boolean }>;
  readonly links?: Readonly<{ readonly linksUrl?: string; readonly linksNum?: number }>;
  readonly footer?: Readonly<{ readonly default_enable?: boolean }>;
}

export interface ThemeConfig {
  readonly htmlType: string;
  readonly postTitle: string;
  readonly isPost: boolean;
  readonly isHome: boolean;
  readonly isFriendLinksInFooter?: boolean;
  readonly lightbox?: string;
  readonly helloText?: readonly string[];
  readonly copyright?: Readonly<{
    readonly limitCount: number;
    readonly languages: Readonly<{
      readonly author: string;
      readonly link: string;
      readonly source: string;
      readonly info: string;
    }>;
  }>;
  readonly lazyload: Readonly<{
    enable: boolean;
    error: string;
    [key: string]: unknown;
  }>;
  readonly loadingBox: boolean;
  readonly rightMenuEnable: boolean;
  readonly colorScheme: "dark" | "light" | "system";
  readonly Snackbar?: Readonly<{
    readonly chs_to_cht?: string;
    readonly cht_to_chs?: string;
    readonly day_to_night?: string;
    readonly night_to_day?: string;
    readonly bgLight?: string;
    readonly bgDark?: string;
    readonly position?: string;
    readonly [key: string]: unknown;
  }>;
  readonly translate: Readonly<{
    readonly defaultEncoding: number;
    readonly translateDelay: number;
    readonly msgToTraditionalChinese: string;
    readonly msgToSimplifiedChinese: string;
  }>;
  readonly shiki: Readonly<{
    readonly enable: boolean;
    readonly enable_title: boolean;
    readonly enable_hr: boolean;
    readonly enable_line: boolean;
    readonly enable_copy: boolean;
    readonly enable_expander: boolean;
    readonly height_limit: number;
    readonly enable_height_limit: boolean;
    readonly theme_light: string;
    readonly theme_dark: string;
  }>;
  readonly effects: Readonly<{
    readonly bubble: boolean;
    readonly universe: boolean;
  }>;
  readonly friends: Readonly<{
    readonly apiUrl: string;
    readonly pageSize: number;
    readonly errorImage: string;
  }>;
  readonly postAi: Readonly<{
    readonly summary: string;
    readonly randomRange: number;
    readonly wordLimit: number;
    readonly buttonLink: string;
    readonly name: string;
    readonly mode: "local" | "tianli";
    readonly switchable: boolean;
    readonly key: string;
    readonly referer: string;
  }>;
  readonly widgets: Readonly<{
    readonly dynamicTitle: Readonly<{ enabled: boolean; leave: string; back: string }>;
    readonly greeting: Readonly<{ enabled: boolean; items: readonly unknown[] }>;
    readonly typed: Readonly<{ random: boolean; items: readonly unknown[] }>;
    readonly tenYear: Readonly<{ startedAt: string; endedAt: string }>;
    readonly randomTagColors: boolean;
  }>;
  readonly date_suffix: Readonly<{
    readonly just: string;
    readonly min: string;
    readonly hour: string;
    readonly day: string;
    readonly month?: string;
  }>;
  readonly source: ThemeSourceConfig;
  readonly [key: string]: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertField<T extends "boolean" | "number" | "string">(
  source: Record<string, unknown>,
  key: string,
  expectedType: T,
  path = "GLOBAL_CONFIG",
): void {
  if (typeof source[key] !== expectedType) {
    throw new TypeError(`${path}.${key} must be a ${expectedType}.`);
  }
}

function assertRecord(source: Record<string, unknown>, key: string): Record<string, unknown> {
  const value = source[key];
  if (!isRecord(value)) throw new TypeError(`GLOBAL_CONFIG.${key} must be an object.`);
  return value;
}

export function validateThemeConfig(value: unknown): asserts value is ThemeConfig {
  if (!isRecord(value)) throw new TypeError("GLOBAL_CONFIG must be an object.");

  assertField(value, "htmlType", "string");
  assertField(value, "postTitle", "string");
  assertField(value, "isPost", "boolean");
  assertField(value, "isHome", "boolean");
  assertField(value, "loadingBox", "boolean");
  assertField(value, "rightMenuEnable", "boolean");

  if (!(["dark", "light", "system"] as const).includes(value.colorScheme as never)) {
    throw new TypeError("GLOBAL_CONFIG.colorScheme must be dark, light, or system.");
  }

  const lazyload = assertRecord(value, "lazyload");
  assertField(lazyload, "enable", "boolean", "GLOBAL_CONFIG.lazyload");
  assertField(lazyload, "error", "string", "GLOBAL_CONFIG.lazyload");

  assertRecord(value, "source");

  const suffixes = assertRecord(value, "date_suffix");
  for (const key of ["just", "min", "hour", "day"]) {
    assertField(suffixes, key, "string", "GLOBAL_CONFIG.date_suffix");
  }

  const translate = assertRecord(value, "translate");
  assertField(translate, "defaultEncoding", "number", "GLOBAL_CONFIG.translate");
  assertField(translate, "translateDelay", "number", "GLOBAL_CONFIG.translate");
  assertField(translate, "msgToTraditionalChinese", "string", "GLOBAL_CONFIG.translate");
  assertField(translate, "msgToSimplifiedChinese", "string", "GLOBAL_CONFIG.translate");

  const shiki = assertRecord(value, "shiki");
  for (const key of [
    "enable",
    "enable_title",
    "enable_hr",
    "enable_line",
    "enable_copy",
    "enable_expander",
    "enable_height_limit",
  ]) {
    assertField(shiki, key, "boolean", "GLOBAL_CONFIG.shiki");
  }
  assertField(shiki, "height_limit", "number", "GLOBAL_CONFIG.shiki");
  assertField(shiki, "theme_light", "string", "GLOBAL_CONFIG.shiki");
  assertField(shiki, "theme_dark", "string", "GLOBAL_CONFIG.shiki");

  const effects = assertRecord(value, "effects");
  assertField(effects, "bubble", "boolean", "GLOBAL_CONFIG.effects");
  assertField(effects, "universe", "boolean", "GLOBAL_CONFIG.effects");

  const friends = assertRecord(value, "friends");
  assertField(friends, "apiUrl", "string", "GLOBAL_CONFIG.friends");
  assertField(friends, "pageSize", "number", "GLOBAL_CONFIG.friends");
  assertField(friends, "errorImage", "string", "GLOBAL_CONFIG.friends");

  const postAi = assertRecord(value, "postAi");
  for (const key of ["summary", "buttonLink", "name", "key", "referer"]) {
    assertField(postAi, key, "string", "GLOBAL_CONFIG.postAi");
  }
  assertField(postAi, "randomRange", "number", "GLOBAL_CONFIG.postAi");
  assertField(postAi, "wordLimit", "number", "GLOBAL_CONFIG.postAi");
  assertField(postAi, "switchable", "boolean", "GLOBAL_CONFIG.postAi");
  if (postAi["mode"] !== "local" && postAi["mode"] !== "tianli") {
    throw new TypeError("GLOBAL_CONFIG.postAi.mode must be local or tianli.");
  }

  const widgets = assertRecord(value, "widgets");
  const dynamicTitle = assertRecord(widgets, "dynamicTitle");
  assertField(dynamicTitle, "enabled", "boolean", "GLOBAL_CONFIG.widgets.dynamicTitle");
  assertField(dynamicTitle, "leave", "string", "GLOBAL_CONFIG.widgets.dynamicTitle");
  assertField(dynamicTitle, "back", "string", "GLOBAL_CONFIG.widgets.dynamicTitle");
  const greeting = assertRecord(widgets, "greeting");
  assertField(greeting, "enabled", "boolean", "GLOBAL_CONFIG.widgets.greeting");
  if (!Array.isArray(greeting["items"])) {
    throw new TypeError("GLOBAL_CONFIG.widgets.greeting.items must be an array.");
  }
  const typed = assertRecord(widgets, "typed");
  assertField(typed, "random", "boolean", "GLOBAL_CONFIG.widgets.typed");
  if (!Array.isArray(typed["items"])) {
    throw new TypeError("GLOBAL_CONFIG.widgets.typed.items must be an array.");
  }
  const tenYear = assertRecord(widgets, "tenYear");
  assertField(tenYear, "startedAt", "string", "GLOBAL_CONFIG.widgets.tenYear");
  assertField(tenYear, "endedAt", "string", "GLOBAL_CONFIG.widgets.tenYear");
  assertField(widgets, "randomTagColors", "boolean", "GLOBAL_CONFIG.widgets");
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
