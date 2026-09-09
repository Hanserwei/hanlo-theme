import { describe, expect, it } from "vitest";

import { normalizeLanguage, normalizeTheme } from "../../src/js/features/shiki";
import { getLocalHighlighter } from "../../src/js/features/shiki/local";
import { LOCAL_LANGUAGES, LOCAL_THEMES } from "../../src/js/features/shiki/registry";
import { isDiagramLanguage } from "../../src/js/features/vditor/languages";

describe("Shiki normalization", () => {
  it("normalizes legacy language aliases and unknown languages", () => {
    const languages = { cpp: {}, markdown: {} };
    expect(normalizeLanguage("c++", languages)).toBe("cpp");
    expect(normalizeLanguage("md", languages)).toBe("markdown");
    expect(normalizeLanguage("unknown", languages)).toBe("text");
  });

  it("classifies unsupported and plain code before the highlighter module is needed", () => {
    expect(normalizeLanguage("js", LOCAL_LANGUAGES)).toBe("javascript");
    expect(normalizeLanguage("brainfuck", LOCAL_LANGUAGES)).toBe("text");
    expect(normalizeLanguage("plaintext", LOCAL_LANGUAGES)).toBe("text");
    expect(normalizeTheme("one-dark-pro", "dark", LOCAL_THEMES)).toBe("one-dark-pro");
  });

  it("recognizes the full registry and official aliases without treating XML as HTML", () => {
    expect(LOCAL_LANGUAGES).toHaveLength(242);
    for (const [input, expected] of Object.entries({
      rs: "rust",
      go: "go",
      "F#": "fsharp",
      zsh: "shellscript",
      yml: "yaml",
      xml: "xml",
      c: "c",
    })) {
      expect(normalizeLanguage(input, LOCAL_LANGUAGES)).toBe(expected);
    }
    expect(normalizeLanguage("constructor", {})).toBe("text");
  });

  it("keeps Vditor's renderers out of the code highlighter", () => {
    for (const language of [
      "math",
      "mermaid",
      "mindmap",
      "echarts",
      "abc",
      "graphviz",
      "plantuml",
      "flowchart",
      "markmap",
    ]) {
      expect(isDiagramLanguage(language)).toBe(true);
    }
    expect(isDiagramLanguage("javascript")).toBe(false);
    expect(isDiagramLanguage("rust")).toBe(false);
  });

  it("loads only requested grammars, shares concurrent loads and escapes source markup", async () => {
    const [first, second] = await Promise.all([
      getLocalHighlighter("rust"),
      getLocalHighlighter("rust"),
    ]);
    expect(first).toBe(second);
    expect(first.getLoadedLanguages()).toContain("rust");
    expect(first.getLoadedLanguages()).not.toContain("cobol");
    const html = first.codeToHtml('<script>alert("hi")</script>', {
      lang: "rust",
      themes: { light: "one-light", dark: "one-dark-pro" },
      defaultColor: false,
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&#x3C;");
    expect(html).toContain("--shiki-dark");
    expect(html).toContain("--shiki-light");
  });

  it("can initialize and tokenize every bundled language with Oniguruma", async () => {
    for (const language of LOCAL_LANGUAGES) {
      const highlighter = await getLocalHighlighter(language);
      expect(highlighter.getLoadedLanguages(), language).toContain(language);
      expect(
        highlighter.codeToHtml("hello = 1", { lang: language, theme: "one-light" }),
        language,
      ).toContain('class="shiki');
    }
  }, 60_000);

  it("normalizes legacy themes and falls back by mode", () => {
    const themes = { "one-dark-pro": {}, "one-light": {} };
    expect(normalizeTheme("one-dark", "dark", themes)).toBe("one-dark-pro");
    expect(normalizeTheme("missing", "light", themes)).toBe("one-light");
  });
});
