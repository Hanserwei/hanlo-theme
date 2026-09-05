import type { ThemeConfig } from "../../core/config";
import type { PageResourceScope } from "../../core/resource-scope";
import type { PageControllerDefinition } from "../../core/types";
import { mountFooterRecords } from "./footer-records";
import { mountProfileCards } from "./profile-card";

interface GreetingItem {
  readonly greeting: string;
  readonly start: number;
  readonly end: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseGreetingItems(values: readonly unknown[]): GreetingItem[] {
  return values.flatMap((value) => {
    if (!isRecord(value)) return [];
    const source = isRecord(value["realNode"]) ? value["realNode"] : value;
    const greeting = source["greeting"];
    const start = Number(source["start_time"]);
    const end = Number(source["end_time"]);
    return typeof greeting === "string" && Number.isFinite(start) && Number.isFinite(end)
      ? [{ greeting, start, end }]
      : [];
  });
}

function parseTypedTexts(values: readonly unknown[]): string[] {
  return values.flatMap((value) => {
    if (typeof value === "string") return [value];
    if (!isRecord(value)) return [];
    const source = isRecord(value["realNode"]) ? value["realNode"] : value;
    return typeof source["text"] === "string" ? [source["text"]] : [];
  });
}

function loading(visible: boolean): void {
  document.querySelector("#loading-box")?.classList.toggle("loaded", !visible);
}

function mountDynamicTitle(config: Readonly<ThemeConfig>, resources: PageResourceScope): void {
  if (!config.widgets.dynamicTitle.enabled) return;
  const origin = document.title;
  let restore: ReturnType<typeof setTimeout> | undefined;
  resources.listen(document, "visibilitychange", () => {
    if (document.hidden) {
      document.title = config.widgets.dynamicTitle.leave;
      if (restore) clearTimeout(restore);
      return;
    }
    document.title = `${config.widgets.dynamicTitle.back}${origin}`;
    restore = resources.timeout(() => {
      document.title = origin;
    }, 2_000);
  });
  resources.defer(() => {
    if (restore) clearTimeout(restore);
    document.title = origin;
  });
}

function mountGreeting(config: Readonly<ThemeConfig>, resources: PageResourceScope): void {
  const box = document.querySelector<HTMLElement>("#greetingBox");
  if (!box || !config.widgets.greeting.enabled) return;
  const defaults: GreetingItem[] = [
    { greeting: "晚安😴", start: 0, end: 5 },
    { greeting: "早上好鸭👋, 祝你一天好心情！", start: 6, end: 9 },
    { greeting: "上午好👋, 状态很好，鼓励一下～", start: 10, end: 10 },
    { greeting: "11点多啦, 再坚持一下就吃饭啦～", start: 11, end: 11 },
    { greeting: "午安👋", start: 12, end: 14 },
    { greeting: "🌈充实的一天辛苦啦！", start: 15, end: 18 },
    { greeting: "19点喽, 奖励一顿丰盛的大餐吧🍔。", start: 19, end: 19 },
    { greeting: "晚上好👋, 在属于自己的时间好好放松😌~", start: 20, end: 24 },
  ];
  const configured = parseGreetingItems(config.widgets.greeting.items);
  const hour = new Date().getHours();
  const message = (configured.length > 0 ? configured : defaults).find(
    (item) => hour >= item.start && hour <= item.end,
  )?.greeting;
  const element = document.createElement("div");
  element.id = "greeting";
  element.textContent = message ?? "晚上好👋";
  box.append(element);
  resources.timeout(() => element.classList.add("shown"), 1_000);
  resources.timeout(() => {
    element.classList.remove("shown");
    resources.timeout(() => box.remove(), 500);
  }, 3_000);
}

function mountTyped(config: Readonly<ThemeConfig>, resources: PageResourceScope): void {
  if (!document.querySelector("#subtitle")) return;
  const texts = parseTypedTexts(config.widgets.typed.items);
  const initialize = async () => {
    let strings = texts;
    if (config.widgets.typed.random) {
      try {
        const response = await fetch("https://v1.hitokoto.cn", { signal: resources.signal });
        const result: unknown = await response.json();
        if (isRecord(result) && typeof result["hitokoto"] === "string") {
          strings = [
            ...texts,
            result["hitokoto"],
            typeof result["from"] === "string" ? `出自 ${result["from"]}` : "",
          ].filter(Boolean);
        }
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          console.warn("[Hanlo] Hitokoto request failed; using configured text.", error);
        }
      }
    }
    if (resources.disposed || !document.querySelector("#subtitle")) return;
    const { default: Typed } = await import("typed.js");
    if (resources.disposed) return;
    const instance = new Typed("#subtitle", {
      strings,
      startDelay: 300,
      typeSpeed: 100,
      loop: true,
      backSpeed: 50,
    });
    resources.track(instance, (value) => value.destroy());
  };
  resources.timeout(() => void initialize(), 1_800);
}

