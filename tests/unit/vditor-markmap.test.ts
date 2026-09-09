import { parseHTML } from "linkedom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PageResourceScope } from "../../src/js/core/resource-scope";
import {
  ChineseTranslation,
  setPageTranslation,
  TRANSLATION_EVENT,
} from "../../src/js/features/translation/state";
import { mountVditor, type VditorWindow } from "../../src/js/features/vditor";
import { createMarkmapRenderer, type MarkmapApi } from "../../src/js/features/vditor/markmap";

const scopes: PageResourceScope[] = [];
afterEach(async () => {
  await Promise.all(scopes.splice(0).map((scope) => scope.dispose()));
  vi.unstubAllGlobals();
});

function fixture() {
  const { document, window } = parseHTML(
    '<html><head><base href="https://example.test/"></head><body><article id="article-container"><div id="vditor-article-sign"></div><pre><code class="language-markmap"># 写作流程\n## 准备\n- 整理素材\n## 编写\n- 公式与图表\n## 验收\n- 手机阅读</code></pre></article></body></html>',
  );
  vi.stubGlobal("document", document);
  vi.stubGlobal("Event", window.Event);
  vi.stubGlobal("MutationObserver", window.MutationObserver);
  vi.stubGlobal("ResizeObserver", undefined);
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) =>
    setTimeout(() => callback(0), 0),
  );
  vi.stubGlobal("cancelAnimationFrame", clearTimeout);
  const code = document.querySelector("code")!;
  const root = document.querySelector("article")!;
  const source = code.textContent!;
  const setData = vi.fn();
  const fit = vi.fn();
  const destroy = vi.fn();
  const create = vi.fn((svg: SVGElement) => ({
    setData: async (data: { content: string }) => {
      const text = svg.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "text");
      text.textContent = data.content;
      svg.replaceChildren(text);
      await setData(data.content);
    },
    fit,
    destroy,
  }));
  const api: MarkmapApi = {
    Transformer: class {
      transform(content: string) {
        return { root: { content }, features: {} };
      }
      getAssets() {
        return {};
      }
    },
    Markmap: { create },
    deriveOptions: () => ({}),
    loadCSS() {},
    loadJS() {},
  };
  const resources = new PageResourceScope();
  scopes.push(resources);
  const sdk = {
    // Reproduce the upstream adapter's contract: append a new div, then remove the original CODE.
    markmapRender: vi.fn(() => {
      const result = document.createElement("div");
      result.className = "language-markmap";
      code.parentNode!.appendChild(result);
      code.parentNode!.removeChild(code);
    }),
  };
  const originalMarkmap = sdk.markmapRender;
  const originalRender = vi.fn(() => sdk.markmapRender());
  const win = Object.assign(window, {
    markmap: api,
    Vditor: sdk,
    vditorRender: { CDN: "/vditor", render: originalRender, setDarkMode: vi.fn() },
  }) as unknown as VditorWindow;
  // The plugin calls markmapRender with the article root; keep the original mutation stub for assertions.
  originalRender.mockImplementation(() =>
    win.Vditor!.markmapRender!(root as unknown as HTMLElement, "/vditor"),
  );
  return {
    document,
    code,
    root,
    source,
    win,
    api,
    resources,
    originalMarkmap,
    originalRender,
    setData,
    fit,
    destroy,
    create,
  };
}

