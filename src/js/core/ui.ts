const scriptLoads = new Map<string, Promise<void>>();

export function loadScript(url: string): Promise<void> {
  const absolute = new URL(url, window.location.href).href;
  const existing = Array.from(document.scripts).find((script) => script.src === absolute);
  if (existing?.dataset["loaded"] === "true") return Promise.resolve();
  const pending = scriptLoads.get(absolute);
  if (pending) return pending;
  const promise = new Promise<void>((resolve, reject) => {
    const script = existing ?? document.createElement("script");
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
    script.addEventListener("error", () => reject(new Error(`Failed to load ${absolute}.`)), {
      once: true,
    });
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
  const config = window.GLOBAL_CONFIG.Snackbar;
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
  element.style.cssText = `display:block;animation:to_show ${seconds}s`;
}

export function fadeOut(element: HTMLElement, seconds: number): void {
  element.addEventListener(
    "animationend",
    () => {
      element.style.cssText = "display:none;animation:''";
    },
    { once: true },
  );
  element.style.animation = `to_hide ${seconds}s`;
}

export function sidebarPaddingRight(): void {
  const padding = window.innerWidth - document.body.clientWidth;
  if (padding > 0) document.body.style.paddingRight = `${padding}px`;
}

export function syncThemeColor(): void {
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) return;
  const isPost = window.location.pathname.includes("/archives/");
  const property = isPost && window.scrollY === 0 ? "--heo-main" : "--heo-background";
  meta.content = getComputedStyle(document.documentElement).getPropertyValue(property).trim();
}

export function downloadImage(source: string, name = "photo"): void {
  const image = new Image();
  image.crossOrigin = "anonymous";
  image.addEventListener("load", () => {
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(image, 0, 0);
    const link = document.createElement("a");
    link.download = name;
    link.href = canvas.toDataURL("image/png");
    link.click();
  });
  image.src = source;
}
