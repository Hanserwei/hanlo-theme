import { describe, expect, it, vi } from "vitest";

import { parseThemeConfig } from "../../src/js/core/config";
import { PageControllerRegistry } from "../../src/js/core/registry";
import type { NavigationContext } from "../../src/js/core/types";

const config = parseThemeConfig({
  htmlType: "index",
  postTitle: "",
  isPost: false,
  isHome: true,
  lazyload: { enable: false, error: "" },
  loadingBox: false,
  rightMenuEnable: false,
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
    footerRuntime: {
      enabled: false,
      startedAt: "2023-08-05",
      workImage: "",
      workDescription: "",
      offDutyImage: "",
      offDutyDescription: "",
    },
    greeting: { enabled: false, items: [] },
    typed: { random: false, items: [] },
    tenYear: { startedAt: "2023-01-01", endedAt: "2033-01-01" },
    randomTagColors: false,
  },
  source: {},
});

const navigation: NavigationContext = {
  id: 1,
  source: "initial",
  direction: "unknown",
  url: "https://example.test/",
};

describe("PageControllerRegistry", () => {
  it("keeps exactly one mounted controller generation", async () => {
    const registry = new PageControllerRegistry();
    const eventTarget = new EventTarget();
    const mount = vi.fn();
    const unmount = vi.fn();
    const listener = vi.fn();

    registry.register({
      name: "probe",
      create: ({ resources }) => ({
        mount: () => {
          mount();
          resources.listen(eventTarget, "probe", listener);
        },
        unmount,
      }),
    });

    const root = {} as ParentNode;
    const unregister = registry.register({
      name: "removable",
      create: () => ({ mount: () => undefined, unmount: () => undefined }),
    });
    await registry.mount(root, config, navigation);
    eventTarget.dispatchEvent(new Event("probe"));
    await registry.mount(root, config, navigation);
    eventTarget.dispatchEvent(new Event("probe"));

    expect(mount).toHaveBeenCalledTimes(2);
    expect(unmount).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledTimes(2);
    expect(registry.activeNames).toEqual(["probe", "removable"]);

    await unregister();
    expect(registry.activeNames).toEqual(["probe"]);

    await registry.unmount();
    eventTarget.dispatchEvent(new Event("probe"));
    expect(listener).toHaveBeenCalledTimes(2);
    expect(registry.activeNames).toEqual([]);
  });

  it("rejects duplicate controller names", () => {
    const registry = new PageControllerRegistry();
    const definition = {
      name: "duplicate",
      create: () => ({ mount: () => undefined, unmount: () => undefined }),
    };

    registry.register(definition);
    expect(() => registry.register(definition)).toThrow("already registered");
  });

  it("disposes a controller unregistered during an asynchronous mount", async () => {
    const registry = new PageControllerRegistry();
    let finishMount: (() => void) | undefined;
    const mountStarted = new Promise<void>((resolve) => {
      finishMount = resolve;
    });
    let allowMount: (() => void) | undefined;
    const mountBlocked = new Promise<void>((resolve) => {
      allowMount = resolve;
    });
    const unmount = vi.fn();
    const cleanup = vi.fn();
    const unregister = registry.register({
      name: "async-controller",
      create: ({ resources }) => ({
        mount: async () => {
          resources.defer(cleanup);
          finishMount?.();
          await mountBlocked;
        },
        unmount,
      }),
    });

    const mounting = registry.mountDefinition(
      "async-controller",
      {} as ParentNode,
      config,
      navigation,
    );
    await mountStarted;
    await unregister();
    allowMount?.();
    await mounting;

    expect(registry.activeNames).toEqual([]);
    expect(unmount).toHaveBeenCalledOnce();
    expect(cleanup).toHaveBeenCalledOnce();
  });
});
