import { describe, expect, it } from "vitest";

import { oppositeThemeMode, resolveThemeMode } from "../../src/js/features/theme-mode/state";

describe("theme mode state", () => {
  it("honors an explicit theme setting before the visitor preference", () => {
    expect(
      resolveThemeMode({
        configured: "light",
        stored: "dark",
        prefersDark: true,
        prefersLight: false,
        hour: 23,
      }),
    ).toBe("light");
  });

  it("uses the stored preference in system mode", () => {
    expect(
      resolveThemeMode({
        configured: "system",
        stored: "light",
        prefersDark: true,
        prefersLight: false,
        hour: 23,
      }),
    ).toBe("light");
  });

  it("falls back to system preference and time of day", () => {
    expect(
      resolveThemeMode({
        configured: "system",
        prefersDark: true,
        prefersLight: false,
        hour: 12,
      }),
    ).toBe("dark");
    expect(
      resolveThemeMode({
        configured: "system",
        prefersDark: false,
        prefersLight: true,
        hour: 23,
      }),
    ).toBe("light");
    expect(
      resolveThemeMode({
        configured: "system",
        prefersDark: false,
        prefersLight: false,
        hour: 23,
      }),
    ).toBe("dark");
    expect(
      resolveThemeMode({
        configured: "system",
        prefersDark: false,
        prefersLight: false,
        hour: 12,
      }),
    ).toBe("light");
  });

  it("toggles deterministically", () => {
    expect(oppositeThemeMode("light")).toBe("dark");
    expect(oppositeThemeMode("dark")).toBe("light");
  });
});
