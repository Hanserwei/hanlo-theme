import { afterEach, describe, expect, it, vi } from "vitest";

import { PageResourceScope } from "../../src/js/core/resource-scope";
import {
  mountProfileCards,
  nextProfileGreeting,
  profileGreetings,
} from "../../src/js/features/page-widgets/profile-card";

describe("profile labels", () => {
  it("accepts Chinese and English separators, removes whitespace and duplicates", () => {
    expect(profileGreetings([" 🏠 家居，🔨 开发", "\n🏠 家居, "])).toEqual(["🏠 家居", "🔨 开发"]);
    expect(profileGreetings(undefined)).toEqual(["👋 你好，很高兴认识你"]);
    expect(profileGreetings(["，, "])).toEqual(["👋 你好，很高兴认识你"]);
  });

  it("changes to a different label when possible and tolerates a single label", () => {
    expect(nextProfileGreeting(["A", "B", "C"], "A", 0)).toBe("B");
    expect(nextProfileGreeting(["A", "B", "C"], "A", 0.99)).toBe("C");
    expect(nextProfileGreeting(["A"], "A", 0)).toBe("A");
  });
});

class ProfileElement extends EventTarget {
  readonly children = new Map<string, ProfileElement>();
  readonly attributes = new Map<string, string>();
  readonly dataset: Record<string, string> = {};
  hidden = false;
  disabled = false;
  id = "";
  title = "";
  textContent = "";

  querySelector(selector: string): ProfileElement | null {
    return this.children.get(selector) ?? null;
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  removeAttribute(name: string): void {
    this.attributes.delete(name);
  }

  contains(node: unknown): boolean {
    return node === this || [...this.children.values()].some((child) => child.contains(node));
  }

  focus(): void {
    Object.assign(document, { activeElement: this });
  }
}

function profileFixture(descriptionText = "我喜欢分享技术与生活") {
  const card = new ProfileElement();
  const description = new ProfileElement();
  description.textContent = descriptionText;
  description.hidden = true;
  const portrait = new ProfileElement();
  const toggle = new ProfileElement();
  toggle.hidden = true;
  const toggleText = new ProfileElement();
  const greeting = new ProfileElement();
  const greetingText = new ProfileElement();
  card.children.set("[data-profile-description]", description);
  card.children.set("[data-profile-portrait]", portrait);
  card.children.set("[data-profile-toggle]", toggle);
  card.children.set("[data-profile-greeting]", greeting);
  toggle.children.set("[data-profile-toggle-text]", toggleText);
  greeting.children.set("[data-profile-greeting-text]", greetingText);
  return { card, description, portrait, toggle, toggleText, greeting, greetingText };
}

function mount(...profiles: ReturnType<typeof profileFixture>[]) {
  vi.stubGlobal("Node", ProfileElement);
  vi.stubGlobal("document", {
    querySelectorAll: () => profiles.map(({ card }) => card),
    activeElement: null,
  });
  const resources = new PageResourceScope();
  mountProfileCards({ helloText: ["🏠 家居", "🔨 开发"] }, resources);
  return resources;
}

function pointer(type: string, pointerType = "mouse"): Event {
  return Object.assign(new Event(type), { pointerType });
}

afterEach(() => vi.unstubAllGlobals());

describe("profile introduction interaction", () => {
  it("reveals on mouse hover and restores the avatar after leaving", async () => {
    const profile = profileFixture();
    const resources = mount(profile);
    expect(profile.description.hidden).toBe(true);
    expect(profile.toggle.hidden).toBe(false);
    profile.card.dispatchEvent(pointer("pointerenter"));
    expect(profile.description.hidden).toBe(false);
    expect(profile.toggle.attributes.get("aria-expanded")).toBe("true");
    profile.card.dispatchEvent(pointer("pointerleave"));
    expect(profile.description.hidden).toBe(true);
    expect(profile.portrait.attributes.get("aria-hidden")).toBe("false");
    await resources.dispose();
  });

  it("uses explicit clicks on touch and keeps a pinned introduction open", async () => {
    const profile = profileFixture();
    const resources = mount(profile);
    profile.card.dispatchEvent(pointer("pointerenter", "touch"));
    expect(profile.description.hidden).toBe(true);
    profile.toggle.dispatchEvent(new Event("click"));
    profile.card.dispatchEvent(pointer("pointerleave", "touch"));
    expect(profile.description.hidden).toBe(false);
    profile.toggle.dispatchEvent(new Event("click"));
    expect(profile.description.hidden).toBe(true);
    await resources.dispose();
  });

  it("keeps focused introduction content visible and Escape returns to its button", async () => {
    const profile = profileFixture();
    const resources = mount(profile);
    profile.card.dispatchEvent(pointer("pointerenter"));
    profile.description.focus();
    profile.card.dispatchEvent(pointer("pointerleave"));
    expect(profile.description.hidden).toBe(false);
    const escape = Object.assign(new Event("keydown", { cancelable: true }), { key: "Escape" });
    profile.card.dispatchEvent(escape);
    expect(escape.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(profile.toggle);
    expect(profile.description.hidden).toBe(true);
    await resources.dispose();
  });

  it("isolates multiple cards and releases event handlers on disposal", async () => {
    const first = profileFixture();
    const second = profileFixture();
    const resources = mount(first, second);
    expect(first.description.id).not.toBe(second.description.id);
    first.toggle.dispatchEvent(new Event("click"));
    expect(second.description.hidden).toBe(true);
    await resources.dispose();
    first.card.dispatchEvent(pointer("pointerenter"));
    first.toggle.dispatchEvent(new Event("click"));
    expect(first.description.hidden).toBe(true);
    expect(first.toggle.hidden).toBe(true);
    expect(first.description.id).toBe("");
  });

  it("leaves empty introductions as avatar-only cards", async () => {
    const profile = profileFixture("   ");
    const resources = mount(profile);
    expect(profile.toggle.hidden).toBe(true);
    profile.card.dispatchEvent(pointer("pointerenter"));
    expect(profile.description.hidden).toBe(true);
    await resources.dispose();
  });
});
