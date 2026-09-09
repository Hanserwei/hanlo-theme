import { afterEach, describe, expect, it, vi } from "vitest";

import { PageResourceScope } from "../../src/js/core/resource-scope";
import { PAGE_LIFECYCLE_EVENTS } from "../../src/js/core/runtime";
import {
  ChineseTranslation,
  setPageTranslation,
  TRANSLATION_EVENT,
} from "../../src/js/features/translation/state";
import { mountVditor } from "../../src/js/features/vditor";
import {
  captureDiagram,
  diagramInput,
  DIAGRAM_SELECTOR,
  restoreDiagram,
  type VditorWindow,
} from "../../src/js/features/vditor/diagrams";

function element(className: string, source: string) {
  const attributes = new Map<string, string>();
  const object = { data: "initial-plantuml.svg" };
  const svg = { viewBox: { baseVal: { width: 200 } }, style: {} };
  const value = {
    className,
    textContent: source,
    isConnected: true,
    rendered: false,
    replaceChildren: vi.fn(),
    ownerDocument: { importNode: (node: unknown) => node },
    dataset: {} as Record<string, string>,
    classList: {
      contains: (name: string) => value.className.split(" ").includes(name),
      add: (name: string) => {
        value.className += ` ${name}`;
      },
    },
    closest: (selector: string) => (selector === ".hanlo-vditor-block" ? {} : null),
    querySelectorAll: () => [],
    querySelector: (selector: string) => {
      if (!value.rendered) return null;
      if (selector.includes("object") && className.includes("plantuml")) return object;
      if (selector.includes("svg") && className.includes("mermaid")) return svg;
      if (selector.includes("canvas") && className.includes("echarts")) return {};
      return null;
    },
    getAttribute: (name: string) => attributes.get(name) ?? null,
    setAttribute: (name: string, content: string) => {
      attributes.set(name, content);
    },
    removeAttribute: (name: string) => {
      attributes.delete(name);
      if (name === "data-processed") {
        delete value.dataset["processed"];
        value.rendered = false;
      }
    },
  };
  return Object.assign(value, { object });
}

