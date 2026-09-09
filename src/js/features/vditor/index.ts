import type { PageResourceScope } from "../../core/resource-scope";
import { PAGE_LIFECYCLE_EVENTS } from "../../core/runtime";
import type { PageControllerDefinition } from "../../core/types";
import { getPageTranslation, TRANSLATION_EVENT } from "../translation/state";
import {
  captureDiagram,
  diagramInput,
  diagramReady,
  DIAGRAM_SELECTOR,
  THEMED_KINDS,
  mermaidConfig,
  refreshDiagram,
  type Diagram,
  type DiagramInput,
  type Mode,
  type Render,
  type VditorWindow,
} from "./diagrams";
import { createMarkmapRenderer } from "./markmap.js";
import {
  polishChart,
  polishDiagram,
  preconnectRenderOrigins,
  prepareDiagrams,
} from "./presentation";

export { captureDiagram, restoreDiagram, mermaidConfig } from "./diagrams";
export type { VditorWindow } from "./diagrams";
interface RenderState {
  diagram: Diagram;
  input: DiagramInput;
  mode: Mode;
  polished: boolean;
}

export function mountVditor(
  root: HTMLElement,
  resources: PageResourceScope,
  windowObject: VditorWindow = window,
): void {
  const bridge = windowObject.vditorRender;
  if (!bridge || !windowObject.Vditor) return;
  const mode = (): Mode =>
    root.ownerDocument.documentElement.dataset["theme"] === "dark" ? "dark" : "light";
  const translation = getPageTranslation(root.ownerDocument);
  const inputFor = (diagram: Diagram): DiagramInput => {
    const excluded = diagram.element.closest('[translate="no"], .notranslate, .ignore-opencc');
    return diagramInput(diagram, (text) =>
      excluded ? text : (translation?.convert(text) ?? text),
    );
  };
  const states: RenderState[] = Array.from(root.querySelectorAll<HTMLElement>(DIAGRAM_SELECTOR))
    .map(captureDiagram)
    .filter(
      (diagram): diagram is Diagram =>
        diagram !== undefined && Boolean(diagram.source.trim() || diagram.mindmap),
    )
    .map((diagram) => ({ diagram, input: inputFor(diagram), mode: mode(), polished: false }));
  prepareDiagrams(root);
  const sdk = windowObject.Vditor;
  const renderMarkmap = states.some(({ diagram }) => diagram.kind === "markmap")
    ? createMarkmapRenderer(windowObject, resources)
    : undefined;
  if (renderMarkmap) {
    const originalMarkmap = sdk.markmapRender;
    const requested = new WeakSet<HTMLElement>();
    const adapter = (scope: HTMLElement) => {
      for (const state of states) {
        const { diagram } = state;
        if (
          diagram.kind !== "markmap" ||
          !scope.contains(diagram.element) ||
          requested.has(diagram.element)
        )
          continue;
        requested.add(diagram.element);
        // Never reread the live SVG's textContent: it contains embedded CSS and rendered labels.
        // Subsequent variant changes are queued below using the captured Markdown source.
        void renderMarkmap(diagram.element, state.input.source).then(schedule);
      }
    };
    sdk.markmapRender = adapter;
    resources.defer(() => {
      if (sdk.markmapRender === adapter) sdk.markmapRender = originalMarkmap;
    });
  }
  if (states.length > 0) preconnectRenderOrigins(root, bridge.CDN);
  let started = false;
  let startRequested = false;
  let scheduled = false;
  const resizeCharts = () => {
    states
      .filter(({ diagram }) => diagram.kind === "echarts" || diagram.kind === "mindmap")
      .forEach(({ diagram }) => windowObject.echarts?.getInstanceByDom(diagram.element)?.resize());
  };
  const refresh = () => {
    if (resources.disposed || !root.isConnected || !started) return;
    bridge.setDarkMode(mode() === "dark");
    for (const state of states) {
      const { diagram } = state;
      if (!diagram.element.isConnected || !diagramReady(diagram)) continue;
      if (!state.polished) {
        state.polished = true;
        polishDiagram(diagram);
        if (diagram.kind === "echarts" || diagram.kind === "mindmap")
          polishChart(diagram, root, windowObject);
      }
      const input = inputFor(diagram);
      const changed = input.source !== state.input.source || input.mindmap !== state.input.mindmap;
      if (!changed && (!THEMED_KINDS.has(diagram.kind) || state.mode === mode())) continue;
      state.input = input;
      state.mode = mode();
      state.polished = false;
      if (diagram.kind === "markmap" && renderMarkmap) {
        void renderMarkmap(diagram.element, input.source).then(schedule);
      } else {
        refreshDiagram(diagram, input, state.mode, windowObject, resources);
      }
    }
  };
  const schedule = () => {
    if (scheduled || resources.disposed) return;
    scheduled = true;
    resources.animationFrame(() => {
      scheduled = false;
      refresh();
    });
  };
  const original = bridge.render;
  const originalAlias = bridge.vditorRender;
  const start = async (id?: string) => {
    // A saved variant must be applied before the plugin destroys the Markdown. Wait only for
    // that dictionary request, never window.load / images / media elsewhere in the document.
    if (translation) {
      let ready: Promise<void>;
      do {
        ready = translation.ready;
        await ready;
      } while (ready !== translation.ready);
    }
    if (resources.disposed || !root.isConnected) return;
    for (const state of states) {
      state.input = inputFor(state.diagram);
      state.mode = mode();
      const { element } = state.diagram;
      element.textContent = state.input.source;
      if (state.input.mindmap !== null) element.setAttribute("data-code", state.input.mindmap);
    }
    bridge.setDarkMode(mode() === "dark");
    windowObject.mermaid?.initialize(mermaidConfig(mode()));
    started = true;
    original.call(bridge, id);
    schedule();
  };
  const render: Render = (id) => {
    bridge.setDarkMode(mode() === "dark");
    if (!startRequested) {
      startRequested = true;
      void start(id).catch((error: unknown) =>
        console.error("[Vditor] Initial rendering failed.", error),
      );
    }
    schedule();
  };
  bridge.render = render;
  bridge.vditorRender = render;
  resources.defer(() => {
    if (bridge.render === render) bridge.render = original;
    if (bridge.vditorRender === render) bridge.vditorRender = originalAlias;
    states.forEach(({ diagram }) =>
      windowObject.echarts?.getInstanceByDom(diagram.element)?.dispose(),
    );
  });
  const observer = resources.observe(
    new MutationObserver((records) => {
      // Chart animations mutate their descendants frequently. Refresh only for render completion,
      // not every canvas frame, style change, or unrelated comment/toolbar mutation.
      if (
        records.some((record) =>
          states.some(
            ({ diagram }) =>
              record.target === diagram.element || record.target === diagram.element.parentElement,
          ),
        )
      )
        schedule();
    }),
  );
  states.forEach(({ diagram }) =>
    observer.observe(diagram.element, {
      childList: true,
      attributes: true,
      attributeFilter: ["data-processed", "class"],
    }),
  );
  const themeObserver = resources.observe(new MutationObserver(schedule));
  themeObserver.observe(root.ownerDocument.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  resources.listen(root.ownerDocument, TRANSLATION_EVENT, schedule);
  if (typeof ResizeObserver !== "undefined") {
    const sizeObserver = resources.observe(new ResizeObserver(resizeCharts));
    sizeObserver.observe(root);
  }
  resources.listen(root.ownerDocument, PAGE_LIFECYCLE_EVENTS.restore, () => {
    schedule();
    resizeCharts();
  });
  // render.js may call the bridge again at load; the wrapper deduplicates the initial pass.
  render();
}

export function createVditorController(): PageControllerDefinition {
  return {
    name: "vditor",
    create: ({ resources }) => ({
      mount() {
        const root = document.getElementById("vditor-article-sign")?.parentElement;
        if (root) mountVditor(root, resources);
      },
      unmount() {},
    }),
  };
}
