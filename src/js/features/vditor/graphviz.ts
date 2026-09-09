import type { PageResourceScope } from "../../core/resource-scope";
import type { VditorWindow } from "./diagrams";

export async function renderGraphviz(
  element: HTMLElement,
  source: string,
  win: VditorWindow,
  resources: PageResourceScope,
): Promise<void> {
  const script = element.ownerDocument.getElementById(
    "vditorGraphVizScript",
  ) as HTMLScriptElement | null;
  if (!win.Viz || !script) throw new Error("Graphviz has not loaded.");
  let renderer: URL;
  try {
    renderer = new URL(script.src);
  } catch (cause) {
    throw new Error("Graphviz script URL is invalid.", { cause });
  }
  renderer.pathname = renderer.pathname.replace(/viz\.js$/, "full.render.js");
  // Only the already-loaded plugin resource URL is embedded; user DOT is sent through Viz.
  const blob = new Blob([`importScripts(${JSON.stringify(renderer.href)});`], {
    type: "text/javascript",
  });
  const url = URL.createObjectURL(blob);
  let worker: Worker | undefined;
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    worker?.terminate();
    URL.revokeObjectURL(url);
  };
  resources.signal.addEventListener("abort", close, { once: true });
  try {
    worker = new Worker(url);
    const svg = await new win.Viz({ worker }).renderSVGElement(source);
    if (resources.disposed || !element.isConnected) return;
    element.replaceChildren(element.ownerDocument.importNode(svg, true));
    element.dataset["processed"] = "true";
  } finally {
    resources.signal.removeEventListener("abort", close);
    close();
  }
}
