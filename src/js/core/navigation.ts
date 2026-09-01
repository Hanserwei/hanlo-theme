import Pjax from "pjax";

import { isEligiblePrefetch } from "./prefetch";

const PJAX_SELECTORS = [
  "title",
  "#config-diff",
  "#body-wrap",
  "#rightside-config-hide",
  "#rightside-config-show",
  ".js-pjax",
  "#site-config",
  'meta[property="og:type"]',
  'meta[property="og:image"]',
  'meta[property="og:title"]',
  'meta[property="og:url"]',
  'meta[property="og:description"]',
  'meta[name="twitter:title"]',
  'meta[name="twitter:url"]',
  'meta[name="twitter:description"]',
  'meta[name="twitter:image"]',
] as const;

function ensureProgress(): HTMLElement {
  let progress = document.querySelector<HTMLElement>("#hanlo-navigation-progress");
  if (progress) return progress;
  progress = document.createElement("div");
  progress.id = "hanlo-navigation-progress";
  progress.setAttribute("role", "progressbar");
  progress.setAttribute("aria-label", "页面加载进度");
  progress.setAttribute("aria-hidden", "true");
  document.body.append(progress);
  return progress;
}

let progressGeneration = 0;
let progressAdvanceTimer: number | undefined;
let progressResetTimer: number | undefined;

function showProgress(): void {
  const generation = ++progressGeneration;
  window.clearTimeout(progressAdvanceTimer);
  window.clearTimeout(progressResetTimer);
  const progress = ensureProgress();
  progress.classList.remove("complete");
  progress.classList.add("active");
  progress.style.setProperty("--hanlo-progress", "35%");
  progressAdvanceTimer = window.setTimeout(() => {
    if (generation === progressGeneration && progress.classList.contains("active")) {
      progress.style.setProperty("--hanlo-progress", "82%");
    }
  }, 180);
}

function completeProgress(): void {
  const generation = ++progressGeneration;
  window.clearTimeout(progressAdvanceTimer);
  window.clearTimeout(progressResetTimer);
  const progress = document.querySelector<HTMLElement>("#hanlo-navigation-progress");
  if (!progress) return;
  progress.style.setProperty("--hanlo-progress", "100%");
  progress.classList.add("complete");
  progressResetTimer = window.setTimeout(() => {
    if (generation !== progressGeneration) return;
    progress.classList.remove("active", "complete");
    progress.style.removeProperty("--hanlo-progress");
  }, 240);
}

function runOptionalGlobal(name: string, ...arguments_: unknown[]): void {
  const callback = (window as unknown as Record<string, unknown>)[name];
  if (typeof callback === "function") Reflect.apply(callback, window, arguments_);
}

export function installPjaxNavigation(): void {
  if (window.pjax) return;

  window.pjax = new Pjax({
    elements: 'a:not([target="_blank"]):not([download])',
    selectors: PJAX_SELECTORS.filter((selector) => document.querySelector(selector)),
    cacheBust: false,
    analytics: false,
    scrollRestoration: false,
    scrollTo: false,
  });

  document.addEventListener("pjax:send", () => {
    document.querySelector("#loading-box")?.classList.remove("loaded");
    document.body.classList.remove("read-mode");
    showProgress();
  });

  document.addEventListener("pjax:complete", () => {
    runOptionalGlobal("chatBtnFn");
    runOptionalGlobal("gtag", "config", "", { page_path: window.location.pathname });
    const baidu = (window as unknown as { _hmt?: { push(value: unknown): void } })._hmt;
    baidu?.push(["_trackPageview", window.location.pathname]);
    document.querySelector("#loading-box")?.classList.add("loaded");
    completeProgress();
  });

  document.addEventListener("pjax:error", completeProgress);
}

function eligibleLink(target: EventTarget | null): HTMLAnchorElement | undefined {
  const link = target instanceof Element ? target.closest<HTMLAnchorElement>("a[href]") : null;
  if (!link || link.target === "_blank" || link.hasAttribute("download")) return undefined;
  if (link.dataset["noPrefetch"] !== undefined || link.rel.split(/\s+/).includes("external")) {
    return undefined;
  }
  return isEligiblePrefetch({
    currentUrl: window.location.href,
    href: link.href,
    target: link.target,
    download: link.hasAttribute("download"),
    external: link.rel.split(/\s+/).includes("external"),
    noPrefetch: link.dataset["noPrefetch"] !== undefined,
  })
    ? link
    : undefined;
}

export function installInternalLinkPrefetch(): void {
  const prefetched = new Set<string>();
  let pending: number | undefined;

  const prefetch = (target: EventTarget | null): void => {
    const link = eligibleLink(target);
    if (!link || prefetched.has(link.href)) return;
    prefetched.add(link.href);
    const hint = document.createElement("link");
    hint.rel = "prefetch";
    hint.href = link.href;
    hint.as = "document";
    document.head.append(hint);
  };

  document.addEventListener(
    "pointerover",
    (event) => {
      window.clearTimeout(pending);
      pending = window.setTimeout(() => prefetch(event.target), 80);
    },
    { passive: true },
  );
  document.addEventListener("pointerout", () => window.clearTimeout(pending), { passive: true });
  document.addEventListener("touchstart", (event) => prefetch(event.target), { passive: true });
}
