import { describe, expect, it } from "vitest";

import { normalizeLanguage, normalizeTheme } from "../../src/js/features/shiki";
import { LOCAL_LANGUAGES, LOCAL_THEMES } from "../../src/js/features/shiki/registry";

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

  it("normalizes legacy themes and falls back by mode", () => {
    const themes = { "one-dark-pro": {}, "one-light": {} };
    expect(normalizeTheme("one-dark", "dark", themes)).toBe("one-dark-pro");
    expect(normalizeTheme("missing", "light", themes)).toBe("one-light");
  });
});
