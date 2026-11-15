import { readFileSync } from "node:fs";
import path from "node:path";

import { parseHTML } from "linkedom";
import postcss from "postcss";
import selectorParser, { type Node as SelectorNode } from "postcss-selector-parser";
import { describe, expect, it } from "vitest";

import { getLocalHighlighter } from "../../src/js/features/shiki/local";

// Check the actual authored cascade, including every main stylesheet import and the two
// conditional entries used on this article. A standalone Shiki CSS test misses override layers.
const cssRoot = path.resolve("src/css");
const index = readFileSync(path.join(cssRoot, "index.css"), "utf8");
const layers = index
  .match(/@layer ([^;]+);/)![1]!
  .split(",")
  .map((name) => name.trim());
const sources = [
  ...Array.from(
    index.matchAll(/@import "(\.\/.+?\.css)" layer\(([^)]+)\)/g),
    ([, file, layer]) => ({ file: path.resolve(cssRoot, file!), layer: layer! }),
  ),
  { file: path.join(cssRoot, "components/shiki.css"), layer: "components" },
  { file: path.join(cssRoot, "components/post-copyright.css"), layer: "components" },
];
interface Rule {
  selector: string;
  layer: number;
  order: number;
  property: string;
  value: string;
  weight: number;
}
function specificity(nodes: SelectorNode[]): number {
  return nodes.reduce((sum, node) => {
    if (node.type === "id") return sum + 1_000_000;
    if (node.type === "class" || node.type === "attribute") return sum + 1_000;
    if (node.type === "tag") return sum + 1;
    if (node.type === "pseudo") {
      if (node.value === ":where") return sum;
      if ([":is", ":not", ":has"].includes(node.value)) {
        return (
          sum + Math.max(0, ...(node.nodes ?? []).map((selector) => specificity(selector.nodes)))
        );
      }
      return (
        sum +
        (node.value.startsWith("::") || [":before", ":after"].includes(node.value) ? 1 : 1_000)
      );
    }
    return sum;
  }, 0);
}
const rules: Rule[] = [];
for (const { file, layer } of sources) {
  postcss.parse(readFileSync(file, "utf8"), { from: file }).walkRules((rule) => {
    const relevant = rule.nodes.filter(
      (node) =>
        node.type === "decl" &&
        ["background", "background-color", "color", "font-family", "content"].includes(node.prop),
    );
    if (!relevant.length) return;
    for (const selector of selectorParser().astSync(rule.selector).nodes) {
      for (const declaration of relevant) {
        if (declaration.type !== "decl") continue;
        rules.push({
          selector: selector.toString(),
          layer: layers.indexOf(layer),
          order: rules.length,
          property: declaration.prop,
          value: declaration.value,
          weight: specificity(selector.nodes),
        });
      }
    }
  });
}
function winningValue(element: Element, property: string, pseudo?: "after"): string | undefined {
  const matches = rules
    .filter((rule) => {
      if (
        rule.property !== property &&
        !(property === "background-color" && rule.property === "background")
      )
        return false;
      let selector = rule.selector;
      if (pseudo) {
        if (!/::?after$/.test(selector)) return false;
        selector = selector.replace(/::?after$/, "");
      } else if (/::|:(before|after)\b/.test(selector)) return false;
      try {
        return element.matches(selector);
      } catch {
        return false;
      }
    })
    .sort((a, b) => a.layer - b.layer || a.weight - b.weight || a.order - b.order);
  return matches.at(-1)?.value;
}

