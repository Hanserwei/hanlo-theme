import { describe, expect, it } from "vitest";

import { normalizeLanguage, normalizeTheme } from "../../src/js/features/shiki";

describe("Shiki normalization", () => {
  it("normalizes legacy language aliases and unknown languages", () => {
    const languages = { cpp: {}, markdown: {} };
    expect(normalizeLanguage("c++", languages)).toBe("cpp");
    expect(normalizeLanguage("md", languages)).toBe("markdown");
    expect(normalizeLanguage("unknown", languages)).toBe("text");
  });

  it("normalizes legacy themes and falls back by mode", () => {
    const themes = { "one-dark-pro": {}, "one-light": {} };
    expect(normalizeTheme("one-dark", "dark", themes)).toBe("one-dark-pro");
    expect(normalizeTheme("missing", "light", themes)).toBe("one-light");
  });
});
