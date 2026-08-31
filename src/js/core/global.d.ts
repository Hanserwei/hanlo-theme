import type { ThemeConfig } from "./config";
import type { HanloLifecycleApi } from "./runtime";
import type { PageControllerDefinition } from "./types";

interface Destroyable {
  destroy(...arguments_: unknown[]): unknown;
}

interface HanloPjax {
  loadUrl(url: string, options?: unknown): unknown;
}

declare global {
  interface Window {
    GLOBAL_CONFIG: Readonly<ThemeConfig>;
    HanloLifecycle?: HanloLifecycleApi;
    HanloPageControllers?: PageControllerDefinition[];
    _friendMomentsInstance?: Destroyable | null;
    hanloIndexEssaySwiper?: Destroyable | null;
    lazyLoadInstance?: Destroyable | null;
    pjax?: HanloPjax;
    tocbot?: Destroyable;
    typed?: Destroyable;
  }
}

export {};
