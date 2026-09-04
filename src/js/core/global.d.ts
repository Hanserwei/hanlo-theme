import type { ThemeConfig } from "./config";
import type { HanloLifecycleApi } from "./runtime";
import type { PageControllerDefinition } from "./types";

declare global {
  interface Window {
    GLOBAL_CONFIG: Readonly<ThemeConfig>;
    HanloLifecycle?: HanloLifecycleApi;
    HanloPageControllers?: PageControllerDefinition[];
    LinkSubmitWidget?: { open(): void };
    SearchWidget?: { open(): void };
  }
}

export {};