function mountTenYear(config: Readonly<ThemeConfig>, resources: PageResourceScope): void {
  const progress = document.querySelector<HTMLElement>(".progress");
  const past = document.querySelector<HTMLElement>(".past-time");
  const label = document.querySelector<HTMLElement>(".percentage-label");
  const start = document.querySelector<HTMLElement>(".start-time");
  const end = document.querySelector<HTMLElement>(".end-time");
  if (!progress || !past || !label || !start || !end) return;
  const started = new Date(config.widgets.tenYear.startedAt).getTime();
  const ended = new Date(config.widgets.tenYear.endedAt).getTime();
  const percentage = ((Date.now() - started) / (ended - started)) * 100;
  const clamped = Math.max(0, Math.min(100, percentage));
  past.style.setProperty("--past-time-percentage", `${clamped}%`);
  progress.style.setProperty("--progress-percentage", `${clamped}%`);
  label.textContent =
    percentage < 10 ? "" : percentage <= 100 ? `${percentage.toFixed(0)}%` : "已达标";
  label.style.left = `calc(${clamped}% - 3rem)`;
  start.textContent = new Date(started).toLocaleDateString();
  end.textContent = new Date(ended).toLocaleDateString();
  resources.timeout(() => {
    label.style.visibility = "visible";
  }, 2_500);
}

function mountPursuit(resources: PageResourceScope): void {
  if (!document.querySelector(".aboutsiteTips span")) return;
  resources.interval(() => {
    const shown = document.querySelector<HTMLElement>("span[data-show]");
    if (!shown) return;
    const next = shown.nextElementSibling ?? document.querySelector(".first-tips");
    document.querySelector("span[data-up]")?.removeAttribute("data-up");
    shown.removeAttribute("data-show");
    shown.setAttribute("data-up", "");
    next?.setAttribute("data-show", "");
  }, 2_000);
}

function mountHelloAbout(resources: PageResourceScope): void {
  const element = document.querySelector<HTMLElement>(".hello-about");
  const cursor = element?.querySelector<HTMLElement>(".cursor");
  const shapes = element?.querySelectorAll<HTMLElement>(".shape");
  if (!element || !cursor || !shapes || shapes.length === 0) return;
  const reset = (): void => {
    cursor.style.removeProperty("transform");
    shapes.forEach((shape) => shape.style.removeProperty("transform"));
  };
  resources.listen(element, "pointermove", (event) => {
    const pointer = event as PointerEvent;
    if (pointer.pointerType === "touch") return;
    const bounds = element.getBoundingClientRect();
    const x = pointer.clientX - bounds.left;
    const y = pointer.clientY - bounds.top;
    cursor.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    shapes.forEach((shape, index) => {
      const lag = 1 - index * 0.035;
      shape.style.transform = `translate3d(${x * lag}px, ${y * lag}px, 0)`;
    });
  });
  resources.listen(element, "pointerleave", reset);
  resources.defer(reset);
}

function mountRandomTagColors(config: Readonly<ThemeConfig>): void {
  if (!config.widgets.randomTagColors) return;
  document.querySelectorAll<HTMLElement>(".card-tag-cloud .tag-item").forEach((tag) => {
    tag.style.color = `#${Math.floor(Math.random() * 0x1000000)
      .toString(16)
      .padStart(6, "0")}`;
  });
}

async function mountRecentCommentPreviews(resources: PageResourceScope): Promise<void> {
  if (!document.querySelector("[data-hanlo-comment-preview]")) return;
  const { mountCommentPreviews } = await import("./comment-preview");
  if (!resources.disposed) mountCommentPreviews(document);
}

async function mountLinkCanvas(resources: PageResourceScope): Promise<void> {
  if (!document.querySelector("#link-canvas")) return;
  const { mountLinkCanvas: mount } = await import("../link-canvas");
  if (!resources.disposed) mount(resources);
}

export function createPageWidgetsController(): PageControllerDefinition {
  return {
    name: "page-widgets",
    create: ({ config, resources }) => ({
      mount() {
        mountDynamicTitle(config, resources);
        mountFooterRecords(resources);
        mountProfileCards(config, resources);
        mountGreeting(config, resources);
        mountTyped(config, resources);
        mountTenYear(config, resources);
        mountPursuit(resources);
        mountHelloAbout(resources);
        mountRandomTagColors(config);
        void mountRecentCommentPreviews(resources);
        void mountLinkCanvas(resources);
        resources.timeout(() => loading(false), 3_000);
      },
      unmount() {},
    }),
  };
}

export const pageWidgetTestables = Object.freeze({
  parseGreetingItems,
  parseTypedTexts,
});
