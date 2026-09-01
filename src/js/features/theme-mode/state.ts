export type ThemeMode = "dark" | "light";
export type ThemeModeSetting = ThemeMode | "system";

export interface ThemeModeInputs {
  readonly configured: ThemeModeSetting;
  readonly stored?: ThemeMode;
  readonly prefersDark: boolean;
  readonly prefersLight: boolean;
  readonly hour: number;
}

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === "dark" || value === "light";
}

export function resolveThemeMode({
  configured,
  stored,
  prefersDark,
  prefersLight,
  hour,
}: ThemeModeInputs): ThemeMode {
  if (configured === "dark" || configured === "light") return configured;
  if (stored) return stored;
  if (prefersDark) return "dark";
  if (prefersLight) return "light";
  return hour <= 6 || hour >= 18 ? "dark" : "light";
}

export function oppositeThemeMode(mode: ThemeMode): ThemeMode {
  return mode === "dark" ? "light" : "dark";
}
