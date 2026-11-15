import { parseHTML } from "linkedom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PageResourceScope } from "../../src/js/core/resource-scope";
import { ExpiringStorage } from "../../src/js/core/storage";
import type { PageControllerContext } from "../../src/js/core/types";
import { createSiteShellController, siteShellTestables } from "../../src/js/features/site-shell";

const { renderQr } = vi.hoisted(() => ({ renderQr: vi.fn() }));
vi.mock("qrcode", () => ({ toCanvas: renderQr }));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

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

describe("optional content isolation", () => {
  it("finishes mounting and keeps navigation working when the QR renderer fails", async () => {
    const { document, window } = parseHTML(`<html><body>
      <div id="console"></div><button data-hanlo-action="show-console">Console</button>
      <div id="qrcode"></div></body></html>`);
    vi.stubGlobal("document", document);
    vi.stubGlobal("window", window);
    vi.stubGlobal("Element", window.Element);
    vi.stubGlobal("location", new URL("https://example.test/"));
    vi.stubGlobal("sessionStorage", { getItem: () => null });
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    renderQr.mockRejectedValue(new Error("QR renderer unavailable"));
    const resources = new PageResourceScope();
    const storage = new ExpiringStorage({ getItem: () => null, setItem() {}, removeItem() {} });
    const controller = createSiteShellController(storage).create({
      config: {
        htmlType: "index",
        date_suffix: {},
        lazyload: { enable: false },
        source: { post: { dynamicBackground: false } },
      },
      resources,
    } as PageControllerContext);
    try {
      expect(controller.mount(document as unknown as ParentNode)).toBeUndefined();
      expect(document.body.dataset["type"]).toBe("index");
      await vi.waitFor(() => expect(warning).toHaveBeenCalled());
      document.querySelector<HTMLElement>("button")!.click();
      expect(document.querySelector("#console")!.classList.contains("show")).toBe(true);
      expect(resources.disposed).toBe(false);
    } finally {
      await resources.dispose();
    }
  });
});
