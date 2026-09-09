import { parseHTML } from "linkedom";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ThemeConfig } from "../../src/js/core/config";
import { PageResourceScope } from "../../src/js/core/resource-scope";
import { ExpiringStorage } from "../../src/js/core/storage";
import { createTranslationController } from "../../src/js/features/translation";
import { ChineseDomTranslation } from "../../src/js/features/translation/dom";
import {
  ChineseTranslation,
  getPageTranslation,
  loadChineseConversion,
  TRANSLATION_EVENT,
  TRANSLATION_STORAGE_KEY,
} from "../../src/js/features/translation/state";

vi.mock("../../src/js/core/ui", () => ({ snackbarShow: vi.fn() }));
afterEach(() => vi.unstubAllGlobals());

describe("Chinese conversion state", () => {
  it("uses phrase dictionaries and restores the original without lossy reverse conversion", async () => {
    const translation = new ChineseTranslation(2);
    const original = "头发，开发，皇后，后台。";
    expect(translation.convert(original)).toBe(original);
    await translation.setTarget(1);
    expect(translation.convert(original)).toBe("頭髮，開發，皇后，後臺。");
    await translation.setTarget(2);
    expect(translation.convert(original)).toBe(original);
    const simplified = await loadChineseConversion(1);
    expect(simplified("頭髮，開發，皇后，後臺。")).toBe(original);
  });

  it("coalesces rapid toggles and shares the dictionary request", async () => {
    let resolve!: (convert: (text: string) => string) => void;
    const load = vi.fn(
      () =>
        new Promise<(text: string) => string>((done) => {
          resolve = done;
        }),
    );
    const translation = new ChineseTranslation(2, load);
    const pending = translation.setTarget(1);
    expect(await translation.setTarget(2)).toBe(true);
    resolve((text) => text.replaceAll("后", "後"));
    expect(await pending).toBe(false);
    expect(translation.convert("皇后")).toBe("皇后");
    expect(await translation.setTarget(1)).toBe(true);
    expect(load).toHaveBeenCalledOnce();
  });

  it("retries failed resources and ignores work completed after disposal", async () => {
    const load = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue((text: string) => text);
    const translation = new ChineseTranslation(2, load);
    await expect(translation.setTarget(1)).rejects.toThrow("offline");
    expect(translation.requestedEncoding).toBe(2);
    const pending = translation.setTarget(1);
    translation.dispose();
    expect(await pending).toBe(false);
    expect(load).toHaveBeenCalledTimes(2);
  });
});

