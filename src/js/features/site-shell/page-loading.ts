import type { PageResourceScope } from "../../core/resource-scope";
import { PAGE_LIFECYCLE_EVENTS } from "../../core/runtime";

export function finishPageLoading(resources: PageResourceScope, reveal = true): void {
  const box = document.querySelector<HTMLElement>("#loading-box");
  if (!box || box.classList.contains("loaded") || resources.disposed) return;
  box.classList.add("loaded");
  box.setAttribute("aria-hidden", "true");

  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (
    !reveal ||
    motion.matches ||
    document.hidden ||
    document.documentElement.classList.contains("hanlo-internal-navigation")
  )
    return;

  const animations = new Set<Animation>();
  const cancel = () => {
    for (const animation of animations) animation.cancel();
    animations.clear();
  };
  resources.defer(cancel);
  resources.listen(window, "pagehide", cancel);
  resources.listen(motion, "change", () => {
    if (motion.matches) cancel();
  });
  resources.listen(document, "visibilitychange", () => {
    if (document.hidden) cancel();
  });

  const targets = document.querySelectorAll<HTMLElement>(
    "#nav, #site-info, #home_top, #content-inner > *, #footer",
  );
  let index = 0;
  targets.forEach((element) => {
    const bounds = element.getBoundingClientRect();
    if (
      !element.animate ||
      bounds.height === 0 ||
      bounds.bottom <= 0 ||
      bounds.top >= window.innerHeight
    )
      return;
    const frames =
      element.id === "nav"
        ? [{ opacity: 0 }, { opacity: 1 }]
        : [
            { opacity: 0, translate: "0 18px" },
            { opacity: 1, translate: "0 0" },
          ];
    const animation = element.animate(frames, {
      duration: 560,
      delay: 100 + Math.min(index, 4) * 65,
      easing: "cubic-bezier(0.22, 1, 0.36, 1)",
      fill: "backwards",
    });
    animations.add(animation);
    void animation.finished.then(
      () => {
        animation.cancel();
        animations.delete(animation);
      },
      () => {
        animations.delete(animation);
      },
    );
    index += 1;
  });
}

export function mountPageLoading(resources: PageResourceScope): void {
  if (!document.querySelector("#loading-box")) return;
  resources.listen(document, PAGE_LIFECYCLE_EVENTS.initial, () => finishPageLoading(resources), {
    once: true,
  });
  // A slow optional widget must not keep the document behind the loading screen.
  resources.timeout(() => finishPageLoading(resources), 3_000);
  resources.listen(window, "pagehide", () => finishPageLoading(resources, false));
  resources.listen(window, "pageshow", (event) => {
    if ((event as PageTransitionEvent).persisted) finishPageLoading(resources, false);
  });
}
