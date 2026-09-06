import { afterEach, describe, expect, it, vi } from "vitest";

import { PageResourceScope } from "../../src/js/core/resource-scope";
import { mountAboutEmotions } from "../../src/js/features/about-emotions";

class PlaygroundElement extends EventTarget {
  readonly selectors = new Map<string, PlaygroundElement>();
  readonly children: PlaygroundElement[] = [];
  readonly dataset: Record<string, string> = {};
  readonly attributes = new Map<string, string>();
  readonly captures = new Set<number>();
  readonly classList = { add: vi.fn(), remove: vi.fn() };
  readonly style = { height: "", transform: "", setProperty: vi.fn(), removeProperty: vi.fn() };
  parent: PlaygroundElement | undefined;
  hidden = false;
  clientWidth = 360;
  textContent = "";
  disabled = false;
  querySelector(selector: string) {
    return this.selectors.get(selector) ?? null;
  }
  closest() {
    return this.dataset.emotionIndex !== undefined ? this : this.parent;
  }
  setAttribute(key: string, value: string) {
    this.attributes.set(key, value);
  }
  append(child: PlaygroundElement) {
    this.children.push(child);
    child.parent = this;
  }
  contains(child: PlaygroundElement) {
    return this.children.includes(child);
  }
  remove() {
    this.parent?.children.splice(this.parent.children.indexOf(this), 1);
  }
  focus() {}
  setPointerCapture(id: number) {
    this.captures.add(id);
  }
  releasePointerCapture(id: number) {
    this.captures.delete(id);
  }
  hasPointerCapture(id: number) {
    return this.captures.has(id);
  }
  getBoundingClientRect() {
    return { left: 0, top: 0 };
  }
}

function fixture(reducedMotion = false) {
  const root = new PlaygroundElement();
  root.dataset.emotions = "25,28";
  root.dataset.count = "4";
  root.dataset.assets = "/themes/theme-hanlo/assets/images/tieba";
  const parts = Object.fromEntries(
    ["stage", "controls", "status", "placeholder", "shake", "pause", "motion"].map((part) => {
      const element = new PlaygroundElement();
      root.selectors.set(`[data-emotion-${part}]`, element);
      return [part, element];
    }),
  ) as Record<
    "stage" | "controls" | "status" | "placeholder" | "shake" | "pause" | "motion",
    PlaygroundElement
  >;
  const documentTarget = Object.assign(new EventTarget(), {
    querySelector: () => root,
    createElement: () => new PlaygroundElement(),
    hidden: false,
  });
  const media = Object.assign(new EventTarget(), { matches: reducedMotion });
  const windowTarget = Object.assign(new EventTarget(), { matchMedia: () => media });
  const frames = new Map<number, FrameRequestCallback>();
  let sequence = 0;
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    const id = ++sequence;
    frames.set(id, callback);
    return id;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
  vi.stubGlobal("window", windowTarget);
  vi.stubGlobal("document", documentTarget);
  vi.stubGlobal("Element", PlaygroundElement);
  vi.stubGlobal("ResizeObserver", undefined);
  vi.stubGlobal("IntersectionObserver", undefined);
  const resources = new PageResourceScope();
  mountAboutEmotions(resources);
  return { ...parts, documentTarget, windowTarget, resources, frames };
}

function pointer(stage: PlaygroundElement, target: PlaygroundElement, type: string) {
  const event = Object.assign(new Event(type, { cancelable: true }), {
    button: 0,
    pointerId: 1,
    clientX: 100,
    clientY: 100,
  });
  Object.defineProperty(event, "target", { value: target });
  stage.dispatchEvent(event);
  return event;
}

afterEach(() => vi.unstubAllGlobals());

describe("emotion page lifecycle", () => {
  it("pauses on visibility changes and disposal removes animation frames, nodes and listeners", async () => {
    const view = fixture();
    expect(view.stage.children).toHaveLength(4);
    expect(view.frames.size).toBe(1);
    view.documentTarget.hidden = true;
    view.documentTarget.dispatchEvent(new Event("visibilitychange"));
    expect(view.frames.size).toBe(0);
    view.documentTarget.hidden = false;
    view.documentTarget.dispatchEvent(new Event("visibilitychange"));
    expect(view.frames.size).toBe(1);
    await view.resources.dispose();
    expect(view.frames.size).toBe(0);
    expect(view.stage.children).toHaveLength(0);
    view.shake.dispatchEvent(new Event("click"));
    view.windowTarget.dispatchEvent(new Event("resize"));
    expect(view.frames.size).toBe(0);
  });

  it("respects reduced motion until an explicit interaction and can pause again", async () => {
    const view = fixture(true);
    expect(view.frames.size).toBe(0);
    expect(view.pause.textContent).toBe("继续");
    view.shake.dispatchEvent(new Event("click"));
    expect(view.frames.size).toBe(1);
    expect(view.pause.textContent).toBe("暂停");
    view.pause.dispatchEvent(new Event("click"));
    expect(view.frames.size).toBe(0);
    await view.resources.dispose();
  });

  it("captures only face drags, releases cancellation, and leaves the background scrollable", async () => {
    const view = fixture();
    expect(pointer(view.stage, view.stage, "pointerdown").defaultPrevented).toBe(false);
    const face = view.stage.children[0]!;
    expect(pointer(view.stage, face, "pointerdown").defaultPrevented).toBe(true);
    expect(face.captures.has(1)).toBe(true);
    pointer(view.stage, face, "pointercancel");
    expect(face.captures.size).toBe(0);
    pointer(view.stage, face, "pointerdown");
    await view.resources.dispose();
    expect(face.captures.size).toBe(0);
  });
});
