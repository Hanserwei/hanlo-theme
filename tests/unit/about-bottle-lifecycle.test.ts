import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PageResourceScope } from "../../src/js/core/resource-scope";
import { mountAboutBottle } from "../../src/js/features/about-bottle";

const mocks = vi.hoisted(() => ({ load: vi.fn(), create: vi.fn() }));
vi.mock("../../src/js/features/about-bottle/three-loader", () => ({ loadThree: mocks.load }));
vi.mock("../../src/js/features/about-bottle/scene", () => ({ createBottleScene: mocks.create }));

class Node extends EventTarget {
  dataset: Record<string, string> = {};
  hidden = false;
  textContent = "";
  selectors = new Map<string, Node>();
  lists = new Map<string, Node[]>();
  attributes = new Map<string, string>();
  content = { cloneNode: () => ({}) };
  querySelector(selector: string) {
    return this.selectors.get(selector) ?? null;
  }
  querySelectorAll(selector: string) {
    return this.lists.get(selector) ?? [];
  }
  setAttribute(name: string, value: string) {
    this.attributes.set(name, value);
  }
  replaceChildren() {}
  setPointerCapture() {}
}

function fixture(mode = "bottle") {
  const root = new Node(),
    classic = new Node(),
    shell = new Node();
  shell.dataset.aboutDefault = mode;
  const parts = Object.fromEntries(
    [
      "stage",
      "status",
      "panel",
      "panel-content",
      "controls",
      "speed",
      "storm",
      "close",
      "reset",
      "retry",
      "period",
    ].map((name) => {
      const element = new Node();
      root.selectors.set(`[data-bottle-${name}]`, element);
      return [name, element];
    }),
  );
  const bottleButton = new Node(),
    classicButton = new Node();
  bottleButton.dataset.aboutMode = "bottle";
  classicButton.dataset.aboutMode = "classic";
  shell.lists.set("[data-about-mode]", [bottleButton, classicButton]);
  const introButton = new Node();
  introButton.dataset.bottleOpen = "intro";
  root.lists.set("[data-bottle-open]", [introButton]);
  root.selectors.set('template[data-bottle-chapter="intro"]', new Node());
  const document = {
    querySelector: (selector: string) =>
      ({ "[data-about-bottle]": root, "#about-page": classic, "[data-about-experience]": shell })[
        selector
      ] ?? null,
  };
  vi.stubGlobal("document", document);
  vi.stubGlobal("sessionStorage", { getItem: () => null, setItem: vi.fn() });
  const scene = {
    setActive: vi.fn(),
    setStorm: vi.fn(),
    cycleSpeed: vi.fn(),
    resetView: vi.fn(),
    dispose: vi.fn(async () => {}),
  };
  mocks.create.mockReturnValue(scene);
  const resources = new PageResourceScope();
  mountAboutBottle(resources);
  return {
    root,
    classic,
    shell,
    parts,
    bottleButton,
    classicButton,
    introButton,
    scene,
    resources,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.load.mockResolvedValue({ REVISION: "160" });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("About bottle enhancement lifecycle", () => {
  it("does not fetch Three or create a renderer in classic mode", async () => {
    const view = fixture("classic");
    await vi.dynamicImportSettled();
    expect(mocks.load).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
    expect(view.root.hidden).toBe(true);
    expect(view.classic.hidden).toBe(false);
    await view.resources.dispose();
  });
  it("loads once, pauses on switching, and disposes owned resources", async () => {
    const view = fixture();
    await vi.waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1));
    expect(view.shell.dataset.bottleActive).toBe("true");
    expect(view.parts.panel!.hidden).toBe(true);
    view.introButton.dispatchEvent(new Event("click"));
    expect(view.parts.panel!.hidden).toBe(false);
    view.parts.close!.dispatchEvent(new Event("click"));
    expect(view.parts.panel!.hidden).toBe(true);
    view.classicButton.dispatchEvent(new Event("click"));
    expect(view.scene.setActive).toHaveBeenLastCalledWith(false);
    expect(view.classic.hidden).toBe(false);
    expect(view.shell.dataset.bottleActive).toBe("false");
    view.bottleButton.dispatchEvent(new Event("click"));
    expect(view.scene.setActive).toHaveBeenLastCalledWith(true);
    expect(view.shell.dataset.bottleActive).toBe("true");
    expect(mocks.load).toHaveBeenCalledTimes(1);
    view.parts.speed!.dispatchEvent(new Event("click"));
    expect(view.scene.cycleSpeed).toHaveBeenCalledTimes(1);
    await view.resources.dispose();
    expect(view.scene.dispose).toHaveBeenCalledTimes(1);
    expect(view.shell.dataset.bottleActive).toBeUndefined();
    view.parts.speed!.dispatchEvent(new Event("click"));
    expect(view.scene.cycleSpeed).toHaveBeenCalledTimes(1);
    expect(view.classic.hidden).toBe(false);
  });
  it.each(["classic", "dispose"])(
    "does not create a scene after a pending import and %s",
    async (action) => {
      let resolve!: (value: unknown) => void;
      mocks.load.mockReturnValue(
        new Promise((done) => {
          resolve = done;
        }),
      );
      const view = fixture();
      await vi.waitFor(() => expect(mocks.load).toHaveBeenCalledTimes(1));
      if (action === "classic") view.classicButton.dispatchEvent(new Event("click"));
      else await view.resources.dispose();
      resolve({ REVISION: "160" });
      await vi.dynamicImportSettled();
      expect(mocks.create).not.toHaveBeenCalled();
      expect(view.classic.hidden).toBe(false);
      await view.resources.dispose();
    },
  );
  it("keeps authored text available on CDN or WebGL failure and permits retry", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    mocks.load.mockRejectedValueOnce(new Error("CDN unavailable"));
    const view = fixture();
    await vi.waitFor(() => expect(view.root.dataset.bottleState).toBe("error"));
    expect(view.classic.hidden).toBe(false);
    expect(view.parts.retry!.hidden).toBe(false);
    expect(view.shell.dataset.bottleActive).toBe("false");
    view.parts.retry!.dispatchEvent(new Event("click"));
    await vi.waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1));
    expect(view.root.dataset.bottleState).toBe("ready");
    expect(view.classic.hidden).toBe(true);
    expect(view.shell.dataset.bottleActive).toBe("true");
    const fail = mocks.create.mock.calls[0]![4] as () => void;
    fail();
    expect(view.classic.hidden).toBe(false);
    expect(view.shell.dataset.bottleActive).toBe("false");
    expect(view.scene.dispose).toHaveBeenCalledTimes(1);
    await view.resources.dispose();
  });
  it("bounds a stalled CDN request", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    mocks.load.mockReturnValue(new Promise(() => {}));
    vi.useFakeTimers();
    const view = fixture();
    await vi.advanceTimersByTimeAsync(12001);
    expect(view.root.dataset.bottleState).toBe("error");
    expect(view.classic.hidden).toBe(false);
    await view.resources.dispose();
  });
});
