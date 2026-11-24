import { LANGUAGE_ALIASES } from "./registry";

const FALLBACK_THEMES = { light: "one-light", dark: "one-dark-pro" } as const;
const LEGACY_THEME_ALIASES: Readonly<Record<string, string>> = {
  "one-dark": "one-dark-pro",
  vs: "light-plus",
  "vsc-dark-plus": "dark-plus",
};

export function normalizeTheme(
  theme: string,
  mode: "dark" | "light",
  themes: Readonly<Record<string, unknown>> | readonly string[],
): string {
  const requested = LEGACY_THEME_ALIASES[theme] ?? theme;
  const available = Array.isArray(themes)
    ? (themes as readonly string[]).includes(requested)
    : Boolean((themes as Readonly<Record<string, unknown>>)[requested]);
  return requested && available ? requested : FALLBACK_THEMES[mode];
}

export function normalizeLanguage(
  language: string,
  languages: Readonly<Record<string, unknown>> | readonly string[],
): string {
  const requested = language.trim().toLowerCase();
  const aliased = Object.hasOwn(LANGUAGE_ALIASES, requested)
    ? LANGUAGE_ALIASES[requested]!
    : requested;
  if (["text", "txt", "plain", "plaintext"].includes(aliased)) return "text";
  const available = Array.isArray(languages)
    ? (languages as readonly string[]).includes(aliased)
    : Object.hasOwn(languages, aliased);
  return available ? aliased : "text";
}
