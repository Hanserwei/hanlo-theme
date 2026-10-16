import { afterEach, describe, expect, it, vi } from "vitest";

import { PageResourceScope } from "../../src/js/core/resource-scope";
import {
  initializeLinkCaptcha,
  refreshLinkCaptcha,
} from "../../src/js/features/site-shell/link-captcha";

function fixture(complete = false, naturalWidth = 0) {
  const image = Object.assign(new EventTarget(), {
    complete,
    naturalWidth,
    src: "https://example.com/links/apply/captcha?existing=1",
    setAttribute: vi.fn(),
  });
  const button = { hidden: true, disabled: false };
  const code = { value: "ABCDE" };
  const status = { textContent: "" };
  const elements: Record<string, unknown> = {
    "#link-application-captcha": image,
    '[data-hanlo-action="refresh-link-captcha"]': button,
    "#link-application-captcha-code": code,
    "#link-application-captcha-status": status,
  };
  const root = {
    baseURI: "https://example.com/links",
    querySelector: (selector: string) => elements[selector] ?? null,
  };
  vi.stubGlobal("document", root);
  return { image, button, code, status, root: root as unknown as ParentNode };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("link application captcha", () => {
  it("changes the refresh URL even within one millisecond and clears the old answer", async () => {
    vi.spyOn(Date, "now").mockReturnValue(123);
    const { root, image, code, button } = fixture(true, 160);
    const resources = new PageResourceScope();
    initializeLinkCaptcha(resources, root);
    const initial = image.src;
    refreshLinkCaptcha(root);
    const first = image.src;
    expect(first).not.toBe(initial);
    expect(new URL(first).searchParams.get("existing")).toBe("1");
    expect(code.value).toBe("");
    expect(button.disabled).toBe(true);
    image.dispatchEvent(new Event("load"));
    code.value = "FGHIJ";
    refreshLinkCaptcha(root);
    expect(image.src).not.toBe(first);
    expect(code.value).toBe("");
    await resources.dispose();
  });

  it("handles initial loading, failure, retry and success", async () => {
    const { root, image, button, status } = fixture();
    const resources = new PageResourceScope();
    initializeLinkCaptcha(resources, root);
    expect(button.hidden).toBe(false);
    expect(button.disabled).toBe(true);
    expect(status.textContent).toContain("加载中");
    image.dispatchEvent(new Event("error"));
    expect(button.disabled).toBe(false);
    expect(status.textContent).toContain("失败");
    refreshLinkCaptcha(root);
    expect(button.disabled).toBe(true);
    image.dispatchEvent(new Event("load"));
    expect(button.disabled).toBe(false);
    expect(status.textContent).toContain("已加载");
    expect(image.setAttribute).toHaveBeenLastCalledWith("aria-busy", "false");
    refreshLinkCaptcha(root);
    image.dispatchEvent(new Event("error"));
    expect(button.disabled).toBe(false);
    await resources.dispose();
  });

  it.each([160, 0])("handles an initially settled image of width %i", async (width) => {
    const { root, button, status } = fixture(true, width);
    const resources = new PageResourceScope();
    initializeLinkCaptcha(resources, root);
    expect(button.hidden).toBe(false);
    expect(button.disabled).toBe(false);
    expect(status.textContent).toContain(width > 0 ? "已加载" : "失败");
    await resources.dispose();
  });

  it("removes image listeners when the page scope is disposed", async () => {
    const { root, image, status } = fixture();
    const resources = new PageResourceScope();
    initializeLinkCaptcha(resources, root);
    await resources.dispose();
    const previous = status.textContent;
    image.dispatchEvent(new Event("load"));
    image.dispatchEvent(new Event("error"));
    expect(status.textContent).toBe(previous);
  });

  it("does nothing on pages without a captcha", () => {
    const root = { querySelector: () => null } as unknown as ParentNode;
    const resources = new PageResourceScope();
    expect(() => initializeLinkCaptcha(resources, root)).not.toThrow();
    expect(() => refreshLinkCaptcha(root)).not.toThrow();
  });
});
