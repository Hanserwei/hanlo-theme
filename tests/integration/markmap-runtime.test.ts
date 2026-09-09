import { readFileSync } from "node:fs";
import vm from "node:vm";

import { parseHTML } from "linkedom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PageResourceScope } from "../../src/js/core/resource-scope";
import { getLocalHighlighter } from "../../src/js/features/shiki/local";
import { loadChineseConversion } from "../../src/js/features/translation/state";
import type { VditorWindow } from "../../src/js/features/vditor";
import { createMarkmapRenderer } from "../../src/js/features/vditor/markmap";

const file = process.env["VDITOR_MARKMAP_RUNTIME"];
if (!file)
  throw new Error(
    "Run pnpm test:markmap-runtime to fetch and verify the pinned upstream bundle first.",
  );
const bundle = readFileSync(file, "utf8");
const cleanups: (() => void | Promise<void>)[] = [];
let fixtureId = 0;

// Real Markmap/D3/Transformer/Prism, with geometry supplied by an inert DOM fixture.
// No browser, fonts, live site or external service is used for this regression.
function fixture(html: string) {
  const { document, window: dom } = parseHTML(`<html><head></head><body>${html}</body></html>`);
  Object.defineProperty(document, "readyState", { value: "complete", configurable: true });
  Object.defineProperty(document, "scripts", { get: () => document.querySelectorAll("script") });
  let currentScript: HTMLScriptElement | null = null;
  Object.defineProperty(document, "currentScript", { get: () => currentScript });
  vi.spyOn(dom.Element.prototype, "getBoundingClientRect").mockImplementation(
    function (this: Element) {
      const width =
        this.tagName.toLowerCase() === "svg"
          ? 800
          : Math.max(40, (this.textContent?.length ?? 1) * 12);
      return {
        x: 0,
        y: 0,
        width,
        height: this.tagName.toLowerCase() === "svg" ? 400 : 24,
        top: 0,
        left: 0,
        right: width,
        bottom: 400,
        toJSON() {},
      };
    },
  );
  for (const [name, value] of Object.entries({
    width: { baseVal: { value: 800 } },
    height: { baseVal: { value: 400 } },
    transform: { baseVal: { consolidate: () => null } },
  })) {
    const previous = Object.getOwnPropertyDescriptor(dom.SVGElement.prototype, name);
    Object.defineProperty(dom.SVGElement.prototype, name, { configurable: true, get: () => value });
    cleanups.push(() => {
      if (previous) Object.defineProperty(dom.SVGElement.prototype, name, previous);
      else Reflect.deleteProperty(dom.SVGElement.prototype, name);
    });
  }
  const timeouts = new Set<ReturnType<typeof setTimeout>>();
  const intervals = new Set<ReturnType<typeof setInterval>>();
  const timeout = (callback: (...args: unknown[]) => void, delay = 0, ...args: unknown[]) => {
    const handle = setTimeout(() => {
      timeouts.delete(handle);
      callback(...args);
    }, delay);
    timeouts.add(handle);
    return handle;
  };
  const errors: unknown[][] = [];
  const sandbox: Record<string, unknown> = {
    document,
    navigator: { userAgent: "offline-markmap-test", maxTouchPoints: 0 },
    location: { href: "https://example.test/article" },
    performance,
    HTMLElement: dom.HTMLElement,
    SVGElement: dom.SVGElement,
    Element: dom.Element,
    Node: dom.Node,
    Text: dom.Text,
    Event: dom.Event,
    CustomEvent: dom.CustomEvent,
    getComputedStyle: () => ({ getPropertyValue: () => "0" }),
    setTimeout: timeout,
    clearTimeout,
    setInterval: (callback: () => void, delay: number) => {
      const id = setInterval(callback, delay);
      intervals.add(id);
      return id;
    },
    clearInterval,
    requestAnimationFrame: (callback: FrameRequestCallback) =>
      timeout(() => callback(performance.now()), 1),
    cancelAnimationFrame: clearTimeout,
    console: { log() {}, warn() {}, error: (...args: unknown[]) => errors.push(args) },
  };
  sandbox["window"] = sandbox;
  sandbox["self"] = sandbox;
  const context = vm.createContext(sandbox);
  const scripts: HTMLScriptElement[] = [];
  const append = document.head.append.bind(document.head);
  vi.spyOn(document.head, "append").mockImplementation((...nodes: (string | Node)[]) => {
    append(...nodes);
    for (const node of nodes) {
      if (typeof node === "string" || (node as Element).tagName !== "SCRIPT") continue;
      const script = node as HTMLScriptElement;
      scripts.push(script);
      // Classic script executes with currentScript set before its load event resolves imports.
      currentScript = script;
      vm.runInContext(bundle, context, { timeout: 5_000, filename: "vditor-markmap.min.js" });
      currentScript = null;
      script.dispatchEvent(new dom.Event("load"));
    }
  });
  vi.stubGlobal("document", document);
  vi.stubGlobal("getComputedStyle", sandbox["getComputedStyle"]);
  vi.stubGlobal("window", sandbox);
  const resources = new PageResourceScope();
  cleanups.push(async () => {
    await resources.dispose();
    timeouts.forEach(clearTimeout);
    intervals.forEach(clearInterval);
  });
  const win = sandbox as unknown as VditorWindow;
  win.vditorRender = {
    CDN: `https://example.test/vditor-${++fixtureId}`,
    render() {},
    setDarkMode() {},
  };
  return { document, win, resources, errors, scripts };
}

afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("actual Vditor Markmap bundle", () => {
  it("reproduces bundled Prism flattening a rendered SVG and deleting Shiki markup without data-manual", async () => {
    const h = fixture(
      '<code class="language-markmap"><svg><style>.markmap{font:300 16px/20px sans-serif}</style><text>手机阅读写作流程</text></svg></code><pre class="shiki"><code class="language-java"><span class="line">class Demo</span></code></pre>',
    );
    const script = h.document.createElement("script");
    script.src = "https://example.test/upstream-markmap.js";
    h.document.head.append(script);
    await vi.waitFor(() => expect(h.document.querySelector(".language-markmap svg")).toBeNull());
    expect(h.document.querySelector(".language-markmap")!.textContent).toBe(
      ".markmap{font:300 16px/20px sans-serif}手机阅读写作流程",
    );
    expect(h.document.querySelector(".shiki .line")).toBeNull();
  });

  it("loads the real bundle manually and renders/updates one SVG without touching Shiki", async () => {
    const highlighter = await getLocalHighlighter("java");
    const shiki = highlighter.codeToHtml('System.out.println("手机阅读");', {
      lang: "java",
      themes: { light: "one-light", dark: "one-dark-pro" },
      defaultColor: false,
    });
    const h = fixture(
      `<div class="hanlo-vditor-block"><code class="language-markmap"></code></div><div class="shiki-code-block">${shiki}</div>`,
    );
    const code = h.document.querySelector(".language-markmap")! as unknown as HTMLElement;
    const codeMarkup = h.document.querySelector(".shiki-code-block")!.innerHTML;
    const source =
      "---\nmarkmap:\n  duration: 0\n---\n# 写作流程\n## 准备\n- 整理素材\n## 编写\n- 公式与图表\n## 验收\n- 手机阅读";
    code.textContent = source;
    const render = createMarkmapRenderer(h.win, h.resources);
    await render(code, source);
    expect(h.errors).toEqual([]);
    expect(h.scripts).toHaveLength(1);
    expect(h.scripts[0]!.hasAttribute("data-manual")).toBe(true);
    const svg = code.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(code.dataset["processed"]).toBe("true");
    expect(code.querySelector("style")!.textContent).toContain(".markmap{");
    expect(code.querySelectorAll("foreignObject").length).toBeGreaterThan(3);
    expect(code.textContent).toContain("手机阅读");
    const traditional = await loadChineseConversion(2);
    await render(code, traditional(source));
    expect(code.textContent).toContain("手機閱讀");
    expect(code.dataset["processed"]).toBe("true");
    await render(code, source);
    expect(code.textContent).toContain("手机阅读");
    expect(code.querySelector("svg")).toBe(svg);
    expect(code.querySelectorAll("svg")).toHaveLength(1);
    expect(h.document.querySelector(".shiki-code-block")!.innerHTML).toBe(codeMarkup);
    expect(h.errors).toEqual([]);
    await h.resources.dispose();
    expect(code.querySelector("svg")!.childNodes).toHaveLength(0);
  });
});
