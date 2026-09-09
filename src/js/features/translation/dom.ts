import type { TextConversion } from "./state";

// Code and renderer-owned DOM must stay faithful to their source. Diagram controllers convert
// their original input and rerender; rewriting a canvas or an external SVG cannot update it.
const EXCLUDED = [
  "script",
  "style",
  "noscript",
  "template",
  "pre",
  "code",
  "kbd",
  "samp",
  "textarea",
  "svg",
  "math",
  "mjx-container",
  ".katex",
  ".shiki-code-block",
  ".hanlo-vditor-block",
  ".language-math",
  ".language-mermaid",
  ".language-echarts",
  ".language-mindmap",
  ".language-markmap",
  ".language-abc",
  ".language-graphviz",
  ".language-flowchart",
  ".language-plantuml",
  '[translate="no"]',
  ".notranslate",
  ".ignore-opencc",
  '[contenteditable]:not([contenteditable="false"])',
  "#translateLink",
  "#menu-translate",
].join(",");
const TEXT_ATTRIBUTES = ["title", "alt", "placeholder", "aria-label", "aria-description"];
interface OriginalText {
  original: string;
  displayed: string;
}

function updateOriginal(value: string, previous?: OriginalText): OriginalText {
  return previous && value === previous.displayed
    ? previous
    : { original: value, displayed: value };
}

export class ChineseDomTranslation {
  readonly #text = new WeakMap<Text, OriginalText>();
  readonly #attributes = new WeakMap<Element, Map<string, OriginalText>>();

  apply(root: Node, convert: TextConversion): void {
    const parent = root.nodeType === 1 ? (root as Element) : root.parentElement;
    if (parent?.closest(EXCLUDED)) return;
    if (root.nodeType === 3) {
      const node = root as Text;
      const state = updateOriginal(node.data, this.#text.get(node));
      state.displayed = convert(state.original);
      this.#text.set(node, state);
      if (node.data !== state.displayed) node.data = state.displayed;
      return;
    }
    if (root.nodeType === 1) {
      const element = root as Element;
      const attributes = this.#attributes.get(element) ?? new Map<string, OriginalText>();
      for (const name of TEXT_ATTRIBUTES) {
        const value = element.getAttribute(name);
        if (value === null) continue;
        const state = updateOriginal(value, attributes.get(name));
        state.displayed = convert(state.original);
        attributes.set(name, state);
        if (value !== state.displayed) element.setAttribute(name, state.displayed);
      }
      this.#attributes.set(element, attributes);
    }
    root.childNodes.forEach((child) => this.apply(child, convert));
  }
}
