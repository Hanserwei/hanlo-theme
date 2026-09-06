import type { BAClickFX } from "ba-click-fx";

import type { PageResourceScope } from "../../core/resource-scope";

export type ClickEffectLoader = () => Promise<Pick<typeof import("ba-click-fx"), "BAClickFX">>;

const loadClickEffect: ClickEffectLoader = () => import("ba-click-fx");

/** Called only when the site's click-effect switch is enabled. */
export function mountClickEffect(
  resources: PageResourceScope,
  load: ClickEffectLoader = loadClickEffect,
): void {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let instance: BAClickFX | undefined;
  let loading = false;
  let failed = false;
  let pageHidden = document.hidden;

  const destroy = (): void => {
    instance?.destroy();
    instance = undefined;
  };

  const start = async (): Promise<void> => {
    if (instance || loading || failed || resources.disposed || pageHidden || reducedMotion.matches)
      return;
    loading = true;
    try {
      const { BAClickFX: ClickEffect } = await load();
      // A download can finish after navigation, a tab switch or a preference change.
      if (resources.disposed || pageHidden || reducedMotion.matches) return;
      if (!document.createElement("canvas").getContext("2d")) return;
      instance = new ClickEffect({
        // The library's transparent overlay preserves both light and dark page backgrounds.
        outputCompositing: "browser-overlay",
        clickEnabled: true,
        trailEnabled: true,
        trailAlways: false,
        touchAction: "auto",
        maxDpr: 1,
      });
    } catch (error) {
      failed = true;
      if (!resources.disposed) console.error("[Hanlo] Could not start the click effect.", error);
    } finally {
      loading = false;
    }
  };

  const synchronize = (): void => {
    if (resources.disposed) return;
    if (reducedMotion.matches) {
      destroy();
      return;
    }
    if (instance) instance.setPaused(pageHidden, { clear: pageHidden });
    else void start();
  };

  resources.listen(reducedMotion, "change", synchronize);
  resources.listen(document, "visibilitychange", () => {
    pageHidden = document.hidden;
    synchronize();
  });
  // BFCache preserves the page scope; explicitly pause and resume its renderer.
  resources.listen(window, "pagehide", () => {
    pageHidden = true;
    synchronize();
  });
  resources.listen(window, "pageshow", () => {
    pageHidden = document.hidden;
    synchronize();
  });
  resources.defer(destroy);
  synchronize();
}
