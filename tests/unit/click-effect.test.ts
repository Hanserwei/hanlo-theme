import type { BAClickFXOptions } from "ba-click-fx";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ThemeConfig } from "../../src/js/core/config";
import { PageResourceScope } from "../../src/js/core/resource-scope";
import type { PageControllerContext } from "../../src/js/core/types";
import { createEffectsController } from "../../src/js/features/effects";
import {
  mountClickEffect,
  type ClickEffectLoader,
} from "../../src/js/features/effects/click-effect";

function fixture({ reduced = false, hidden = false, canvas = true } = {}) {
  const media = Object.assign(new EventTarget(), { matches: reduced });
  const windowTarget = Object.assign(new EventTarget(), { matchMedia: vi.fn(() => media) });
  const documentTarget = Object.assign(new EventTarget(), {
    hidden,
    createElement: vi.fn(() => ({ getContext: () => (canvas ? {} : null) })),
  });
  vi.stubGlobal("window", windowTarget);
  vi.stubGlobal("document", documentTarget);
  const instances: MockEffect[] = [];
  class MockEffect {
    readonly destroy = vi.fn();
    readonly setPaused = vi.fn();
    constructor(readonly options: BAClickFXOptions) {
      instances.push(this);
    }
  }
  const module = { BAClickFX: MockEffect } as unknown as Awaited<ReturnType<ClickEffectLoader>>;
  const load = vi.fn<ClickEffectLoader>(async () => module);
  const resources = new PageResourceScope();
  return { media, windowTarget, documentTarget, instances, module, load, resources };
}

async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

afterEach(() => vi.unstubAllGlobals());

describe("BA click effect integration", () => {
  it("does not create any resources when all effects are switched off", async () => {
    const view = fixture();
    const definition = createEffectsController();
    const context = {
      config: { effects: { bubble: false, universe: false, baClick: false } } as ThemeConfig,
      resources: view.resources,
    } as PageControllerContext;
    expect(definition.when?.(context)).toBe(false);
    await definition.create(context).mount(document);
    expect(view.windowTarget.matchMedia).not.toHaveBeenCalled();
    expect(view.documentTarget.createElement).not.toHaveBeenCalled();
    expect(
      definition.when?.({
        ...context,
        config: { effects: { bubble: false, universe: false, baClick: true } } as ThemeConfig,
      }),
    ).toBe(true);
    await view.resources.dispose();
  });

  it("uses the packaged effect with transparent output and preserves native touch gestures", async () => {
    const view = fixture();
    mountClickEffect(view.resources, view.load);
    await flush();
    expect(view.load).toHaveBeenCalledOnce();
    expect(view.instances).toHaveLength(1);
    expect(view.instances[0]?.options).toMatchObject({
      outputCompositing: "browser-overlay",
      clickEnabled: true,
      trailEnabled: true,
      trailAlways: false,
      touchAction: "auto",
      maxDpr: 1,
    });
    await view.resources.dispose();
    expect(view.instances[0]?.destroy).toHaveBeenCalledOnce();
  });

  it("clears effects while hidden and resumes the same renderer across BFCache restores", async () => {
    const view = fixture();
    mountClickEffect(view.resources, view.load);
    await flush();
    const effect = view.instances[0]!;
    view.documentTarget.hidden = true;
    view.documentTarget.dispatchEvent(new Event("visibilitychange"));
    expect(effect.setPaused).toHaveBeenLastCalledWith(true, { clear: true });
    view.documentTarget.hidden = false;
    view.documentTarget.dispatchEvent(new Event("visibilitychange"));
    expect(effect.setPaused).toHaveBeenLastCalledWith(false, { clear: false });
    view.windowTarget.dispatchEvent(new Event("pagehide"));
    expect(effect.setPaused).toHaveBeenLastCalledWith(true, { clear: true });
    view.windowTarget.dispatchEvent(new Event("pageshow"));
    expect(effect.setPaused).toHaveBeenLastCalledWith(false, { clear: false });
    expect(view.instances).toHaveLength(1);
    await view.resources.dispose();
    const calls = effect.setPaused.mock.calls.length;
    view.windowTarget.dispatchEvent(new Event("pageshow"));
    view.documentTarget.dispatchEvent(new Event("visibilitychange"));
    expect(effect.setPaused).toHaveBeenCalledTimes(calls);
    expect(effect.destroy).toHaveBeenCalledOnce();
  });

  it("skips downloading for reduced motion and destroys the instance if that preference changes", async () => {
    const view = fixture({ reduced: true });
    mountClickEffect(view.resources, view.load);
    expect(view.load).not.toHaveBeenCalled();
    view.media.matches = false;
    view.media.dispatchEvent(new Event("change"));
    await flush();
    expect(view.instances).toHaveLength(1);
    view.media.matches = true;
    view.media.dispatchEvent(new Event("change"));
    expect(view.instances[0]?.destroy).toHaveBeenCalledOnce();
    view.media.matches = false;
    view.media.dispatchEvent(new Event("change"));
    await flush();
    expect(view.instances).toHaveLength(2);
    await view.resources.dispose();
    expect(view.instances[0]?.destroy).toHaveBeenCalledOnce();
    expect(view.instances[1]?.destroy).toHaveBeenCalledOnce();
  });

  it("delays loading in a hidden document and avoids duplicate initialization while loading", async () => {
    const view = fixture({ hidden: true });
    const pending = Promise.withResolvers<Awaited<ReturnType<ClickEffectLoader>>>();
    view.load.mockReturnValue(pending.promise);
    mountClickEffect(view.resources, view.load);
    expect(view.load).not.toHaveBeenCalled();
    view.documentTarget.hidden = false;
    view.documentTarget.dispatchEvent(new Event("visibilitychange"));
    view.media.dispatchEvent(new Event("change"));
    view.windowTarget.dispatchEvent(new Event("pageshow"));
    expect(view.load).toHaveBeenCalledOnce();
    pending.resolve(view.module);
    await flush();
    expect(view.instances).toHaveLength(1);
    await view.resources.dispose();
  });

  it.each(["dispose", "hide", "reduce"])("ignores a pending import after %s", async (action) => {
    const view = fixture();
    const pending = Promise.withResolvers<Awaited<ReturnType<ClickEffectLoader>>>();
    view.load.mockReturnValue(pending.promise);
    mountClickEffect(view.resources, view.load);
    if (action === "dispose") await view.resources.dispose();
    if (action === "hide") view.windowTarget.dispatchEvent(new Event("pagehide"));
    if (action === "reduce") {
      view.media.matches = true;
      view.media.dispatchEvent(new Event("change"));
    }
    pending.resolve(view.module);
    await flush();
    expect(view.instances).toHaveLength(0);
    await view.resources.dispose();
  });

  it("skips unsupported Canvas and contains import failures without repeated retries", async () => {
    const noCanvas = fixture({ canvas: false });
    mountClickEffect(noCanvas.resources, noCanvas.load);
    await flush();
    expect(noCanvas.instances).toHaveLength(0);
    await noCanvas.resources.dispose();
    const view = fixture();
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    view.load.mockRejectedValue(new Error("offline"));
    mountClickEffect(view.resources, view.load);
    await flush();
    view.windowTarget.dispatchEvent(new Event("pageshow"));
    expect(view.load).toHaveBeenCalledOnce();
    expect(error).toHaveBeenCalledOnce();
    await view.resources.dispose();
    error.mockRestore();
  });
});
