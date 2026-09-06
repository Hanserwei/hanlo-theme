import { afterEach, describe, expect, it, vi } from "vitest";

import { PageResourceScope } from "../../src/js/core/resource-scope";
import { mountCardMotion } from "../../src/js/features/card-motion";

class CardElement extends EventTarget {
  parentElement: CardElement | null = null;
  children: CardElement[] = [];
  isConnected = true;
  className = "";
  position = "relative";
  readonly attributes = new Map<string, string>();
  readonly properties = new Map<string, string>();
  readonly classes = new Set<string>();
  readonly style = { setProperty: (key: string, value: string) => this.properties.set(key, value) };
  readonly classList = {
    add: (...names: string[]) => names.forEach((name) => this.classes.add(name)),
    remove: (...names: string[]) => names.forEach((name) => this.classes.delete(name)),
    contains: (name: string) => this.classes.has(name) || this.className === name,
    toggle: (name: string, value: boolean) =>
      value ? this.classes.add(name) : this.classes.delete(name),
  };
  constructor(readonly card = true) {
    super();
  }
  matches() {
    return this.card;
  }
  closest(): CardElement | null {
    return this.card ? this : (this.parentElement?.closest() ?? null);
  }
  querySelectorAll(): CardElement[] {
    return this.children.flatMap((child) => [
      ...(child.card ? [child] : []),
      ...child.querySelectorAll(),
    ]);
  }
  append(child: CardElement) {
    this.children.push(child);
    child.parentElement = this;
  }
  setAttribute(key: string, value: string) {
    this.attributes.set(key, value);
  }
  remove() {
    this.isConnected = false;
    if (this.parentElement)
      this.parentElement.children = this.parentElement.children.filter((child) => child !== this);
  }
}

function fixture(reduced = false) {
  const root = new CardElement(false);
  const first = new CardElement();
  first.position = "static";
  const second = new CardElement();
  const nested = new CardElement();
  first.append(nested);
  root.append(first);
  root.append(second);
  const documentTarget = Object.assign(new EventTarget(), {
    hidden: false,
    createElement: () => new CardElement(false),
  });
  const media = Object.assign(new EventTarget(), { matches: reduced });
  const windowTarget = Object.assign(new EventTarget(), { matchMedia: () => media });
  let intersectionCallback: (entries: { target: CardElement; isIntersecting: boolean }[]) => void;
  let mutationCallback: (records: { addedNodes: CardElement[] }[]) => void;
  const intersection = { observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() };
  const mutation = { observe: vi.fn(), disconnect: vi.fn() };
  vi.stubGlobal("HTMLElement", CardElement);
  vi.stubGlobal("document", documentTarget);
  vi.stubGlobal("window", windowTarget);
  vi.stubGlobal("getComputedStyle", (element: CardElement) => ({ position: element.position }));
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback: typeof intersectionCallback) {
        intersectionCallback = callback;
        return intersection;
      }
    },
  );
  vi.stubGlobal(
    "MutationObserver",
    class {
      constructor(callback: typeof mutationCallback) {
        mutationCallback = callback;
        return mutation;
      }
    },
  );
  const resources = new PageResourceScope();
  mountCardMotion(root as unknown as ParentNode, resources);
  return {
    root,
    first,
    second,
    nested,
    documentTarget,
    windowTarget,
    media,
    resources,
    intersection,
    mutation,
    show: (target: CardElement, isIntersecting = true) =>
      intersectionCallback([{ target, isIntersecting }]),
    insert: (element: CardElement) => {
      root.append(element);
      mutationCallback([{ addedNodes: [element] }]);
    },
    notifyRemoval: () => mutationCallback([{ addedNodes: [] }]),
  };
}

const aura = (card: CardElement) =>
  card.children.filter((child) => child.className === "hanlo-card-aura");
afterEach(() => vi.unstubAllGlobals());

describe("card motion lifecycle", () => {
  it("adds one non-interactive edge per outer card, preserves content and staggers phases", async () => {
    const view = fixture();
    expect(aura(view.first)).toHaveLength(1);
    expect(aura(view.second)).toHaveLength(1);
    expect(aura(view.nested)).toHaveLength(0);
    expect(view.first.children).toContain(view.nested);
    expect(aura(view.first)[0]?.attributes.get("aria-hidden")).toBe("true");
    expect(aura(view.first)[0]?.properties.get("--hanlo-card-delay")).not.toBe(
      aura(view.second)[0]?.properties.get("--hanlo-card-delay"),
    );
    expect(view.first.classes.has("hanlo-card-positioned")).toBe(true);
    expect(view.second.classes.has("hanlo-card-positioned")).toBe(false);
    await view.resources.dispose();
    expect(aura(view.first)).toHaveLength(0);
    expect(view.first.children).toEqual([view.nested]);
    expect(view.first.classes.size).toBe(0);
    expect(view.intersection.disconnect).toHaveBeenCalledOnce();
    expect(view.mutation.disconnect).toHaveBeenCalledOnce();
  });

  it("animates only visible cards, pausing for hidden tabs, BFCache and reduced motion", async () => {
    const view = fixture();
    expect(view.first.classes.has("hanlo-card-awake")).toBe(false);
    view.show(view.first);
    expect(view.first.classes.has("hanlo-card-awake")).toBe(true);
    expect(view.second.classes.has("hanlo-card-awake")).toBe(false);
    view.documentTarget.hidden = true;
    view.documentTarget.dispatchEvent(new Event("visibilitychange"));
    expect(view.first.classes.has("hanlo-card-awake")).toBe(false);
    view.documentTarget.hidden = false;
    view.documentTarget.dispatchEvent(new Event("visibilitychange"));
    view.windowTarget.dispatchEvent(new Event("pagehide"));
    expect(view.first.classes.has("hanlo-card-awake")).toBe(false);
    view.windowTarget.dispatchEvent(new Event("pageshow"));
    expect(view.first.classes.has("hanlo-card-awake")).toBe(true);
    view.media.matches = true;
    view.media.dispatchEvent(new Event("change"));
    expect(view.first.classes.has("hanlo-card-awake")).toBe(false);
    view.media.matches = false;
    view.media.dispatchEvent(new Event("change"));
    view.show(view.first, false);
    expect(view.first.classes.has("hanlo-card-awake")).toBe(false);
    await view.resources.dispose();
  });

  it("decorates asynchronously inserted cards and releases removed cards", async () => {
    const view = fixture(true);
    const loaded = new CardElement();
    view.insert(loaded);
    expect(aura(loaded)).toHaveLength(1);
    view.show(loaded);
    expect(loaded.classes.has("hanlo-card-awake")).toBe(false);
    loaded.remove();
    view.notifyRemoval();
    expect(aura(loaded)).toHaveLength(0);
    expect(view.intersection.unobserve).toHaveBeenCalledWith(loaded);
    await view.resources.dispose();
  });
});
