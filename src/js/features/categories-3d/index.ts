import type { PageControllerDefinition } from "../../core/types";

export interface TiltTransform {
  readonly card: string;
  readonly background: string;
}

export function calculateTilt(
  pointerX: number,
  pointerY: number,
  width: number,
  height: number,
): TiltTransform {
  const normalizedX = width > 0 ? (pointerX / width - 0.5) * 2 : 0;
  const normalizedY = height > 0 ? (pointerY / height - 0.5) * 2 : 0;
  return {
    card: `rotateY(${normalizedX * 15}deg) rotateX(${-normalizedY * 15}deg)`,
    background: `translateX(${-normalizedX * 20}px) translateY(${-normalizedY * 20}px)`,
  };
}

export function createCategories3dController(): PageControllerDefinition {
  return {
    name: "categories-3d",
    create: ({ resources }) => ({
      mount() {
        const cards = document.querySelectorAll<HTMLElement>("[data-hanlo-category-card]");
        if (cards.length === 0 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          return;
        }
        cards.forEach((wrapper) => {
          const card = wrapper.querySelector<HTMLElement>(".card");
          const background = wrapper.querySelector<HTMLElement>(".card-bg");
          if (!card || !background) return;
          const reset = (): void => {
            card.style.transform = "rotateY(0deg) rotateX(0deg)";
            background.style.transform = "translateX(0) translateY(0)";
          };
          resources.listen(wrapper, "pointermove", (event) => {
            const pointer = event as PointerEvent;
            if (pointer.pointerType === "touch") return;
            const bounds = wrapper.getBoundingClientRect();
            const transform = calculateTilt(
              pointer.clientX - bounds.left,
              pointer.clientY - bounds.top,
              bounds.width,
              bounds.height,
            );
            card.style.transform = transform.card;
            background.style.transform = transform.background;
          });
          resources.listen(wrapper, "pointerleave", reset);
          resources.listen(wrapper, "blur", reset, true);
          resources.defer(reset);
        });
      },
      unmount() {},
    }),
  };
}
