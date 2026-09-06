import type { PageResourceScope } from "../../core/resource-scope";
import type { PageControllerDefinition } from "../../core/types";

export const CARD_MOTION_SELECTOR = [
  "#recent-posts > .recent-post-item:not(.ads-wrap)",
  ".recent-post-top .recent-post-item",
  "#aside-content .card-widget:not(.card-music, .card-steam)",
  "#about-page .author-content-item",
  "#about-page .about-emotions",
  "#article-container .flink-list-item",
  "#article-container .site-card",
  "#comments-page .comment-card",
  "#album .card-album > .card",
  ".fMomentsArticleItem",
].join(",");

export function mountCardMotion(root: ParentNode, resources: PageResourceScope): void {
  const cards = new Map<HTMLElement, HTMLElement>();
  const visible = new Set<HTMLElement>();
  let sequence = 0;
  let hidden = document.hidden;
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const update = (card: HTMLElement): void => {
    card.classList.toggle("hanlo-card-awake", !hidden && !motion.matches && visible.has(card));
  };
  const intersection =
    typeof IntersectionObserver === "undefined"
      ? undefined
      : resources.observe(
          new IntersectionObserver(
            (entries) => {
              for (const entry of entries) {
                const card = entry.target as HTMLElement;
                if (!cards.has(card)) continue;
                if (entry.isIntersecting) visible.add(card);
                else visible.delete(card);
                update(card);
              }
            },
            { threshold: 0 },
          ),
        );
  const remove = (card: HTMLElement): void => {
    cards.get(card)?.remove();
    cards.delete(card);
    visible.delete(card);
    intersection?.unobserve(card);
    card.classList.remove("hanlo-motion-card", "hanlo-card-positioned", "hanlo-card-awake");
  };
  const add = (card: HTMLElement): void => {
    if (cards.has(card) || card.parentElement?.closest(CARD_MOTION_SELECTOR)) return;
    const aura = document.createElement("span");
    aura.className = "hanlo-card-aura";
    aura.setAttribute("aria-hidden", "true");
    // Keep neighbouring cards out of phase without animating their layout or content.
    aura.style.setProperty("--hanlo-card-delay", `${-(sequence % 9) * 0.85}s`);
    aura.style.setProperty("--hanlo-card-period", `${6.4 + (sequence % 4) * 0.7}s`);
    sequence++;
    if (getComputedStyle(card).position === "static") card.classList.add("hanlo-card-positioned");
    card.classList.add("hanlo-motion-card");
    card.append(aura);
    cards.set(card, aura);
    if (intersection) intersection.observe(card);
    else visible.add(card);
    update(card);
  };
  const scan = (node: ParentNode): void => {
    if (node instanceof HTMLElement && node.matches(CARD_MOTION_SELECTOR)) add(node);
    node.querySelectorAll<HTMLElement>(CARD_MOTION_SELECTOR).forEach(add);
  };
  scan(root);
  if (typeof MutationObserver !== "undefined") {
    resources
      .observe(
        new MutationObserver((records) => {
          for (const card of cards.keys()) {
            if (!card.isConnected) remove(card);
          }
          for (const record of records) {
            record.addedNodes.forEach((node) => {
              if (
                node instanceof HTMLElement &&
                node.isConnected &&
                !node.classList.contains("hanlo-card-aura")
              )
                scan(node);
            });
          }
        }),
      )
      .observe(root as Node, { childList: true, subtree: true });
  }
  const refresh = (): void => cards.forEach((_, card) => update(card));
  resources.listen(document, "visibilitychange", () => {
    hidden = document.hidden;
    refresh();
  });
  resources.listen(window, "pagehide", () => {
    hidden = true;
    refresh();
  });
  resources.listen(window, "pageshow", () => {
    hidden = document.hidden;
    refresh();
  });
  resources.listen(motion, "change", refresh);
  resources.defer(() => cards.forEach((_, card) => remove(card)));
}

export function createCardMotionController(): PageControllerDefinition {
  return {
    name: "card-motion",
    create: ({ resources }) => ({
      mount: (root) => mountCardMotion(root, resources),
      unmount() {},
    }),
  };
}