describe("article rendering CSS contracts", () => {
  const pairs = [
    ["one-light", "one-dark-pro"],
    ["github-light", "github-dark"],
    ["light-plus", "dark-plus"],
  ];
  it.each(pairs)(
    "keeps %s / %s backgrounds paired with their actual token colors in the complete cascade",
    async (light, dark) => {
      const highlighter = await getLocalHighlighter("java");
      const html = highlighter.codeToHtml('System.out.println("Hello");', {
        lang: "java",
        themes: { light, dark },
        defaultColor: false,
      });
      for (const lang of ["zh-Hans", "zh-Hant"]) {
        for (const [mode, theme] of [
          ["light", light],
          ["dark", dark],
        ]) {
          for (const container of ["article-container", "post-comment"]) {
            const { document } = parseHTML(
              `<html lang="${lang}" data-theme="${mode}"><body><article id="post"><div id="${container}"><div class="shiki-code-block">${html}</div></div></article></body></html>`,
            );
            const pre = document.querySelector("pre")!;
            // The runtime adds this language class after codeToHtml; it triggered the legacy rule.
            pre.classList.add("language-java");
            const background = winningValue(pre as unknown as Element, "background-color");
            const foreground = winningValue(pre as unknown as Element, "color");
            expect(background, `${container}/${lang}/${mode}`).toBe(`var(--shiki-${mode}-bg)`);
            expect(foreground).toBe(`var(--shiki-${mode})`);
            expect(pre.style.getPropertyValue(`--shiki-${mode}-bg`).toLowerCase()).toBe(
              highlighter.getTheme(theme!).bg.toLowerCase(),
            );
          }
        }
      }
    },
  );

  it.each(["zh-Hans", "zh-Hant"])(
    "uses a shipped copyright font and a real glyph under %s",
    (lang) => {
      const { document } = parseHTML(
        `<html lang="${lang}"><body><article id="post"><div class="post-copyright"></div></article></body></html>`,
      );
      const element = document.querySelector(".post-copyright")! as unknown as Element;
      const font = winningValue(element, "font-family", "after")!.replaceAll('"', "");
      const content = winningValue(element, "content", "after")!;
      const glyph = Number.parseInt(content.match(/\\([\da-f]+)/i)![1]!, 16);
      const fontCss = postcss.parse(readFileSync("public/assets/icon/iconfont.css", "utf8"));
      let face = false;
      fontCss.walkAtRules("font-face", (rule) => {
        rule.walkDecls("font-family", (declaration) => {
          if (declaration.value.replaceAll('"', "") === font) face = true;
        });
      });
      expect(face, `font ${font} must have a bundled @font-face`).toBe(true);
      const svg = readFileSync("public/assets/icon/iconfont.svg", "utf8");
      expect(svg).toContain(`glyph-name="copyright" unicode="&#${glyph};"`);
    },
  );
});

describe("page style boundaries", () => {
  it("loads the about-only entry only for the about template", () => {
    const entries = JSON.parse(readFileSync("css-entries.json", "utf8")) as Record<string, string>;
    const head = readFileSync("src/modules/head.html", "utf8");
    const aboutBlock = head.match(
      /<th:block th:if="\$\{htmlType == 'about'\}">([\s\S]*?)<\/th:block>/,
    )?.[1];
    expect(aboutBlock).toBeDefined();
    expect(index).not.toContain("./pages/about.css");
    expect(aboutBlock).toContain("/css/about-");
    const root = postcss.parse(readFileSync(entries.about!, "utf8"));
    const layers = root.nodes.filter((node) => node.type !== "comment");
    expect(layers).toHaveLength(1);
    expect(layers[0]).toMatchObject({ type: "atrule", name: "layer", params: "pages" });
    const selectors: string[] = [];
    root.walkRules((rule) => {
      selectors.push(rule.selector);
    });
    expect(selectors).toEqual(
      expect.arrayContaining([
        ".hanlo-about-page",
        ".author-content-item.skills",
        ".author-content-item.game-lol",
        ".about-emotions",
        ".author-content-item.map",
      ]),
    );
    const shared = readFileSync("src/css/pages/author-content.css", "utf8");
    expect(index).toContain("./pages/author-content.css");
    expect(shared).toContain(".author-content-item .card-content");
    expect(shared).toContain(".author-content-item .author-content-item-title");
    expect(shared).toContain(".page-title");
  });

  it.each([
    ["card-music", "405px", "520px"],
    ["card-steam", "105px", "130px"],
  ])("places the mobile %s height after its base height", (selector, desktop, mobile) => {
    const css = postcss.parse(readFileSync("src/css/overrides/sidebar.css", "utf8"));
    const heights: string[] = [];
    css.walkRules(`.${selector}`, (rule) => {
      rule.walkDecls("height", (decl) => {
        heights.push(decl.value);
      });
    });
    expect(heights).toEqual([desktop, mobile]);
  });
});
