import { describe, expect, it } from "vitest";

import { PageResourceScope } from "../../src/js/core/resource-scope";
import { siteShellTestables } from "../../src/js/features/site-shell";

describe("site shell state helpers", () => {
  it("samples without mutating or duplicating input", () => {
    const input = [1, 2, 3];
    const result = siteShellTestables.randomItems(input, 3);
    expect(new Set(result).size).toBe(3);
    expect(input).toEqual([1, 2, 3]);
  });

  it("classifies contrast and clamps color adjustments", () => {
    expect(siteShellTestables.contrastIsLight("#ffffff")).toBe(true);
    expect(siteShellTestables.contrastIsLight("#000000")).toBe(false);
    expect(siteShellTestables.adjustHexColor("#101010", -40)).toBe("#000000");
  });
});

function avatarState(complete: boolean, naturalWidth: number) {
  return Object.assign(new EventTarget(), { complete, naturalWidth, hidden: false });
}

describe("navigation avatar fallback", () => {
  it("keeps the fallback visible until an avatar loads and restores it after failure", async () => {
    const resources = new PageResourceScope();
    const image = avatarState(false, 0);
    siteShellTestables.initializeNavigationAvatar(image as unknown as HTMLImageElement, resources);
    expect(image.hidden).toBe(true);

    image.complete = true;
    image.naturalWidth = 96;
    image.dispatchEvent(new Event("load"));
    expect(image.hidden).toBe(false);

    image.naturalWidth = 0;
    image.dispatchEvent(new Event("error"));
    expect(image.hidden).toBe(true);
    await resources.dispose();
  });

  it.each([96, 0])("handles an already settled avatar with width %i", async (naturalWidth) => {
    const resources = new PageResourceScope();
    const image = avatarState(true, naturalWidth);
    siteShellTestables.initializeNavigationAvatar(image as unknown as HTMLImageElement, resources);
    expect(image.hidden).toBe(naturalWidth === 0);
    await resources.dispose();
  });

  it("releases avatar listeners when the page is unmounted", async () => {
    const resources = new PageResourceScope();
    const image = avatarState(false, 0);
    siteShellTestables.initializeNavigationAvatar(image as unknown as HTMLImageElement, resources);
    await resources.dispose();

    image.complete = true;
    image.naturalWidth = 96;
    image.dispatchEvent(new Event("load"));
    expect(image.hidden).toBe(true);
  });
});
