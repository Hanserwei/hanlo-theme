import { parseFragment, type DefaultTreeAdapterMap } from "parse5";
import { afterEach, describe, expect, it, vi } from "vitest";

import { copyTextToClipboard } from "../../src/js/core/clipboard";
import type { ThemeConfig } from "../../src/js/core/config";
import { PageResourceScope } from "../../src/js/core/resource-scope";
import { createShikiController } from "../../src/js/features/shiki";

vi.mock("../../src/js/core/clipboard", () => ({ copyTextToClipboard: vi.fn(async () => true) }));
vi.mock("../../src/js/core/ui", () => ({ snackbarShow: vi.fn() }));

// Minimal event-capable DOM fixture; parse5 reads the actual HTML returned by Shiki.
class CodeElement extends EventTarget {
  readonly tagName: string;
  className = "";
  textContent = "";
  dataset: Record<string, string> = {};
  attributes = new Map<string, string>();
  children: CodeElement[] = [];
  parentElement: CodeElement | null = null;
  isConnected = true;
  replacement?: CodeElement;
  classList = {
    contains: (name: string) => this.className.split(" ").includes(name),
    add: (name: string) => {
      this.classList.toggle(name, true);
    },
    toggle: (name: string, force = !this.classList.contains(name)) => {
      const classes = new Set(this.className.split(" ").filter(Boolean));
      if (force) classes.add(name);
      else classes.delete(name);
      this.className = [...classes].join(" ");
      return force;
    },
  };

  constructor(tagName: string) {
    super();
    this.tagName = tagName.toUpperCase();
  }

  append(...nodes: CodeElement[]) {
    nodes.forEach((node) => {
      node.parentElement = this;
      this.children.push(node);
    });
  }

  setAttribute(name: string, value: string) {
    this.attributes.set(name, value);
  }
  replaceWith(node: CodeElement) {
    this.replacement = node;
  }
  matches(selector: string): boolean {
    return selector.split(",").some((part) => {
      const [tag, name] = part.trim().split(".");
      return (
        (!tag || this.tagName === tag.toUpperCase()) && (!name || this.classList.contains(name))
      );
    });
  }
  closest(selector: string): CodeElement | null {
    return this.matches(selector) ? this : (this.parentElement?.closest(selector) ?? null);
  }
  querySelectorAll(selector: string): CodeElement[] {
    return this.children.flatMap((child) => [
      ...(child.matches(selector) ? [child] : []),
      ...child.querySelectorAll(selector),
    ]);
  }
  querySelector(selector: string): CodeElement | null {
    return this.querySelectorAll(selector)[0] ?? null;
  }
}

function fromHtml(node: DefaultTreeAdapterMap["childNode"]): CodeElement {
  const element = new CodeElement(node.nodeName);
  if ("attrs" in node) {
    for (const { name, value } of node.attrs) {
      if (name === "class") element.className = value;
      element.setAttribute(name, value);
    }
  }
  if ("value" in node) element.textContent = node.value;
  if ("childNodes" in node) element.append(...node.childNodes.map(fromHtml));
  return element;
}

function text(element: CodeElement): string {
  return element.textContent + element.children.map(text).join("");
}

const scopes: PageResourceScope[] = [];
async function render(source: string, language?: string): Promise<CodeElement> {
  const pre = new CodeElement("pre");
  const code = new CodeElement("code");
  code.className = language ? `language-${language}` : "";
  code.textContent = source;
  pre.append(code);
  const documentObject = {
    createElement: (tagName: string) => new CodeElement(tagName),
    querySelectorAll: () => [code],
    querySelector: () => null,
  };
  vi.stubGlobal("document", documentObject);
  vi.stubGlobal(
    "DOMParser",
    class {
      parseFromString(html: string) {
        const root = new CodeElement("document");
        root.append(...parseFragment(html).childNodes.map(fromHtml));
        return root;
      }
    },
  );
  const resources = new PageResourceScope();
  scopes.push(resources);
  const controller = createShikiController().create({
    config: {
      shiki: {
        enable: true,
        enable_title: true,
        enable_hr: true,
        enable_line: true,
        enable_copy: true,
        enable_expander: true,
        enable_height_limit: false,
        theme_light: "one-light",
        theme_dark: "one-dark-pro",
      },
    } as unknown as ThemeConfig,
    resources,
    navigation: {
      id: 1,
      source: "initial",
      direction: "unknown",
      url: "https://example.test/post",
    },
  });
  await controller.mount(documentObject as unknown as ParentNode);
  await vi.waitFor(() => expect(pre.replacement).toBeDefined());
  return pre.replacement!;
}

afterEach(async () => {
  await Promise.all(scopes.splice(0).map((resources) => resources.dispose()));
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("Shiki code frames", () => {
  it.each(["text", "txt", "plain", "plaintext", "unknown-language", undefined])(
    "provides the same dual-theme frame, line numbers and tools for %s",
    async (language) => {
      const source = 'graph TD\n  A["<script>source</script>"] --> B\n';
      const wrapper = await render(source, language);
      expect(wrapper.classList.contains("shiki-code-block")).toBe(true);
      const pre = wrapper.querySelector("pre.shiki")!;
      expect(pre.classList.contains("line-numbers")).toBe(true);
      expect(pre.attributes.get("style")).toContain("--shiki-light-bg");
      expect(pre.attributes.get("style")).toContain("--shiki-dark-bg");
      expect(pre.querySelectorAll(".line")).toHaveLength(2);
      expect(pre.querySelector("script")).toBeNull();
      expect(text(pre)).toBe(source.slice(0, -1));
      const copy = wrapper.querySelector(".shiki-copy-button")!;
      copy.dispatchEvent(new Event("click"));
      await vi.waitFor(() => expect(copyTextToClipboard).toHaveBeenCalledWith(source));
      const collapse = wrapper.querySelector(".shiki-collapse-button")!;
      collapse.dispatchEvent(new Event("click"));
      expect(wrapper.classList.contains("is-code-collapsed")).toBe(true);
      expect(collapse.attributes.get("aria-expanded")).toBe("false");
    },
  );

  it.each([
    ["const value = 1;", 1],
    ["const value = 1;\n", 1],
    ["const value = 1;\r\n", 1],
    ["const value = 1;\r", 1],
    ["const value = 1;\n\n", 2],
    ["const value = 1;\r\n\r\n", 2],
    ["\tconst value = 1;  \n\n\n", 3],
    ["", 1],
    ["\n", 1],
  ])("renders terminators and intentional blank lines correctly: %j", async (source, lines) => {
    const wrapper = await render(source, "typescript");
    const pre = wrapper.querySelector("pre.shiki")!;
    expect(pre.querySelectorAll(".line")).toHaveLength(lines);
    if (source.startsWith("\t")) expect(text(pre)).toBe("\tconst value = 1;  \n\n");
  });
});
