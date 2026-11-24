import type { ThemeConfig } from "./config";
import { prefersReducedMotion } from "./dom";

const scriptLoads = new Map<string, Promise<void>>();
const pendingFadeOuts = new WeakMap<HTMLElement, () => void>();

export function loadScript(
  url: string,
  attributes: Readonly<Record<`data-${string}`, string>> = {},
): Promise<void> {
  const absolute = new URL(url, window.location.href).href;
  let existing = Array.from(document.scripts).find((script) => script.src === absolute);
  if (existing?.dataset["loaded"] === "error") {
    existing.remove();
    existing = undefined;
  }
  // Script bundles can inspect data attributes while executing (e.g. Prism's data-manual).
  // Apply them before attaching a new script or waiting for an existing pending request.
  if (existing) {
    for (const [name, value] of Object.entries(attributes)) existing.setAttribute(name, value);
  }
  if (existing?.dataset["loaded"] === "true") return Promise.resolve();
  const pending = scriptLoads.get(absolute);
  if (pending) return pending;
  const promise = new Promise<void>((resolve, reject) => {
    const script = existing ?? document.createElement("script");
    for (const [name, value] of Object.entries(attributes)) script.setAttribute(name, value);
    script.src = absolute;
    script.async = true;
    script.addEventListener(
      "load",
      () => {
        script.dataset["loaded"] = "true";
        resolve();
      },
      { once: true },
    );
    script.addEventListener(
      "error",
      () => {
        script.dataset["loaded"] = "error";
        if (!existing) script.remove();
        reject(new Error(`Failed to load ${absolute}.`));
      },
      { once: true },
    );
    if (!existing) document.head.append(script);
  });
  scriptLoads.set(absolute, promise);
  void promise.catch(() => scriptLoads.delete(absolute));
  return promise;
}

export function loadStyle(url: string, id?: string): Promise<void> {
  const absolute = new URL(url, window.location.href).href;
  const existing = Array.from(document.styleSheets).find(
    (sheet) => sheet.href === absolute,
  )?.ownerNode;
  if (existing instanceof HTMLLinkElement) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = absolute;
    if (id) link.id = id;
    link.addEventListener("load", () => resolve(), { once: true });
    link.addEventListener("error", () => reject(new Error(`Failed to load ${absolute}.`)), {
      once: true,
    });
    document.head.append(link);
  });
}

let snackbarTimer: number | undefined;

export function snackbarShow(
  text: string,
  action: false | ((element: HTMLElement) => void) = false,
  duration = 2_000,
  actionText: false | string = false,
): void {
  const config = (window.GLOBAL_CONFIG as ThemeConfig | undefined)?.Snackbar;
  const colorKey = document.documentElement.dataset["theme"] === "light" ? "bgLight" : "bgDark";
  document.documentElement.style.setProperty("--heo-snackbar-time", `${duration}ms`);
  window.clearTimeout(snackbarTimer);
  document.querySelector("#hanlo-snackbar")?.remove();

  const container = document.createElement("div");
  container.id = "hanlo-snackbar";
  container.className = "snackbar-container snackbar-css";
  container.setAttribute("role", "status");
  container.setAttribute("aria-live", "polite");
  container.dataset["position"] =
    config?.position === "top-center" ? "top-center" : "bottom-center";
  container.style.backgroundColor = String(config?.[colorKey] ?? "");

  const message = document.createElement("p");
  message.textContent = text;
  container.append(message);
  if (action && actionText) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "action";
    button.textContent = actionText;
    button.addEventListener("click", () => action(container), { once: true });
    container.append(button);
  }
  document.body.append(container);
  requestAnimationFrame(() => container.classList.add("show"));
  snackbarTimer = window.setTimeout(() => {
    container.classList.remove("show");
    window.setTimeout(() => container.remove(), 220);
  }, duration);
}

export function fadeIn(element: HTMLElement, seconds: number): void {
  pendingFadeOuts.get(element)?.();
  pendingFadeOuts.delete(element);
  element.style.display = "block";
  element.style.animation = prefersReducedMotion() ? "" : `to_show ${seconds}s`;
}

export function fadeOut(element: HTMLElement, seconds: number): void {
  pendingFadeOuts.get(element)?.();
  pendingFadeOuts.delete(element);
  if (prefersReducedMotion()) {
    element.style.display = "none";
    element.style.animation = "";
    return;
  }
  const finish = () => {
    element.removeEventListener("animationend", finish);
    pendingFadeOuts.delete(element);
    element.style.display = "none";
    element.style.animation = "";
  };
  const cancel = () => {
    element.removeEventListener("animationend", finish);
  };
  pendingFadeOuts.set(element, cancel);
  element.addEventListener("animationend", finish, { once: true });
  element.style.animation = `to_hide ${seconds}s`;
}

export function sidebarPaddingRight(): void {
  const padding = window.innerWidth - document.body.clientWidth;
  if (padding > 0) document.body.style.paddingRight = `${padding}px`;
}

export function syncThemeColor(): void {
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) return;
  const htmlType = (window.GLOBAL_CONFIG as ThemeConfig | undefined)?.htmlType;
  const isPost = htmlType === "post";
  const property = isPost && window.scrollY === 0 ? "--heo-main" : "--heo-background";
  const color = getComputedStyle(document.documentElement).getPropertyValue(property).trim();
  if (color) meta.content = color;
}

export function downloadImage(source: string, name = "photo"): void {
  const image = new Image();
  image.crossOrigin = "anonymous";
  image.addEventListener(
    "load",
    () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext("2d");
      if (!context) return;
      try {
        context.drawImage(image, 0, 0);
        const link = document.createElement("a");
        link.download = name;
        link.href = canvas.toDataURL("image/png");
        link.click();
      } catch {
        snackbarShow("图片下载失败，可能受跨域策略限制");
      }
    },
    { once: true },
  );
  image.addEventListener(
    "error",
    () => {
      snackbarShow("图片下载失败，请尝试在新窗口打开后保存");
    },
    { once: true },
  );
  image.src = source;
}
