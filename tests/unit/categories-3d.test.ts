import { afterEach, describe, expect, it, vi } from "vitest";

import { PageResourceScope } from "../../src/js/core/resource-scope";
import {
  calculateTilt,
  mountCategories3d,
  type CategorySceneLoader,
} from "../../src/js/features/categories-3d";

const centered = {
  rotationX: 0,
  rotationY: 0,
  backgroundX: 0,
  backgroundY: 0,
  lightX: 50,
  lightY: 50,
};

describe("category scene pointer geometry", () => {
  it("centers the layers and light when the pointer is centered", () => {
    expect(calculateTilt(50, 50, 100, 100)).toEqual(centered);
  });

  it("clamps out-of-bounds coordinates so fast pointer movement cannot over-rotate a card", () => {
    expect(calculateTilt(100, 0, 100, 100)).toEqual({
      rotationX: 10,
      rotationY: 12,
      backgroundX: -16,
      backgroundY: 16,
      lightX: 100,
      lightY: 0,
    });
    expect(calculateTilt(10_000, -10_000, 100, 100)).toEqual(calculateTilt(100, 0, 100, 100));
    expect(calculateTilt(NaN, Infinity, 0, -1)).toEqual(centered);
  });
});

function fixture({ reduced = false, cards = true } = {}) {
  const media = Object.assign(new EventTarget(), { matches: reduced });
  const image = Object.assign(new EventTarget(), {
    hidden: false,
    complete: true,
    naturalWidth: 0,
  });
  vi.stubGlobal("window", { matchMedia: () => media });
  vi.stubGlobal("document", {
    querySelector: () => (cards ? {} : null),
    querySelectorAll: () => [image],
  });
  const cleanups: ReturnType<typeof vi.fn>[] = [];
  const mountCategoryScene = vi.fn((resources: PageResourceScope) => {
    const cleanup = vi.fn();
    cleanups.push(cleanup);
    resources.defer(cleanup);
  });
  const load = vi.fn<CategorySceneLoader>(async () => ({ mountCategoryScene }));
  const resources = new PageResourceScope();
  return { media, image, load, resources, mountCategoryScene, cleanups };
}

async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}
afterEach(() => vi.unstubAllGlobals());

describe("category scene lazy loading", () => {
  it("does not download the animation library for list mode or reduced motion", async () => {
    const list = fixture({ cards: false });
    mountCategories3d(list.resources, list.load);
    expect(list.load).not.toHaveBeenCalled();
    await list.resources.dispose();
    const reduced = fixture({ reduced: true });
    mountCategories3d(reduced.resources, reduced.load);
    expect(reduced.load).not.toHaveBeenCalled();
    expect(reduced.image.hidden).toBe(true);
    await reduced.resources.dispose();
  });

  it("cleans and recreates a single scene when motion preference changes", async () => {
    const view = fixture();
    mountCategories3d(view.resources, view.load);
    await flush();
    expect(view.mountCategoryScene).toHaveBeenCalledOnce();
    view.media.matches = true;
    view.media.dispatchEvent(new Event("change"));
    await flush();
    expect(view.cleanups[0]).toHaveBeenCalledOnce();
    view.media.matches = false;
    view.media.dispatchEvent(new Event("change"));
    await flush();
    expect(view.mountCategoryScene).toHaveBeenCalledTimes(2);
    await view.resources.dispose();
    expect(view.cleanups[1]).toHaveBeenCalledOnce();
    view.media.dispatchEvent(new Event("change"));
    expect(view.mountCategoryScene).toHaveBeenCalledTimes(2);
  });

  it.each(["navigation", "reduced"])(
    "does not mount a delayed library after %s",
    async (change) => {
      const view = fixture();
      const pending = Promise.withResolvers<Awaited<ReturnType<CategorySceneLoader>>>();
      view.load.mockReturnValue(pending.promise);
      mountCategories3d(view.resources, view.load);
      if (change === "navigation") await view.resources.dispose();
      else {
        view.media.matches = true;
        view.media.dispatchEvent(new Event("change"));
      }
      pending.resolve({ mountCategoryScene: view.mountCategoryScene });
      await flush();
      expect(view.mountCategoryScene).not.toHaveBeenCalled();
      await view.resources.dispose();
    },
  );

  it("cleans partial animation setup after an initialization error without retry loops", async () => {
    const view = fixture();
    const cleanup = vi.fn();
    view.mountCategoryScene.mockImplementation((resources) => {
      resources.defer(cleanup);
      throw new Error("renderer unavailable");
    });
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mountCategories3d(view.resources, view.load);
    await flush();
    expect(cleanup).toHaveBeenCalledOnce();
    view.media.dispatchEvent(new Event("change"));
    await flush();
    expect(view.load).toHaveBeenCalledOnce();
    await view.resources.dispose();
    log.mockRestore();
  });
});
