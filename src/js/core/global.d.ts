import type { ThemeConfig } from "./config";
import type { HanloLifecycleApi } from "./runtime";
import type { PageControllerDefinition } from "./types";

interface HanloPjax {
  loadUrl(url: string, options?: unknown): unknown;
}

declare global {
  interface Window {
    GLOBAL_CONFIG: Readonly<ThemeConfig>;
    HanloLifecycle?: HanloLifecycleApi;
    HanloPageControllers?: PageControllerDefinition[];
    pjax?: HanloPjax;
  }
}

export {};
