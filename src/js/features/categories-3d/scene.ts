import { gsap } from "gsap";

import type { PageResourceScope } from "../../core/resource-scope";
import { calculateTilt } from "./geometry";

interface CategorySceneCard {
  wrapper: HTMLElement;
  reveal: gsap.core.Tween;
  idle: gsap.core.Timeline;
  hover: gsap.core.Timeline;
  press: gsap.core.Timeline;
  quick: Record<
    "rotationX" | "rotationY" | "lift" | "backgroundX" | "backgroundY" | "artX" | "infoX" | "infoY",
    gsap.QuickToFunc
  >;
  visible: boolean;
}

export function mountCategoryScene(resources: PageResourceScope): void {
  const gallery = document.querySelector<HTMLElement>("[data-category-gallery]");
  if (!gallery) return;
  const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
  const states = new Map<HTMLElement, CategorySceneCard>();
  let hidden = document.hidden;
  const context = gsap.context(() => {}, gallery);
  resources.defer(() => context.revert());

  const reset = (state: CategorySceneCard, immediate = false): void => {
    Object.values(state.quick).forEach((move) => {
      move(0);
      if (immediate) move.tween.progress(1).pause();
    });
    state.hover.pause(0);
    state.press.pause(0);
    state.wrapper.style.removeProperty("--category-glow-x");
    state.wrapper.style.removeProperty("--category-glow-y");
  };
  const synchronize = (state: CategorySceneCard): void => {
    if (state.visible && !hidden) {
      state.reveal.play();
      if (fine.matches) state.idle.play();
      else state.idle.pause(0);
    } else {
      state.reveal.pause();
      state.idle.pause();
      reset(state, true);
    }
  };
  context.add(() => {
    gallery
      .querySelectorAll<HTMLElement>("[data-hanlo-category-card]")
      .forEach((wrapper, index) => {
        const card = wrapper.querySelector<HTMLElement>(".card");
        const arrival = wrapper.querySelector<HTMLElement>(".category-arrival");
        const art = wrapper.querySelector<HTMLElement>(".category-art");
        const info = wrapper.querySelector<HTMLElement>(".card-info");
        const background = wrapper.querySelector<HTMLElement>(".card-bg");
        const sheen = wrapper.querySelector<HTMLElement>(".category-sheen");
        if (!card || !arrival || !art || !info || !background || !sheen) return;
        const cube = wrapper.querySelector(".category-cube");
        const outer = wrapper.querySelector(".category-orbit-outer");
        const inner = wrapper.querySelector(".category-orbit-inner");
        const satellite = wrapper.querySelector(".category-satellite");
        const duration = 3.6 + (index % 4) * 0.35;
        gsap.set(cube, {
          rotationX: -24 + (index % 3) * 6,
          rotationY: 36 + (index % 4) * 18,
          rotationZ: -8,
        });
        gsap.set(sheen, { xPercent: -35, opacity: 0 });
        const options = { duration: 0.65, ease: "power3.out" };
        const state: CategorySceneCard = {
          wrapper,
          visible: false,
          reveal: gsap.fromTo(
            arrival,
            { opacity: 0, y: fine.matches ? 48 : 24, rotationX: fine.matches ? -12 : 0 },
            {
              opacity: 1,
              y: 0,
              rotationX: 0,
              duration: 1,
              delay: (index % 3) * 0.1,
              ease: "power3.out",
              paused: true,
            },
          ),
          idle: gsap
            .timeline({ repeat: -1, yoyo: true, paused: true })
            .to(art, { y: -9, duration, ease: "sine.inOut" }, 0)
            .to(cube, { rotationY: "+=55", rotationZ: "+=14", duration, ease: "sine.inOut" }, 0)
            .to(outer, { rotationZ: "+=36", duration, ease: "sine.inOut" }, 0)
            .to(inner, { rotationZ: "-=28", duration, ease: "sine.inOut" }, 0)
            .to(satellite, { x: 14, y: -10, scale: 0.7, duration, ease: "sine.inOut" }, 0),
          hover: gsap
            .timeline({ paused: true })
            .to(sheen, { xPercent: 35, opacity: 0.8, duration: 0.75, ease: "power2.out" })
            .to(sheen, { opacity: 0, duration: 0.25 }),
          press: gsap
            .timeline({ paused: true })
            .to(card, { scale: 0.975, duration: 0.12, ease: "power2.out" })
            .to(card, { scale: 1, duration: 0.55, ease: "back.out(2)" }),
          quick: {
            rotationX: gsap.quickTo(card, "rotationX", options),
            rotationY: gsap.quickTo(card, "rotationY", options),
            lift: gsap.quickTo(card, "y", options),
            backgroundX: gsap.quickTo(background, "x", { ...options, duration: 0.85 }),
            backgroundY: gsap.quickTo(background, "y", { ...options, duration: 0.85 }),
            artX: gsap.quickTo(art, "x", { ...options, duration: 0.9 }),
            infoX: gsap.quickTo(info, "x", options),
            infoY: gsap.quickTo(info, "y", options),
          },
        };
        states.set(wrapper, state);
        const revealNow = (): void => {
          state.reveal.progress(1).pause();
        };
        resources.listen(wrapper, "pointerenter", (event) => {
          if (!fine.matches || hidden || (event as PointerEvent).pointerType === "touch") return;
          state.quick.lift(-8);
          state.hover.restart();
        });
        resources.listen(wrapper, "pointermove", (event) => {
          if (!fine.matches || hidden || (event as PointerEvent).pointerType === "touch") return;
          const pointer = event as PointerEvent;
          const bounds = wrapper.getBoundingClientRect();
          const tilt = calculateTilt(
            pointer.clientX - bounds.left,
            pointer.clientY - bounds.top,
            bounds.width,
            bounds.height,
          );
          state.quick.rotationX(tilt.rotationX);
          state.quick.rotationY(tilt.rotationY);
          state.quick.backgroundX(tilt.backgroundX);
          state.quick.backgroundY(tilt.backgroundY);
          state.quick.artX(-tilt.backgroundX * 0.5);
          state.quick.infoX(-tilt.backgroundX * 0.2);
          state.quick.infoY(-tilt.backgroundY * 0.15);
          wrapper.style.setProperty("--category-glow-x", `${tilt.lightX}%`);
          wrapper.style.setProperty("--category-glow-y", `${tilt.lightY}%`);
        });
        resources.listen(wrapper, "pointerleave", () => reset(state));
        resources.listen(wrapper, "pointercancel", () => reset(state, true));
        resources.listen(wrapper, "pointerdown", (event) => {
          if (hidden || (event as PointerEvent).button !== 0) return;
          revealNow();
          state.press.restart();
        });
        resources.listen(wrapper, "focus", () => {
          revealNow();
          if (wrapper.matches(":focus-visible") && !hidden) state.quick.lift(-6);
        });
        resources.listen(wrapper, "blur", () => reset(state));
      });
  });
  if (typeof IntersectionObserver !== "undefined") {
    // Observe cards individually so lower rows do not animate while offscreen.
    const cardsObserver = resources.observe(
      new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            const state = states.get(entry.target as HTMLElement);
            if (!state) continue;
            state.visible = entry.isIntersecting;
            synchronize(state);
          }
        },
        { threshold: 0.08 },
      ),
    );
    states.forEach((_, wrapper) => cardsObserver.observe(wrapper));
  } else {
    states.forEach((state) => {
      state.visible = true;
      synchronize(state);
    });
  }
  const refresh = (): void => states.forEach(synchronize);
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
  resources.listen(window, "blur", () => states.forEach((state) => reset(state, true)));
  resources.listen(fine, "change", () => {
    states.forEach((state) => reset(state, true));
    refresh();
  });
  resources.defer(() => {
    states.forEach((state) => {
      state.wrapper.style.removeProperty("--category-glow-x");
      state.wrapper.style.removeProperty("--category-glow-y");
    });
    states.clear();
  });
}