describe("Markmap conversion with stable rendering nodes", () => {
  it("converts the screenshot's Markdown on the same instance across repeated language switches", async () => {
    const h = fixture();
    const translation = new ChineseTranslation(2);
    setPageTranslation(h.document as unknown as Document, translation);
    mountVditor(h.root as unknown as HTMLElement, h.resources, h.win);
    await vi.waitFor(() => expect(h.code.dataset["processed"]).toBe("true"));
    const svg = h.code.querySelector("svg");
    expect(h.originalMarkmap).not.toHaveBeenCalled();
    expect(h.code.isConnected).toBe(true);
    const change = async (target: 1 | 2) => {
      await translation.setTarget(target);
      h.document.dispatchEvent(new Event(TRANSLATION_EVENT));
    };
    await change(1);
    await vi.waitFor(() => expect(h.code.textContent).toContain("手機閱讀"));
    expect(h.code.textContent).toContain("公式與圖表");
    await vi.waitFor(() => expect(h.code.dataset["processed"]).toBe("true"));
    await change(2);
    await vi.waitFor(() => expect(h.code.textContent).toBe(h.source));
    expect(h.code.querySelector("svg")).toBe(svg);
    expect(h.root.querySelectorAll(".language-markmap")).toHaveLength(1);
    expect(h.root.querySelectorAll("svg")).toHaveLength(1);
    expect(h.create).toHaveBeenCalledOnce();
    await h.resources.dispose();
    expect(h.destroy).toHaveBeenCalledOnce();
    expect(h.win.Vditor!.markmapRender).toBe(h.originalMarkmap);
  });

  it("waits for the current layout before applying the latest language, even though an SVG already exists", async () => {
    const h = fixture();
    const translation = new ChineseTranslation(2);
    setPageTranslation(h.document as unknown as Document, translation);
    mountVditor(h.root as unknown as HTMLElement, h.resources, h.win);
    await vi.waitFor(() => expect(h.code.dataset["processed"]).toBe("true"));
    let finish!: () => void;
    h.setData.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    await translation.setTarget(1);
    h.document.dispatchEvent(new Event(TRANSLATION_EVENT));
    await vi.waitFor(() => expect(h.setData).toHaveBeenCalledTimes(2));
    expect(h.code.dataset["processed"]).toBe("false");
    await translation.setTarget(2);
    h.document.dispatchEvent(new Event(TRANSLATION_EVENT));
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(h.setData).toHaveBeenCalledTimes(2);
    finish();
    await vi.waitFor(() => expect(h.setData).toHaveBeenCalledTimes(3));
    await vi.waitFor(() => expect(h.code.dataset["processed"]).toBe("true"));
    expect(h.code.textContent).toBe(h.source);
    expect(h.create).toHaveBeenCalledOnce();
  });

  it("ignores duplicate adapter calls instead of treating SVG styles and labels as Markdown", async () => {
    const h = fixture();
    mountVditor(h.root as unknown as HTMLElement, h.resources, h.win);
    h.win.Vditor!.markmapRender!(h.root as unknown as HTMLElement);
    await vi.waitFor(() => expect(h.code.dataset["processed"]).toBe("true"));
    const svg = h.code.querySelector("svg")!;
    const style = h.document.createElementNS("http://www.w3.org/2000/svg", "style");
    style.textContent = ".markmap{font:300 16px/20px sans-serif}";
    svg.prepend(style);
    expect(h.code.textContent).toContain(".markmap{");
    h.win.Vditor!.markmapRender!(h.root as unknown as HTMLElement);
    await Promise.resolve();
    expect(h.setData).toHaveBeenCalledExactlyOnceWith(h.source);
    expect(h.code.querySelector("svg")).toBe(svg);
    expect(h.code.dataset["processed"]).toBe("true");
  });

  it("shares the plugin CDN library load and ignores a load completed after unmount", async () => {
    const h = fixture();
    delete h.win.markmap;
    let finish!: () => void;
    const load = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const render = createMarkmapRenderer(h.win, h.resources, load);
    const second = h.document.createElement("code");
    h.root.append(second);
    const firstRender = render(h.code as unknown as HTMLElement, h.source);
    const secondRender = render(second as unknown as HTMLElement, "# 另一张图");
    expect(load).toHaveBeenCalledOnce();
    expect(load).toHaveBeenCalledWith("/vditor/dist/js/markmap/markmap.min.js", {
      "data-manual": "",
    });
    await h.resources.dispose();
    h.win.markmap = h.api;
    finish();
    await Promise.all([firstRender, secondRender]);
    expect(h.create).not.toHaveBeenCalled();
    expect(h.code.textContent).toBe(h.source);
  });
});