describe("Chinese DOM conversion", () => {
  it("preserves code, math, renderer DOM, URL/form values and translation exclusions", async () => {
    const { document } = parseHTML(`<!doctype html><html><body>
      <p id="reading" title="后台">头发与开发</p>
      <a id="link" href="/后台?q=开发">后台</a>
      <pre><code>const 中文 = "头发";</code></pre>
      <span class="language-math">\\text{开发}</span>
      <div class="language-plantuml">@startuml 开发 @enduml</div>
      <svg><text>开发</text></svg>
      <div translate="no"><span>开发</span></div>
      <div class="notranslate">开发</div>
      <div class="ignore-opencc">开发</div>
      <div contenteditable="true">开发</div>
      <input id="entry" value="开发" placeholder="后台" aria-label="后台">
      <img id="image" src="/开发.png" alt="头发">
    </body></html>`);
    const dom = new ChineseDomTranslation();
    const convert = await loadChineseConversion(2);
    dom.apply(document.body as unknown as Node, convert);
    expect(document.querySelector("#reading")!.textContent).toBe("頭髮與開發");
    expect(document.querySelector("#reading")!.getAttribute("title")).toBe("後臺");
    expect(document.querySelector("#link")!.getAttribute("href")).toBe("/后台?q=开发");
    expect(document.querySelector("pre")!.textContent).toContain('"头发"');
    for (const selector of [
      ".language-math",
      ".language-plantuml",
      "svg",
      '[translate="no"]',
      ".notranslate",
      ".ignore-opencc",
      "[contenteditable]",
    ]) {
      expect(document.querySelector(selector)!.textContent).toContain("开发");
    }
    expect(document.querySelector("#entry")!.getAttribute("value")).toBe("开发");
    expect(document.querySelector("#entry")!.getAttribute("placeholder")).toBe("後臺");
    expect(document.querySelector("#entry")!.getAttribute("aria-label")).toBe("後臺");
    expect(document.querySelector("#image")!.getAttribute("alt")).toBe("頭髮");
    expect(document.querySelector("#image")!.getAttribute("src")).toBe("/开发.png");
    dom.apply(document.body as unknown as Node, (text) => text);
    expect(document.querySelector("#reading")!.textContent).toBe("头发与开发");
    expect(document.querySelector("#entry")!.getAttribute("placeholder")).toBe("后台");
  });

  it("uses new external content as its new source while preserving the original on repeated toggles", async () => {
    const { document } = parseHTML("<html><body><p>皇后与头发</p></body></html>");
    const dom = new ChineseDomTranslation();
    const convert = await loadChineseConversion(2);
    const body = document.body as unknown as Node;
    for (let index = 0; index < 3; index++) {
      dom.apply(body, convert);
      dom.apply(body, convert);
      expect(document.querySelector("p")!.textContent).toBe("皇后與頭髮");
      dom.apply(body, (text) => text);
      expect(document.querySelector("p")!.textContent).toBe("皇后与头发");
    }
    const node = document.querySelector("p")!.firstChild!;
    node.textContent = "开发与头发";
    dom.apply(node as unknown as Node, convert);
    expect(node.textContent).toBe("開發與頭髮");
    dom.apply(body, (text) => text);
    expect(node.textContent).toBe("开发与头发");
  });

  it("applies stored preferences, broadcasts updates, translates late content and stops after disposal", async () => {
    const { document, window } = parseHTML(
      '<html><body><button id="translateLink">繁</button><button id="menu-translate"><i></i><span>轉為繁體</span></button><p>开发</p></body></html>',
    );
    const frames: FrameRequestCallback[] = [];
    const observers: {
      callback: (records: MutationRecord[]) => void;
      disconnect: ReturnType<typeof vi.fn>;
    }[] = [];
    vi.stubGlobal("document", document);
    vi.stubGlobal("CustomEvent", window.CustomEvent);
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      frames.push(callback);
      return frames.length;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    vi.stubGlobal(
      "MutationObserver",
      class {
        disconnect = vi.fn();
        constructor(readonly callback: (records: MutationRecord[]) => void) {
          observers.push(this);
        }
        observe() {}
      },
    );
    const stored = new Map<string, string>();
    const storage = new ExpiringStorage({
      getItem: (key) => stored.get(key) ?? null,
      setItem: (key, value) => {
        stored.set(key, value);
      },
      removeItem: (key) => {
        stored.delete(key);
      },
    });
    storage.set(TRANSLATION_STORAGE_KEY, 1, 2);
    const resources = new PageResourceScope();
    const changed = vi.fn();
    document.addEventListener(TRANSLATION_EVENT, changed);
    const controller = createTranslationController(storage).create({
      config: {
        translate: {
          defaultEncoding: 2,
          msgToTraditionalChinese: "繁",
          msgToSimplifiedChinese: "简",
        },
      } as ThemeConfig,
      resources,
      navigation: { id: 1, source: "initial", direction: "unknown", url: "https://example.test/" },
    });
    await controller.mount(document as unknown as ParentNode);
    const translation = getPageTranslation(document as unknown as Document)!;
    await translation.ready;
    expect(document.documentElement.lang).toBe("zh-Hant");
    expect(document.querySelector("p")!.textContent).toBe("開發");
    expect(changed).toHaveBeenCalledOnce();
    const late = document.createElement("p");
    late.textContent = "头发";
    document.body.append(late);
    observers[0]!.callback([
      { type: "childList", addedNodes: [late] },
    ] as unknown as MutationRecord[]);
    frames.splice(0).forEach((frame) => frame(0));
    expect(late.textContent).toBe("頭髮");
    document.querySelector("#translateLink")!.dispatchEvent(new window.Event("click"));
    await translation.ready;
    expect(late.textContent).toBe("头发");
    expect(document.documentElement.lang).toBe("zh-Hans");
    expect(storage.get(TRANSLATION_STORAGE_KEY)).toBe(2);
    expect(changed).toHaveBeenCalledTimes(2);
    await resources.dispose();
    expect(observers[0]!.disconnect).toHaveBeenCalledOnce();
    expect(getPageTranslation(document as unknown as Document)).toBeUndefined();
    expect(await translation.setTarget(1)).toBe(false);
  });
});