function setup(options: { chartSource?: string; translation?: ChineseTranslation } = {}) {
  const frames: FrameRequestCallback[] = [];
  const observers: {
    callback: (records: MutationRecord[]) => void;
    disconnect: ReturnType<typeof vi.fn>;
  }[] = [];
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    frames.push(callback);
    return frames.length;
  });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  vi.stubGlobal("ResizeObserver", undefined);
  vi.stubGlobal(
    "DOMParser",
    class {
      parseFromString() {
        return { querySelector: () => ({ tagName: "svg" }) };
      }
    },
  );
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
  const mermaid = element("language-mermaid", "graph TD\n  A[用户] --> B[发布]");
  const echarts = element(
    "language-echarts",
    options.chartSource ?? '{"title":{"text":"用户"},"series":[]}',
  );
  const plantuml = element(
    "language-plantuml",
    '@startuml\nactor "用户" as User\nUser -> User: 发布\n@enduml',
  );
  const nodes = [mermaid, echarts, plantuml];
  const links: { href: string }[] = [];
  const doc = Object.assign(new EventTarget(), {
    baseURI: "https://example.test/post",
    documentElement: { dataset: { theme: "light" } },
    readyState: "loading",
    querySelectorAll: () => links,
    createElement: () => ({}),
    head: { append: (link: { href: string }) => links.push(link) },
  });
  if (options.translation) setPageTranslation(doc as unknown as Document, options.translation);
  const root = {
    ownerDocument: doc,
    isConnected: true,
    classList: { add: vi.fn() },
    querySelectorAll: (selector: string) => (selector === DIAGRAM_SELECTOR ? nodes : []),
    querySelector: (selector: string) => (selector === ".language-plantuml" ? plantuml : null),
  } as unknown as HTMLElement;
  const charts: {
    resize: ReturnType<typeof vi.fn>;
    dispose: ReturnType<typeof vi.fn>;
    setOption: ReturnType<typeof vi.fn>;
  }[] = [];
  const createChart = () => {
    const chart = { resize: vi.fn(), dispose: vi.fn(), setOption: vi.fn() };
    charts.push(chart);
    return chart;
  };
  let chart = createChart();
  const chartSources: string[] = [];
  const pending: ((value: { svg: string }) => void)[] = [];
  const notify = (node: unknown) => observers[0]?.callback([{ target: node }] as MutationRecord[]);
  const complete = (selected = nodes) => {
    selected.forEach((node) => {
      node.rendered = true;
      node.dataset["processed"] = "true";
      notify(node);
    });
  };
  let pluginDark = true;
  const initialModes: boolean[] = [];
  const initialSources: string[][] = [];
  const original = vi.fn(() => {
    initialModes.push(pluginDark);
    initialSources.push(nodes.map((node) => node.textContent));
    nodes.forEach((node) => {
      node.textContent = "generated output";
    });
  });
  const bridge = {
    CDN: "https://cdn.example.test/vditor",
    setDarkMode: (dark: boolean) => {
      pluginDark = dark;
    },
    render: original,
    vditorRender: original,
  };
  const win = Object.assign(new EventTarget(), {
    vditorRender: bridge,
    Vditor: {
      mermaidRender: vi.fn(),
      mindmapRender: vi.fn(),
      plantumlRender: vi.fn(),
      chartRender: vi.fn(() => {
        chartSources.push(echarts.textContent);
        chart = createChart();
        complete([echarts]);
      }),
    },
    plantumlEncoder: { encode: vi.fn((source: string) => encodeURIComponent(source)) },
    mermaid: {
      initialize: vi.fn(),
      render: vi.fn(() => new Promise<{ svg: string }>((resolve) => pending.push(resolve))),
    },
    echarts: { getInstanceByDom: (node: unknown) => (node === echarts ? chart : undefined) },
    getComputedStyle: () => ({ getPropertyValue: () => "#24292f" }),
  });
  const resources = new PageResourceScope();
  const flush = () => {
    frames.splice(0).forEach((callback) => callback(0));
  };
  const changeMode = (mode: string) => {
    doc.documentElement.dataset.theme = mode;
    observers[1]?.callback([]);
    flush();
  };
  const finishMermaid = async () => {
    pending.shift()?.({ svg: "<svg><text>diagram</text></svg>" });
    await Promise.resolve();
    complete([mermaid]);
    flush();
  };
  const changeLanguage = async (target: 1 | 2) => {
    await options.translation?.setTarget(target);
    doc.dispatchEvent(new Event(TRANSLATION_EVENT));
    flush();
  };
  mountVditor(root, resources, win as unknown as VditorWindow);
  return {
    root,
    resources,
    win,
    doc,
    original,
    initialModes,
    initialSources,
    mermaid,
    echarts,
    plantuml,
    charts,
    chartSources,
    complete,
    flush,
    changeMode,
    changeLanguage,
    finishMermaid,
    observers,
    links,
    notify,
  };
}

afterEach(() => vi.unstubAllGlobals());

