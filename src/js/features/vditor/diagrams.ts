import type { PageResourceScope } from "../../core/resource-scope";
import type { TextConversion } from "../translation/state";
import { renderGraphviz } from "./graphviz.js";
import type { MarkmapApi } from "./markmap.js";

export type Mode = "light" | "dark";
export type Render = (element?: string) => void;
export const DIAGRAM_KINDS = [
  "mermaid",
  "echarts",
  "mindmap",
  "abc",
  "graphviz",
  "flowchart",
  "plantuml",
  "markmap",
] as const;
export type DiagramKind = (typeof DIAGRAM_KINDS)[number];
export const DIAGRAM_SELECTOR = DIAGRAM_KINDS.map((kind) => `.language-${kind}`).join(", ");
export const THEMED_KINDS = new Set<DiagramKind>(["mermaid", "echarts", "mindmap"]);
export interface Chart {
  resize(): void;
  dispose(): void;
  setOption(option: Record<string, unknown>): void;
}
export interface VditorWindow extends Window {
  vditorRender?: {
    CDN?: string;
    setDarkMode(dark: boolean): void;
    render: Render;
    vditorRender?: Render;
  };
  Vditor?: Partial<
    Record<
      `${DiagramKind}Render` | "chartRender",
      (root: HTMLElement, cdn?: string, theme?: string) => void
    >
  >;
  mermaid?: {
    initialize(config: Record<string, unknown>): void;
    render(id: string, source: string): Promise<{ svg: string }>;
  };
  echarts?: { getInstanceByDom(element: HTMLElement): Chart | undefined };
  plantumlEncoder?: { encode(source: string): string };
  markmap?: MarkmapApi;
  Viz?: new (options: { worker: Worker }) => {
    renderSVGElement(source: string): Promise<SVGElement>;
  };
}
export interface Diagram {
  element: HTMLElement;
  source: string;
  className: string;
  mindmap: string | null;
  kind: DiagramKind;
}
export interface DiagramInput {
  source: string;
  mindmap: string | null;
}

export function captureDiagram(element: HTMLElement): Diagram | undefined {
  if (element.dataset["processed"] === "true" || element.querySelector("svg, canvas, object, img"))
    return;
  const kind = DIAGRAM_KINDS.find((name) => element.classList.contains(`language-${name}`));
  if (!kind) return;
  return {
    element,
    kind,
    source: element.textContent ?? "",
    className: element.className,
    mindmap: element.getAttribute("data-code"),
  };
}

// Preserve URLs and JSON keys; language conversion is for diagram text, never network targets.
export function convertDiagramText(source: string, convert: TextConversion): string {
  return source
    .split(/(https?:\/\/[^\s"<>]+)/g)
    .map((part) => (/^https?:\/\//.test(part) ? part : convert(part)))
    .join("");
}
type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
function jsonKeys(value: unknown, keys = new Set<string>()): Set<string> {
  if (Array.isArray(value)) value.forEach((item) => jsonKeys(item, keys));
  else if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      keys.add(key);
      jsonKeys(item, keys);
    }
  }
  return keys;
}

function convertJson(value: unknown, convert: TextConversion, keys = jsonKeys(value)): JsonValue {
  if (typeof value === "string")
    return keys.has(value) ? value : convertDiagramText(value, convert);
  if (Array.isArray(value)) return value.map((item) => convertJson(item, convert, keys));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, convertJson(item, convert, keys)]),
    );
  }
  if (value === null || typeof value === "number" || typeof value === "boolean") return value;
  throw new TypeError("Diagram data must contain only JSON values.");
}

export function diagramInput(diagram: Diagram, convert: TextConversion): DiagramInput {
  if (diagram.kind === "mindmap" && diagram.mindmap !== null) {
    try {
      const tree: unknown = JSON.parse(decodeURIComponent(diagram.mindmap));
      return {
        source: diagram.source,
        mindmap: encodeURIComponent(JSON.stringify(convertJson(tree, convert))),
      };
    } catch {
      return { source: diagram.source, mindmap: diagram.mindmap };
    }
  }
  if (diagram.kind === "echarts") {
    try {
      const option: unknown = JSON.parse(diagram.source);
      return { source: JSON.stringify(convertJson(option, convert)), mindmap: null };
    } catch {
      /* Vditor also accepts object expressions; preserve its syntax. */
    }
  }
  return { source: convertDiagramText(diagram.source, convert), mindmap: diagram.mindmap };
}

