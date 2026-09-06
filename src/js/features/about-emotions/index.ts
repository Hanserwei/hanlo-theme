import type { PageResourceScope } from "../../core/resource-scope";
import { mountMotion } from "./motion";
import {
  EMOTION_DIAMETER,
  EmotionPhysics,
  distributeEmotions,
  emotionCount,
  emotionSelection,
  playgroundHeight,
} from "./physics";

export function mountAboutEmotions(resources: PageResourceScope): void {
  const root = document.querySelector<HTMLElement>("[data-about-emotions]");
  const stage = root?.querySelector<HTMLElement>("[data-emotion-stage]");
  const controls = root?.querySelector<HTMLElement>("[data-emotion-controls]");
  const status = root?.querySelector<HTMLElement>("[data-emotion-status]");
  const placeholder = root?.querySelector<HTMLElement>("[data-emotion-placeholder]");
  const shake = root?.querySelector<HTMLButtonElement>("[data-emotion-shake]");
  const pause = root?.querySelector<HTMLButtonElement>("[data-emotion-pause]");
  const motion = root?.querySelector<HTMLButtonElement>("[data-emotion-motion]");
  if (!root || !stage || !controls || !status || !placeholder || !shake || !pause || !motion)
    return;
  const ids = distributeEmotions(
    emotionSelection(root.dataset.emotions),
    emotionCount(root.dataset.count),
  );
  if (ids.length === 0) {
    placeholder.textContent = "还没有放入表情。";
    return;
  }

  let width = Math.max(EMOTION_DIAMETER + 16, stage.clientWidth);
  const world = new EmotionPhysics(width, playgroundHeight(width, ids.length), ids.length);
  resources.defer(() => world.dispose());
  stage.style.height = `${playgroundHeight(width, ids.length)}px`;
  stage.style.setProperty("--emotion-size", `${EMOTION_DIAMETER}px`);
  const nodes = ids.map((id, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "about-emotions__ball";
    button.dataset.emotionIndex = String(index);
    button.setAttribute("aria-label", `抛起贴吧表情 ${id}`);
    const image = document.createElement("img");
    const filename = `image_emoticon${id === 1 ? "" : id}.png`;
    image.src = `${root.dataset.assets}/${filename}`;
    image.alt = "";
    image.width = EMOTION_DIAMETER;
    image.height = EMOTION_DIAMETER;
    image.draggable = false;
    image.decoding = "async";
    // Keep a same-sized yellow face if a local asset cannot be loaded.
    resources.listen(
      image,
      "error",
      () => {
        image.hidden = true;
        button.textContent = "🙂";
      },
      { once: true },
    );
    button.append(image);
    stage.append(button);
    return button;
  });
  placeholder.hidden = true;
  controls.hidden = false;
  status.textContent = "抓住表情，拖一拖、甩出去；也可以试试摇一摇。";
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let paused = reducedMotion.matches;
  let visible = true;
  let frame: number | undefined;
  let lastFrame = 0;
  let elapsed = 0;
  let drag: { pointerId: number; button: HTMLButtonElement } | undefined;
  const render = (): void => {
    world.balls.forEach((body, index) => {
      nodes[index]!.style.transform =
        `translate3d(${body.position.x - world.radius}px, ${body.position.y - world.radius}px, 0) rotate(${body.angle}rad)`;
    });
  };
  const active = (): boolean => !resources.disposed && !paused && visible && !document.hidden;
  const tick = (time: number): void => {
    frame = undefined;
    if (!active()) return;
    elapsed += lastFrame ? Math.min(time - lastFrame, 50) : 1_000 / 60;
    lastFrame = time;
    while (elapsed >= 1_000 / 120) {
      world.step();
      elapsed -= 1_000 / 120;
    }
    render();
    if (world.moving) frame = requestAnimationFrame(tick);
    else lastFrame = 0;
  };
  const wake = (): void => {
    if (active() && frame === undefined) frame = requestAnimationFrame(tick);
  };
  const release = (): void => {
    world.release();
    const previous = drag;
    drag = undefined;
    if (!previous) return;
    previous.button.classList.remove("is-grabbed");
    if (previous.button.hasPointerCapture(previous.pointerId)) {
      previous.button.releasePointerCapture(previous.pointerId);
    }
  };
  const stop = (): void => {
    if (frame !== undefined) cancelAnimationFrame(frame);
    frame = undefined;
    lastFrame = 0;
    elapsed = 0;
    release();
  };
  const setPaused = (value: boolean): void => {
    paused = value;
    pause.textContent = value ? "继续" : "暂停";
    pause.setAttribute("aria-pressed", String(value));
    if (value) stop();
    else wake();
  };
  const point = (event: PointerEvent): { x: number; y: number } => {
    const bounds = stage.getBoundingClientRect();
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  };

  resources.listen(stage, "pointerdown", (rawEvent) => {
    const event = rawEvent as PointerEvent;
    if (event.button !== 0 || drag || !(event.target instanceof Element)) return;
    const button = event.target.closest<HTMLButtonElement>("[data-emotion-index]");
    if (!button || !stage.contains(button)) return;
    event.preventDefault();
    setPaused(false);
    button.focus({ preventScroll: true });
    world.grab(Number(button.dataset.emotionIndex), point(event));
    drag = { pointerId: event.pointerId, button };
    button.classList.add("is-grabbed");
    button.setPointerCapture(event.pointerId);
    wake();
  });
  resources.listen(stage, "pointermove", (rawEvent) => {
    const event = rawEvent as PointerEvent;
    if (drag?.pointerId !== event.pointerId) return;
    world.move(point(event));
    wake();
  });
  for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) {
    resources.listen(stage, type, (event) => {
      if (drag?.pointerId === (event as PointerEvent).pointerId) release();
    });
  }
  resources.listen(stage, "click", (event) => {
    if ((event as MouseEvent).detail !== 0 || !(event.target instanceof Element)) return;
    const button = event.target.closest<HTMLElement>("[data-emotion-index]");
    if (!button) return;
    setPaused(false);
    world.toss(Number(button.dataset.emotionIndex));
    wake();
  });
  resources.listen(stage, "keydown", (event) => {
    if ((event as KeyboardEvent).key === "Escape") release();
  });
  resources.listen(shake, "click", () => {
    setPaused(false);
    world.toss();
    wake();
  });
  resources.listen(pause, "click", () => setPaused(!paused));
  resources.listen(document, "visibilitychange", () => {
    if (document.hidden) stop();
    else wake();
  });
  resources.listen(window, "blur", release);
  resources.listen(reducedMotion, "change", () => setPaused(reducedMotion.matches));

  const resize = (): void => {
    const nextWidth = Math.max(EMOTION_DIAMETER + 16, stage.clientWidth);
    if (nextWidth === width) return;
    release();
    width = nextWidth;
    const height = playgroundHeight(width, ids.length);
    stage.style.height = `${height}px`;
    world.resize(width, height);
    render();
    wake();
  };
  if (typeof ResizeObserver !== "undefined") {
    resources.observe(new ResizeObserver(resize)).observe(stage);
  } else {
    resources.listen(window, "resize", resize, { passive: true });
  }
  if (typeof IntersectionObserver !== "undefined") {
    resources
      .observe(
        new IntersectionObserver((entries) => {
          visible = entries.some((entry) => entry.isIntersecting);
          if (visible) wake();
          else stop();
        }),
      )
      .observe(root);
  }
  mountMotion(motion, status, world, resources, active, () => setPaused(false), wake);
  if (paused) {
    // Show a settled pile without an entrance animation for reduced-motion users.
    for (let step = 0; step < 480; step++) world.step();
  }
  render();
  setPaused(paused);
  resources.defer(() => {
    stop();
    nodes.forEach((node) => node.remove());
    stage.style.removeProperty("height");
    stage.style.removeProperty("--emotion-size");
    controls.hidden = true;
    motion.hidden = true;
    placeholder.hidden = false;
  });
}