describe("Vditor theme and language integration", () => {
  it("preserves exact source and URI-encoded mindmap JSON", () => {
    const node = element("language-mindmap", "");
    node.setAttribute(
      "data-code",
      encodeURIComponent('{"name":"用户","url":"https://example.test/用户"}'),
    );
    const snapshot = captureDiagram(node as unknown as HTMLElement)!;
    const input = diagramInput(snapshot, (text) => text.replaceAll("用户", "用戶"));
    expect(JSON.parse(decodeURIComponent(input.mindmap!))).toEqual({
      name: "用戶",
      url: "https://example.test/用户",
    });
    const dispose = vi.fn();
    node.dataset["processed"] = "true";
    expect(captureDiagram(node as unknown as HTMLElement)).toBeUndefined();
    restoreDiagram(snapshot, {
      echarts: { getInstanceByDom: () => ({ dispose }) },
    } as unknown as VditorWindow);
    expect(dispose).toHaveBeenCalledOnce();
    expect(node.getAttribute("data-code")).toBe(snapshot.mindmap);
  });

  it("preserves ECharts dataset keys and field references while converting visible titles", () => {
    const source = JSON.stringify({
      title: { text: "用户统计" },
      dataset: { source: [{ 用户: 12 }] },
      series: [{ encode: { y: "用户" } }],
    });
    const node = element("language-echarts", source);
    const diagram = captureDiagram(node as unknown as HTMLElement)!;
    const input = diagramInput(diagram, (text) =>
      text.replaceAll("用户", "用戶").replaceAll("统计", "統計"),
    );
    expect(JSON.parse(input.source)).toEqual({
      title: { text: "用戶統計" },
      dataset: { source: [{ 用户: 12 }] },
      series: [{ encode: { y: "用户" } }],
    });
  });

  it("starts while document resources are loading, preconnects only used origins, and deduplicates load", async () => {
    const h = setup();
    expect(h.doc.readyState).toBe("loading");
    expect(h.initialModes).toEqual([false]);
    expect(h.links.map((link) => link.href)).toEqual([
      "https://cdn.example.test",
      "https://www.plantuml.com",
    ]);
    h.win.vditorRender.setDarkMode(true);
    h.win.vditorRender.render();
    expect(h.original).toHaveBeenCalledOnce();
    await h.resources.dispose();
  });

  it("coalesces changes per diagram without making a slow Mermaid block ready charts", async () => {
    const h = setup();
    h.changeMode("dark");
    h.complete([h.echarts]);
    h.flush();
    expect(h.chartSources).toHaveLength(1);
    expect(h.win.mermaid.render).not.toHaveBeenCalled();
    h.complete([h.mermaid]);
    h.flush();
    expect(h.win.mermaid.render).toHaveBeenCalledWith(
      expect.any(String),
      "graph TD\n  A[用户] --> B[发布]",
    );
    h.changeMode("light");
    expect(h.chartSources).toHaveLength(2);
    expect(h.win.mermaid.render).toHaveBeenCalledTimes(1);
    await h.finishMermaid();
    expect(h.win.mermaid.render).toHaveBeenCalledTimes(2);
    expect(h.chartSources[1]).toBe(h.chartSources[0]);
    await h.finishMermaid();
    await h.resources.dispose();
  });

  it("updates PlantUML immediately from original source and keeps stable URLs on repeated toggles", async () => {
    const translation = new ChineseTranslation(
      2,
      async () => (text) => text.replaceAll("用户", "用戶").replaceAll("发布", "發佈"),
    );
    const h = setup({ translation });
    await Promise.resolve();
    await Promise.resolve();
    h.complete();
    h.flush();
    await h.changeLanguage(1);
    const traditionalUrl = h.plantuml.object.data;
    expect(decodeURIComponent(traditionalUrl)).toContain('actor "用戶"');
    expect(h.win.plantumlEncoder.encode).toHaveBeenCalledOnce();
    expect(h.win.Vditor.plantumlRender).not.toHaveBeenCalled();
    expect(h.chartSources[0]).toContain("用戶");
    await h.changeLanguage(2);
    expect(decodeURIComponent(h.plantuml.object.data)).toContain('actor "用户"');
    await h.changeLanguage(1);
    expect(h.plantuml.object.data).toBe(traditionalUrl);
    expect(h.original).toHaveBeenCalledOnce();
    await h.resources.dispose();
    await h.finishMermaid();
  });

  it("waits only for a saved conversion dictionary before the first render", async () => {
    let resolve!: (convert: (text: string) => string) => void;
    const translation = new ChineseTranslation(
      2,
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    translation.ready = translation.setTarget(1).then(() => {});
    const h = setup({ translation });
    expect(h.original).not.toHaveBeenCalled();
    resolve((text) => text.replaceAll("用户", "用戶"));
    await translation.ready;
    await Promise.resolve();
    expect(h.original).toHaveBeenCalledOnce();
    expect(h.initialSources[0]![2]).toContain("用戶");
    expect(h.doc.readyState).toBe("loading");
    await h.resources.dispose();
  });

  it("preserves authored backgrounds and ignores diagram animation and unrelated DOM changes", async () => {
    const h = setup({ chartSource: '{"backgroundColor":"#ffffff","series":[]}' });
    h.complete();
    h.flush();
    expect(h.charts[0]!.setOption).not.toHaveBeenCalled();
    const resizeCount = h.charts[0]!.resize.mock.calls.length;
    h.notify({ nestedCanvas: true });
    h.flush();
    expect(h.charts[0]!.resize).toHaveBeenCalledTimes(resizeCount);
    h.doc.dispatchEvent(new Event(PAGE_LIFECYCLE_EVENTS.restore));
    expect(h.original).toHaveBeenCalledOnce();
    h.changeMode("dark");
    await h.resources.dispose();
    expect(h.win.vditorRender.render).toBe(h.original);
    expect(h.observers.every((observer) => observer.disconnect.mock.calls.length === 1)).toBe(true);
    await h.finishMermaid();
    expect(h.mermaid.replaceChildren).not.toHaveBeenCalled();
  });
});
