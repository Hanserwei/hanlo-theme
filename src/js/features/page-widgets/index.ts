import type { ThemeConfig } from "../../core/config";
import type { PageResourceScope } from "../../core/resource-scope";
import type { PageControllerDefinition } from "../../core/types";
import { loadScript } from "../../core/ui";

interface GreetingItem {
  readonly greeting: string;
  readonly start: number;
  readonly end: number;
}

interface TypedConstructor {
  new (selector: string, options: Readonly<Record<string, unknown>>): { destroy(): void };
}

interface GsapApi {
  set(target: string, options: Readonly<Record<string, unknown>>): void;
  to(target: string, options: Readonly<Record<string, unknown>>): void;
  killTweensOf(target: string): void;
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

function mountFooterRuntime(config: Readonly<ThemeConfig>, resources: PageResourceScope): void {
  const runtime = config.widgets.footerRuntime;
  if (!runtime.enabled || !document.querySelector("#workboard")) return;
  const started = new Date(runtime.startedAt).getTime();
  const update = () => {
    const target = document.querySelector<HTMLElement>("#workboard");
    if (!target || !Number.isFinite(started)) return;
    const now = new Date();
    const elapsed = Math.max(0, now.getTime() - started);
    const days = Math.floor(elapsed / 86_400_000);
    const hours = Math.floor((elapsed / 3_600_000) % 24)
      .toString()
      .padStart(2, "0");
    const minutes = Math.floor((elapsed / 60_000) % 60)
      .toString()
      .padStart(2, "0");
    const seconds = Math.floor((elapsed / 1_000) % 60)
      .toString()
      .padStart(2, "0");
    const working = now.getHours() >= 9 && now.getHours() < 18;
    const image = document.createElement("img");
    image.className = "workSituationImg boardsign";
    image.src = working ? runtime.workImage : runtime.offDutyImage;
    image.alt = image.title = working ? runtime.workDescription : runtime.offDutyDescription;
    const tip = document.createElement("div");
    tip.id = "runtimeTextTip";
    const voyagerDistance = Math.trunc(23_400_000 + (elapsed / 1_000) * 17);
    tip.append(
      document.createTextNode(`本站居然运行了 ${days} 天 `),
      Object.assign(document.createElement("span"), {
        id: "runtime",
        textContent: `${hours} 小时 ${minutes} 分 ${seconds} 秒 `,
      }),
      Object.assign(document.createElement("i"), {
        className: "haofont hao-icon-heartbeat",
      }),
      document.createElement("br"),
      document.createTextNode(
        `旅行者 1 号当前距离地球 ${voyagerDistance} 千米，约为 ${(voyagerDistance / 149_600_000).toFixed(6)} 个天文单位 🚀`,
      ),
    );
    target.replaceChildren(image, tip);
  };
  update();
  resources.interval(update, 1_000);
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
    let constructor = window.Typed;
    if (!constructor) {
      await loadScript("https://npm.elemecdn.com/typed.js@2.0.12/lib/typed.min.js");
      constructor = window.Typed;
    }
    if (!constructor || resources.disposed) return;
    const instance = new constructor("#subtitle", {
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

async function mountHelloAbout(resources: PageResourceScope): Promise<void> {
  const element = document.querySelector<HTMLElement>(".hello-about");
  if (!element) return;
  let gsap = window.gsap;
  if (!gsap) {
    await loadScript("/themes/theme-hanlo/assets/libs/gsap/gsap.min.js");
    gsap = window.gsap;
  }
  if (!gsap || resources.disposed) return;
  resources.listen(element, "mousemove", (event) => {
    const mouse = event as MouseEvent;
    gsap.set(".cursor", { x: mouse.offsetX, y: mouse.offsetY });
    gsap.to(".shape", { x: mouse.offsetX, y: mouse.offsetY, stagger: -0.1 });
  });
  resources.defer(() => {
    gsap.killTweensOf(".cursor");
    gsap.killTweensOf(".shape");
  });
}

function mountRandomTagColors(config: Readonly<ThemeConfig>): void {
  if (!config.widgets.randomTagColors) return;
  document.querySelectorAll<HTMLElement>(".card-tag-cloud .tag-item").forEach((tag) => {
    tag.style.color = `#${Math.floor(Math.random() * 0x1000000)
      .toString(16)
      .padStart(6, "0")}`;
  });
}

function mountLinkCanvas(resources: PageResourceScope): void {
  const frame = document.querySelector<HTMLIFrameElement>("#link-canvas-frame");
  const button = document.querySelector<HTMLElement>("[data-hanlo-action='refresh-link-canvas']");
  const data = document.querySelector<HTMLScriptElement>("#link-canvas-data");
  if (!frame || !button) return;
  if (data?.textContent) {
    try {
      const groups: unknown = JSON.parse(data.textContent);
      const logos = Array.isArray(groups)
        ? groups.flatMap((group) => {
            if (!isRecord(group) || !Array.isArray(group["links"])) return [];
            return group["links"].flatMap((link) => {
              if (!isRecord(link) || !isRecord(link["spec"])) return [];
              return typeof link["spec"]["logo"] === "string" ? [link["spec"]["logo"]] : [];
            });
          })
        : [];
      localStorage.setItem("logos", JSON.stringify(logos));
    } catch (error) {
      console.warn("[Hanlo] Link canvas data could not be parsed.", error);
    }
  }
  resources.listen(button, "click", () => frame.contentWindow?.location.reload());
}

export function createPageWidgetsController(): PageControllerDefinition {
  return {
    name: "page-widgets",
    create: ({ config, resources }) => ({
      mount() {
        mountDynamicTitle(config, resources);
        mountFooterRuntime(config, resources);
        mountGreeting(config, resources);
        mountTyped(config, resources);
        mountTenYear(config, resources);
        mountPursuit(resources);
        void mountHelloAbout(resources);
        mountRandomTagColors(config);
        mountLinkCanvas(resources);
        resources.timeout(() => loading(false), 3_000);
      },
      unmount() {},
    }),
  };
}

export const pageWidgetTestables = Object.freeze({ parseGreetingItems, parseTypedTexts });

declare global {
  interface Window {
    Typed?: TypedConstructor;
    gsap?: GsapApi;
  }
}
