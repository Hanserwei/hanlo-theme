import { describe, expect, it } from "vitest";

import { parseThemeConfig } from "../../src/js/core/config";

function createConfig() {
  return {
    htmlType: "index",
    postTitle: "",
    isPost: false,
    isHome: true,
    lazyload: { enable: true, error: "/error.png" },
    loadingBox: true,
    loadProgressBar: false,
    rightMenuEnable: true,
    source: { post: { dynamicBackground: false } },
  };
}

describe("parseThemeConfig", () => {
  it("validates and deeply freezes the Thymeleaf configuration", () => {
    const config = parseThemeConfig(createConfig());

    expect(config.htmlType).toBe("index");
    expect(Object.isFrozen(config)).toBe(true);
    expect(Object.isFrozen(config.lazyload)).toBe(true);
    expect(Object.isFrozen(config.source)).toBe(true);
    expect(Object.isFrozen(config.source["post"] as object)).toBe(true);
  });

  it("rejects an invalid configuration before controllers mount", () => {
    const config = createConfig();
    Object.assign(config, { isPost: "false" });

    expect(() => parseThemeConfig(config)).toThrow("GLOBAL_CONFIG.isPost must be a boolean");
  });
});
