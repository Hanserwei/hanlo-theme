import type { PageResourceScope } from "../../core/resource-scope";
import { loadScript } from "../../core/ui";
import type { VditorWindow } from "./diagrams";

interface MarkmapNode {
  content: string;
  children?: MarkmapNode[];
}
interface MarkmapInstance {
  setData(root: MarkmapNode, options?: Record<string, unknown>): void | Promise<void>;
  fit(): void | Promise<void>;
  destroy(): void;
}
interface MarkmapTransformer {
  transform(source: string): {
    root: MarkmapNode;
    features: Record<string, boolean>;
    frontmatter?: { markmap?: Record<string, unknown> };
  };
  getAssets(features: string[]): { styles?: object[]; scripts?: object[] };
}
export interface MarkmapApi {
  Transformer: new () => MarkmapTransformer;
  Markmap: { create(svg: SVGElement, options: Record<string, unknown> | null): MarkmapInstance };
  deriveOptions(options?: Record<string, unknown>): Record<string, unknown>;
  loadCSS(styles: object[]): void;
  loadJS(scripts: object[]): void | Promise<void>;
}
interface MarkmapState {
  transformer: MarkmapTransformer;
  instance: MarkmapInstance;
}

export function createMarkmapRenderer(
  win: VditorWindow,
  resources: PageResourceScope,
  load: typeof loadScript = loadScript,
): (element: HTMLElement, source: string) => Promise<void> {
  const states = new Map<HTMLElement, MarkmapState>();
  const enabledFeatures = new Set<string>();
  let library: Promise<MarkmapApi> | undefined;
  const getLibrary = (): Promise<MarkmapApi> => {
    if (win.markmap) return Promise.resolve(win.markmap);
    // Vditor's Markmap bundle also ships Prism. Disable its automatic whole-page pass
    // before script execution, or it flattens this SVG and strips Shiki's line/token markup.
    library ??= load(
      `${(win.vditorRender?.CDN ?? "https://cdn.jsdelivr.net/npm/vditor@3.11.3").replace(/\/$/, "")}/dist/js/markmap/markmap.min.js`,
      { "data-manual": "" },
    )
      .then(() => {
        if (!win.markmap) throw new Error("Markmap script did not expose its renderer.");
        return win.markmap;
      })
      .catch((error: unknown) => {
        library = undefined;
        throw error;
      });
    return library;
  };
  resources.defer(() => {
    states.forEach(({ instance }) => instance.destroy());
    states.clear();
  });
  return async (element, source) => {
    // Vditor's original adapter removes <code> and appends a sibling. Keep this node stable
    // and update one owned instance so source tracking and observers survive every toggle.
    element.classList.remove("vditor-reset--error");
    element.dataset["processed"] = "false";
    try {
      const api = await getLibrary();
      if (resources.disposed || !element.isConnected) return;
      let state = states.get(element);
      if (!state) {
        const svg = element.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.style.width = "100%";
        element.replaceChildren(svg);
        state = { transformer: new api.Transformer(), instance: api.Markmap.create(svg, null) };
        states.set(element, state);
      }
      const result = state.transformer.transform(source);
      const features = Object.keys(result.features).filter((key) => !enabledFeatures.has(key));
      const assets = state.transformer.getAssets(features);
      if (assets.styles) api.loadCSS(assets.styles);
      if (assets.scripts) await api.loadJS(assets.scripts);
      features.forEach((key) => enabledFeatures.add(key));
      if (resources.disposed || !element.isConnected) return;
      await state.instance.setData(result.root, api.deriveOptions(result.frontmatter?.markmap));
      if (resources.disposed || !element.isConnected) return;
      await state.instance.fit();
      if (!resources.disposed && element.isConnected) element.dataset["processed"] = "true";
    } catch (error) {
      if (resources.disposed || !element.isConnected) return;
      states.get(element)?.instance.destroy();
      states.delete(element);
      element.textContent = source;
      element.classList.add("vditor-reset--error");
      console.error("[Vditor] Markmap rendering failed; source preserved.", error);
    }
  };
}
