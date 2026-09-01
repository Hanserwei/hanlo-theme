import type { ThemeConfig } from "../../core/config";
import { createBrowserStorage, type ExpiringStorage } from "../../core/storage";
import type { PageControllerDefinition } from "../../core/types";
import { snackbarShow, syncThemeColor } from "../../core/ui";
import { isThemeMode, oppositeThemeMode, resolveThemeMode, type ThemeMode } from "./state";

const THEME_STORAGE_KEY = "theme";
const THEME_STORAGE_DAYS = 2;

function currentThemeMode(documentObject: Document): ThemeMode {
  return documentObject.documentElement.dataset["theme"] === "dark" ? "dark" : "light";
}

function notifyThemeChange(mode: ThemeMode, config: Readonly<ThemeConfig>): void {
  const snackbar = config.Snackbar;
  const message = mode === "dark" ? snackbar?.day_to_night : snackbar?.night_to_day;
  if (message) snackbarShow(message, false, 2_000);
}

function updateModeLabels(documentObject: Document, mode: ThemeMode): void {
  const label = mode === "dark" ? "浅色模式" : "深色模式";
  documentObject.querySelectorAll<HTMLElement>(".menu-darkmode-text").forEach((element) => {
    element.textContent = label;
  });
}

export function applyThemeMode(
  mode: ThemeMode,
  documentObject: Document = document,
  notify = false,
  config: Readonly<ThemeConfig> = window.GLOBAL_CONFIG,
): void {
  documentObject.documentElement.dataset["theme"] = mode;
  documentObject.documentElement.classList.toggle("color-scheme-dark", mode === "dark");
  updateModeLabels(documentObject, mode);
  syncThemeColor();
  if (notify) notifyThemeChange(mode, config);
}

export function toggleThemeMode(
  storage: ExpiringStorage,
  documentObject: Document = document,
  config: Readonly<ThemeConfig> = window.GLOBAL_CONFIG,
): ThemeMode {
  const mode = oppositeThemeMode(currentThemeMode(documentObject));
  storage.set(THEME_STORAGE_KEY, mode, THEME_STORAGE_DAYS);
  applyThemeMode(mode, documentObject, true, config);
  return mode;
}

export function createThemeModeController(
  storage: ExpiringStorage = createBrowserStorage(),
  documentObject: Document = document,
  windowObject: Window = window,
): PageControllerDefinition {
  return {
    name: "theme-mode",
    create: ({ config, resources }) => ({
      mount() {
        const mediaQuery = windowObject.matchMedia("(prefers-color-scheme: dark)");
        const lightMediaQuery = windowObject.matchMedia("(prefers-color-scheme: light)");
        const configured = config.colorScheme;
        const storedValue = storage.get<unknown>(THEME_STORAGE_KEY);
        const stored = isThemeMode(storedValue) ? storedValue : undefined;
        const mode = resolveThemeMode({
          configured,
          stored,
          prefersDark: mediaQuery.matches,
          prefersLight: lightMediaQuery.matches,
          hour: new Date().getHours(),
        });
        applyThemeMode(mode, documentObject, false, config);

        resources.listen(documentObject, "click", (event) => {
          if (!(event.target instanceof Element)) return;
          const trigger = event.target.closest<HTMLElement>("[data-hanlo-action='toggle-theme']");
          if (!trigger) return;
          event.preventDefault();
          toggleThemeMode(storage, documentObject, config);
        });

        resources.listen(mediaQuery, "change", (event) => {
          if (config.colorScheme !== "system" || storage.get(THEME_STORAGE_KEY) !== undefined) {
            return;
          }
          applyThemeMode((event as MediaQueryListEvent).matches ? "dark" : "light", documentObject);
        });
      },
      unmount() {},
    }),
  };
}
