import type { PageResourceScope } from "../../core/resource-scope";
import type { BottleScene, SceneState } from "./scene";

const CHAPTERS = ["intro", "voyage", "beacon", "treasure", "horizon", "journal"] as const;

export function mountAboutBottle(resources: PageResourceScope): void {
  const root = document.querySelector<HTMLElement>("[data-about-bottle]");
  const classic = document.querySelector<HTMLElement>("#about-page");
  const stage = root?.querySelector<HTMLElement>("[data-bottle-stage]");
  const shell = document.querySelector<HTMLElement>("[data-about-experience]");
  const status = root?.querySelector<HTMLElement>("[data-bottle-status]");
  const panel = root?.querySelector<HTMLElement>("[data-bottle-panel]");
  const panelContent = root?.querySelector<HTMLElement>("[data-bottle-panel-content]");
  if (!root || !classic || !stage || !shell || !status || !panel || !panelContent) return;
  const controls = root.querySelector<HTMLElement>("[data-bottle-controls]");
  const switchers = shell.querySelectorAll<HTMLButtonElement>("[data-about-mode]");
  const speedButton = root.querySelector<HTMLButtonElement>("[data-bottle-speed]");
  const stormButton = root.querySelector<HTMLButtonElement>("[data-bottle-storm]");
  const chapters = root.querySelectorAll<HTMLButtonElement>("[data-bottle-open]");
  let scene: BottleScene | undefined,
    pending = false,
    wanted = false,
    disposed = false,
    attempt = 0;
  const stored = () => {
    try {
      return sessionStorage.getItem("hanlo-about-mode");
    } catch {
      return null;
    }
  };
  function showChapter(key: string) {
    if (!CHAPTERS.includes(key as (typeof CHAPTERS)[number])) return;
    const template = root!.querySelector<HTMLTemplateElement>(
      `template[data-bottle-chapter="${key}"]`,
    );
    if (!template) return;
    panelContent!.replaceChildren(template.content.cloneNode(true));
    panel!.hidden = false;
    chapters.forEach((button) =>
      button.setAttribute("aria-pressed", String(button.dataset["bottleOpen"] === key)),
    );
  }
  function report(state: SceneState) {
    if (disposed) return;
    const period = root!.querySelector<HTMLElement>("[data-bottle-period]");
    if (period) period.textContent = state.period;
    root!.dataset["bottlePeriod"] = state.period;
    if (speedButton)
      speedButton.textContent = state.speed === 0 ? "时间 · 已暂停" : `时间 · ×${state.speed}`;
    stormButton?.setAttribute("aria-pressed", String(state.storm));
  }
  function setVisibility(bottle: boolean) {
    root!.hidden = !bottle;
    classic!.hidden = bottle;
    shell!.dataset["bottleActive"] = String(bottle);
    switchers.forEach((button) =>
      button.setAttribute(
        "aria-pressed",
        String(button.dataset["aboutMode"] === (bottle ? "bottle" : "classic")),
      ),
    );
    scene?.setActive(bottle);
  }
  function fallback() {
    if (disposed) return;
    status!.textContent = "瓶中世界暂时未能打开，可以切回文字关于，或点击重试。";
    status!.hidden = false;
    root!.dataset["bottleState"] = "error";
    const retry = root!.querySelector<HTMLButtonElement>("[data-bottle-retry]");
    if (retry) retry.hidden = false;
    if (controls) controls.hidden = true;
    if (scene) {
      void scene.dispose();
      scene = undefined;
    }
    // Restore reading width as well as text if the enhancement cannot start.
    shell!.dataset["bottleActive"] = "false";
    classic!.hidden = false;
  }
  async function activate() {
    wanted = true;
    setVisibility(true);
    if (scene) {
      status!.hidden = true;
      return;
    }
    if (pending) return;
    pending = true;
    const ticket = ++attempt;
    root!.dataset["bottleState"] = "loading";
    status!.hidden = false;
    status!.textContent = "正在装入一片海…";
    const retry = root!.querySelector<HTMLButtonElement>("[data-bottle-retry]");
    if (retry) retry.hidden = true;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const loaded = Promise.all([
        import("./three-loader").then((module) => module.loadThree()),
        import("./scene"),
      ]);
      const deadline = new Promise<never>((_, reject) => {
        timeout = resources.timeout(() => reject(new Error("Three.js CDN timed out.")), 12000);
      });
      const [T, module] = await Promise.race([loaded, deadline]);
      if (disposed || !wanted || ticket !== attempt) return;
      scene = module.createBottleScene(T, stage!, showChapter, report, fallback);
      root!.dataset["bottleState"] = "ready";
      status!.hidden = true;
      if (controls) controls.hidden = false;
    } catch (error) {
      if (!disposed && wanted && ticket === attempt) {
        console.warn("[Hanlo] Bottle scene unavailable.", error);
        fallback();
      }
    } finally {
      if (timeout) clearTimeout(timeout);
      pending = false;
    }
  }
  switchers.forEach((button) =>
    resources.listen(button, "click", () => {
      const mode = button.dataset["aboutMode"];
      try {
        sessionStorage.setItem("hanlo-about-mode", mode ?? "classic");
      } catch {
        /* Storage can be disabled. */
      }
      if (mode === "bottle") void activate();
      else {
        wanted = false;
        setVisibility(false);
      }
    }),
  );
  chapters.forEach((button) =>
    resources.listen(button, "click", () => showChapter(button.dataset["bottleOpen"] ?? "intro")),
  );
  const close = root.querySelector<HTMLButtonElement>("[data-bottle-close]");
  if (close)
    resources.listen(close, "click", () => {
      panel.hidden = true;
      chapters.forEach((button) => button.setAttribute("aria-pressed", "false"));
    });
  resources.listen(root, "keydown", (event) => {
    if ((event as KeyboardEvent).key === "Escape") {
      panel.hidden = true;
      scene?.setStorm(false);
    }
  });
  const retry = root.querySelector<HTMLButtonElement>("[data-bottle-retry]");
  if (retry) resources.listen(retry, "click", () => void activate());
  if (speedButton) resources.listen(speedButton, "click", () => scene?.cycleSpeed());
  const reset = root.querySelector<HTMLButtonElement>("[data-bottle-reset]");
  if (reset) resources.listen(reset, "click", () => scene?.resetView());
  if (stormButton) {
    resources.listen(stormButton, "pointerdown", (event) => {
      const e = event as PointerEvent;
      if (e.button !== 0) return;
      stormButton.setPointerCapture(e.pointerId);
      scene?.setStorm(true);
    });
    for (const type of ["pointerup", "pointercancel", "lostpointercapture", "blur"])
      resources.listen(stormButton, type, () => scene?.setStorm(false));
    resources.listen(stormButton, "keydown", (event) => {
      const e = event as KeyboardEvent;
      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        scene?.setStorm(true);
      }
    });
    resources.listen(stormButton, "keyup", (event) => {
      const e = event as KeyboardEvent;
      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        scene?.setStorm(false);
      }
    });
  }
  resources.defer(async () => {
    disposed = true;
    wanted = false;
    attempt += 1;
    await scene?.dispose();
    classic.hidden = false;
    root.hidden = true;
    delete shell.dataset["bottleActive"];
  });
  // Let the world take the first view; chapters open only on a visitor's selection.
  panel.hidden = true;
  if ((stored() ?? shell.dataset["aboutDefault"] ?? "bottle") === "bottle") void activate();
  else setVisibility(false);
}
