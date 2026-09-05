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
    rightMenuEnable: true,
    colorScheme: "system",
    date_suffix: { just: "刚刚", min: "分钟前", hour: "小时前", day: "天前" },
    translate: {
      defaultEncoding: 2,
      translateDelay: 0,
      msgToTraditionalChinese: "繁",
      msgToSimplifiedChinese: "简",
    },
    shiki: {
      enable: true,
      enable_title: true,
      enable_hr: true,
      enable_line: true,
      enable_copy: true,
      enable_expander: true,
      height_limit: 300,
      enable_height_limit: true,
      theme_light: "one-light",
      theme_dark: "one-dark-pro",
    },
    effects: { bubble: false, universe: false },
    friends: { apiUrl: "/api/friends", pageSize: 12, errorImage: "/error.png" },
    postAi: {
      summary: "",
      randomRange: 100,
      wordLimit: 1_000,
      buttonLink: "https://example.com",
      name: "Hanlo",
      mode: "local",
      switchable: true,
      key: "",
      referer: "",
    },
    widgets: {
      dynamicTitle: { enabled: false, leave: "离开", back: "回来" },
      greeting: { enabled: false, items: [] },
      typed: { random: false, items: [] },
      tenYear: { startedAt: "2023-01-01", endedAt: "2033-01-01" },
      randomTagColors: false,
    },
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

  it("validates configuration consumed by migrated feature controllers", () => {
    const config = createConfig();
    Object.assign(config.shiki, { enable_copy: "yes" });

    expect(() => parseThemeConfig(config)).toThrow(
      "GLOBAL_CONFIG.shiki.enable_copy must be a boolean",
    );
  });
});