export function restoreDiagram(
  diagram: Diagram,
  windowObject: VditorWindow,
  input: DiagramInput = diagram,
): void {
  const { element } = diagram;
  windowObject.echarts?.getInstanceByDom(element)?.dispose();
  element.textContent = input.source;
  element.className = diagram.className;
  element.removeAttribute("data-processed");
  element.removeAttribute("_echarts_instance_");
  if (input.mindmap !== null) element.setAttribute("data-code", input.mindmap);
}

export function mermaidConfig(mode: Mode): Record<string, unknown> {
  return {
    theme: mode === "dark" ? "dark" : "default",
    securityLevel: "strict",
    fontFamily: "sans-serif",
    startOnLoad: false,
    flowchart: { htmlLabels: true, useMaxWidth: false },
    sequence: { useMaxWidth: false },
    gantt: { useMaxWidth: false },
  };
}

let mermaidId = 0;
async function renderMermaid(
  diagram: Diagram,
  input: DiagramInput,
  mode: Mode,
  win: VditorWindow,
  resources: PageResourceScope,
): Promise<void> {
  if (!win.mermaid) return;
  win.mermaid.initialize(mermaidConfig(mode));
  const { svg: markup } = await win.mermaid.render(`hanlo-mermaid-${++mermaidId}`, input.source);
  if (resources.disposed || !diagram.element.isConnected) return;
  const parsed = new DOMParser().parseFromString(markup, "text/html");
  const svg = parsed.querySelector("svg");
  if (!svg) throw new Error("Mermaid did not return an SVG diagram.");
  diagram.element.replaceChildren(diagram.element.ownerDocument.importNode(svg, true));
  diagram.element.dataset["processed"] = "true";
}

export function diagramReady({ element, kind }: Diagram): boolean {
  if (kind === "markmap" && !element.classList.contains("vditor-reset--error")) {
    return element.dataset["processed"] === "true" && Boolean(element.querySelector("svg"));
  }
  return (
    element.classList.contains("vditor-reset--error") ||
    Boolean(element.querySelector("svg, canvas, object, img"))
  );
}

export function refreshDiagram(
  diagram: Diagram,
  input: DiagramInput,
  mode: Mode,
  win: VditorWindow,
  resources: PageResourceScope,
): void {
  const { element, kind } = diagram;
  // External SVG documents cannot be translated by walking the parent DOM. Update the encoded
  // request from the original source; stable URLs let the browser reuse its HTTP cache on return.
  const object = element.querySelector<HTMLObjectElement>("object");
  if (kind === "plantuml" && object && win.plantumlEncoder) {
    object.data = `https://www.plantuml.com/plantuml/svg/~1${win.plantumlEncoder.encode(input.source)}`;
    return;
  }
  restoreDiagram(diagram, win, input);
  const fail = (error: unknown) => {
    if (resources.disposed || !element.isConnected) return;
    element.textContent = input.source;
    element.classList.add("vditor-reset--error");
    console.error(`[Vditor] ${kind} rendering failed; source preserved.`, error);
  };
  if (kind === "mermaid" && win.mermaid) {
    void renderMermaid(diagram, input, mode, win, resources).catch(fail);
  } else if (kind === "graphviz" && win.Viz) {
    void renderGraphviz(element, input.source, win, resources).catch(fail);
  } else {
    try {
      const method = kind === "echarts" ? "chartRender" : (`${kind}Render` as const);
      // Each renderer operates on its own wrapper, so a slow/invalid diagram cannot block others.
      const root = element.closest<HTMLElement>(".hanlo-vditor-block");
      const render = win.Vditor?.[method];
      if (!root || !render) throw new Error(`Missing ${method}`);
      render(root, win.vditorRender?.CDN, mode === "dark" ? "dark" : "classic");
    } catch (error) {
      fail(error);
    }
  }
}
