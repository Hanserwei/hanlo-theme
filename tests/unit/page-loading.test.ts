import { afterEach, describe, expect, it, vi } from "vitest";

import { PageResourceScope } from "../../src/js/core/resource-scope";
import { PAGE_LIFECYCLE_EVENTS } from "../../src/js/core/runtime";
import { finishPageLoading, mountPageLoading } from "../../src/js/features/site-shell/page-loading";

function fixture({ reduced = false, internal = false, present = true } = {}) {
  const classes = new Set<string>();
  const box = {
    classList: {
      contains: (name: string) => classes.has(name),
      add: (name: string) => classes.add(name),
    },
    setAttribute: vi.fn(),
  };
  const motion = Object.assign(new EventTarget(), { matches: reduced });
  const animation = { cancel: vi.fn(), finished: new Promise<void>(() => {}) };
  const visible = {
    id: "page",
    getBoundingClientRect: () => ({ top: 80, bottom: 800, height: 720 }),
    animate: vi.fn(() => animation),
  };
  const offscreen = {
    ...visible,
    getBoundingClientRect: () => ({ top: 1800, bottom: 2000, height: 200 }),
    animate: vi.fn(() => animation),
  };
  const doc = Object.assign(new EventTarget(), {
    hidden: false,
    documentElement: { classList: { contains: () => internal } },
    querySelector: () => (present ? box : null),
    querySelectorAll: () => [visible, offscreen],
  });
  const win = Object.assign(new EventTarget(), { innerHeight: 900, matchMedia: () => motion });
  vi.stubGlobal("document", doc);
  vi.stubGlobal("window", win);
  return { classes, box, motion, animation, visible, offscreen, doc, win };
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("page loading lifecycle", () => {
  it("dismisses on page readiness and reveals only visible content once", async () => {
    vi.useFakeTimers();
    const { doc, classes, visible, offscreen, box } = fixture();
    const resources = new PageResourceScope();
    mountPageLoading(resources);
    expect(classes.has("loaded")).toBe(false);
    doc.dispatchEvent(new Event(PAGE_LIFECYCLE_EVENTS.initial));
    expect(classes.has("loaded")).toBe(true);
    expect(box.setAttribute).toHaveBeenCalledWith("aria-hidden", "true");
    expect(visible.animate).toHaveBeenCalledTimes(1);
    expect(offscreen.animate).not.toHaveBeenCalled();
    vi.advanceTimersByTime(3_000);
    finishPageLoading(resources);
    expect(visible.animate).toHaveBeenCalledTimes(1);
    await resources.dispose();
  });

  it("has a bounded fallback if optional initialization stalls", async () => {
    vi.useFakeTimers();
    const { classes } = fixture();
    const resources = new PageResourceScope();
    mountPageLoading(resources);
    vi.advanceTimersByTime(3_000);
    expect(classes.has("loaded")).toBe(true);
    await resources.dispose();
  });

  it.each([{ reduced: true }, { internal: true }, { present: false }])(
    "does not animate when the loading experience is skipped: %j",
    async (options) => {
      const { visible, classes } = fixture(options);
      const resources = new PageResourceScope();
      finishPageLoading(resources);
      expect(visible.animate).not.toHaveBeenCalled();
      expect(classes.has("loaded")).toBe(options.present !== false);
      await resources.dispose();
    },
  );

  it.each(["pagehide", "motion", "visibility", "dispose"])(
    "cancels entrance animations on %s",
    async (reason) => {
      const { win, motion, doc, animation } = fixture();
      const resources = new PageResourceScope();
      finishPageLoading(resources);
      if (reason === "pagehide") win.dispatchEvent(new Event("pagehide"));
      if (reason === "motion") {
        motion.matches = true;
        motion.dispatchEvent(new Event("change"));
      }
      if (reason === "visibility") {
        doc.hidden = true;
        doc.dispatchEvent(new Event("visibilitychange"));
      }
      if (reason === "dispose") await resources.dispose();
      expect(animation.cancel).toHaveBeenCalledTimes(1);
      await resources.dispose();
    },
  );

  it("restores a cached page without replaying loading or entrance", async () => {
    vi.useFakeTimers();
    const { win, classes, visible } = fixture();
    const resources = new PageResourceScope();
    mountPageLoading(resources);
    win.dispatchEvent(Object.assign(new Event("pageshow"), { persisted: true }));
    vi.advanceTimersByTime(3_000);
    expect(classes.has("loaded")).toBe(true);
    expect(visible.animate).not.toHaveBeenCalled();
    await resources.dispose();
  });

  it("cancels the readiness listener and timeout when unmounted", async () => {
    vi.useFakeTimers();
    const { doc, classes } = fixture();
    const resources = new PageResourceScope();
    mountPageLoading(resources);
    await resources.dispose();
    doc.dispatchEvent(new Event(PAGE_LIFECYCLE_EVENTS.initial));
    vi.advanceTimersByTime(3_000);
    expect(classes.has("loaded")).toBe(false);
  });
});
