import type { PageResourceScope } from "../../core/resource-scope";
import {
  type Projection,
  type Vector,
  axisRotation,
  composeRotation,
  fibonacciSphere,
  fitRadius,
  makeProjection,
  tagTier,
  trackball,
  trackballRotation,
} from "./geometry";
import { createWireframe } from "./wireframe";

const focusScale = 1.16;
const dragThreshold = 5;
const idle: Vector = { x: 0.064, y: 0.15, z: 0.012 };
const still: Vector = { x: 0, y: 0, z: 0 };
const clamp = (value: number): number => Math.max(-1, Math.min(1, value));

interface Gesture {
  id: number;
  touch: boolean;
  x: number;
  y: number;
  previous: Vector;
  lastMove: number;
  velocity: Vector;
  dragging: boolean;
}

export function mountTagCloud(index: HTMLElement, resources: PageResourceScope): void {
  const stage = index.querySelector<HTMLElement>(".tag-index__stage");
  const list = stage?.querySelector<HTMLElement>(".tag-index__items");
  const controls = index.querySelector<HTMLElement>("[data-tag-controls]");
  const buttons = Array.from(
    controls?.querySelectorAll<HTMLButtonElement>("[data-tag-view]") ?? [],
  );
  if (!stage || !list || !controls || typeof ResizeObserver === "undefined") return;

  const original = Array.from(list.querySelectorAll<HTMLElement>(".tag-index__item"));
  if (original.length === 0) return;
  const collator = new Intl.Collator("zh-CN", { numeric: true, sensitivity: "base" });
  const byCount = original
    .map((item) => ({
      item,
      name: item.querySelector(".tag-index__name")?.textContent ?? "",
      count: Math.max(0, Number(item.dataset.count) || 0),
    }))
    .sort((a, b) => b.count - a.count || collator.compare(a.name, b.name));
  const vectors = fibonacciSphere(original.length);
  const tags = byCount.map(({ item, count }, i) => {
    item.dataset.tier = String(tagTier(count, byCount[byCount.length - 1].count, byCount[0].count));
    // Keep the strongest tag near the front when the sphere first appears.
    return { item, vector: vectors[(i + Math.floor(vectors.length / 2)) % vectors.length] };
  });

  const canvas = document.createElement("canvas");
  canvas.className = "tag-index__wireframe";
  canvas.setAttribute("aria-hidden", "true");
  stage.prepend(canvas);
  const wireframe = createWireframe(canvas);
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const projection: Projection = { ...still, scale: 1 };
  const lead = tags[0].vector;
  let orientation = trackballRotation(lead, trackball(-0.15, -0.12));
  let velocity: Vector = { ...idle };
  let pointer: Vector | undefined;
  let view: "cloud" | "list" = "list";
  let width = 0;
  let height = 0;
  let radius = 0;
  let frame: number | undefined;
  let previousTime: number | undefined;
  let onScreen = typeof IntersectionObserver === "undefined";
  let pageSuspended = false;
  let hovered: HTMLElement | undefined;
  let focused: HTMLElement | undefined;
  let highlighted: HTMLElement | undefined;
  let gesture: Gesture | undefined;
  let suppressClick = false;

  const paint = (): void => {
    if (view !== "cloud" || !radius) return;
    const project = makeProjection(orientation, radius);
    wireframe?.draw(project, radius);
    for (const { item, vector } of tags) {
      project(vector, projection);
      const { x, y, z, scale } = projection;
      const emphasis = item === highlighted;
      const depth = Math.max(0, Math.min(1, (z + 0.38) / 1.04));
      item.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) translate(-50%, -50%) scale(${scale.toFixed(4)})`;
      item.style.opacity = emphasis ? "1" : (0.17 + 0.83 * depth ** 0.85).toFixed(3);
      item.style.zIndex = String(emphasis ? 200_002 : Math.round((z + 1) * 100_000) + 1);
      const rear = !emphasis && z < -0.2;
      if (rear !== item.hasAttribute("data-rear")) item.toggleAttribute("data-rear", rear);
    }
  };

  const resize = (): void => {
    if (view !== "cloud") return;
    const w = list.clientWidth;
    const h = list.clientHeight;
    let halfWidth = 0;
    let halfHeight = 0;
    for (const { item } of tags) {
      halfWidth = Math.max(halfWidth, ((item.offsetWidth + 2) * focusScale) / 2);
      halfHeight = Math.max(halfHeight, ((item.offsetHeight + 2) * focusScale) / 2);
    }
    if (w !== width || h !== height) {
      width = w;
      height = h;
      wireframe?.resize(w, h);
    }
    radius = Math.min(fitRadius(w / 2 - 7, halfWidth), fitRadius(h / 2 - 29, halfHeight));
    paint();
  };

  const tick = (time: number): void => {
    frame = undefined;
    const elapsed = Math.min(0.05, (time - (previousTime ?? time)) / 1000);
    previousTime = time;
    if (!gesture?.dragging && !motion.matches) {
      const target = highlighted ? still : (pointer ?? idle);
      const rate = highlighted ? 32 : 3.1;
      const blend = 1 - Math.exp(-rate * elapsed);
      velocity.x += (target.x - velocity.x) * blend;
      velocity.y += (target.y - velocity.y) * blend;
      velocity.z += (target.z - velocity.z) * blend;
      const speed = Math.hypot(velocity.x, velocity.y, velocity.z);
      if (speed > 0.003)
        orientation = composeRotation(axisRotation(velocity, speed * elapsed), orientation);
      else if (highlighted) velocity = { ...still };
    }
    paint();
    schedule();
  };

  const schedule = (dirty = false): void => {
    const visible =
      view === "cloud" &&
      onScreen &&
      !pageSuspended &&
      !document.hidden &&
      !resources.disposed &&
      stage.isConnected;
    const animate =
      !gesture?.dragging &&
      !motion.matches &&
      (!highlighted || Math.hypot(velocity.x, velocity.y, velocity.z) > 0.003);
    if (visible && (dirty || animate)) {
      if (frame === undefined) frame = requestAnimationFrame(tick);
      return;
    }
    if (frame !== undefined) cancelAnimationFrame(frame);
    frame = previousTime = undefined;
  };

  const highlight = (): void => {
    const next = view === "cloud" && !gesture?.dragging ? (focused ?? hovered) : undefined;
    if (next === highlighted) return;
    highlighted?.removeAttribute("data-highlight");
    highlighted = next;
    highlighted?.setAttribute("data-highlight", "");
    schedule(true);
  };

  const tagFor = (target: EventTarget | null): HTMLElement | undefined => {
    if (!(target instanceof Element)) return;
    const item = target.closest(".tag-index__link")?.closest<HTMLElement>(".tag-index__item");
    return item?.parentElement === list ? item : undefined;
  };

  const readPointer = (event: PointerEvent): { x: number; y: number } => {
    const bounds = list.getBoundingClientRect();
    const controlRadius = Math.max(radius, 1);
    return {
      x: (event.clientX - bounds.left - bounds.width / 2) / controlRadius,
      y: (event.clientY - bounds.top - bounds.height / 2) / controlRadius,
    };
  };

  const endGesture = (): void => {
    const current = gesture;
    gesture = undefined;
    if (current && stage.hasPointerCapture(current.id)) stage.releasePointerCapture(current.id);
    stage.removeAttribute("data-dragging");
  };

  const clearProjection = (): void => {
    for (const { item } of tags) {
      item.style.removeProperty("transform");
      item.style.removeProperty("opacity");
      item.style.removeProperty("z-index");
      item.removeAttribute("data-rear");
    }
  };

  const restoreList = (): void => {
    list.classList.add("tag-cloud-list", "is-center");
    list.append(...original);
  };
  const setView = (next: "cloud" | "list"): void => {
    if (view === next) return;
    endGesture();
    view = next;
    index.dataset.view = next;
    for (const button of buttons) {
      button.setAttribute("aria-pressed", String(button.dataset.tagView === next));
    }
    hovered = focused = pointer = undefined;
    suppressClick = false;
    highlight();
    if (next === "cloud") {
      list.classList.remove("tag-cloud-list", "is-center");
      list.append(...byCount.map(({ item }) => item));
      wireframe?.syncColor();
      resize();
    } else {
      clearProjection();
      restoreList();
    }
    schedule();
  };

  resources.defer(() => {
    schedule();
    endGesture();
    clearProjection();
    list.style.removeProperty("--hanlo-tag-focus-scale");
    highlighted?.removeAttribute("data-highlight");
    delete index.dataset.view;
    controls.hidden = true;
    for (const item of original) delete item.dataset.tier;
    restoreList();
    canvas.remove();
  });

  const observer = resources.observe(new ResizeObserver(resize));
  observer.observe(stage);
  for (const item of original) observer.observe(item);
  if (typeof IntersectionObserver !== "undefined") {
    resources
      .observe(
        new IntersectionObserver(([entry]) => {
          onScreen = entry.isIntersecting;
          schedule(onScreen);
        }),
      )
      .observe(stage);
  }
  resources
    .observe(
      new MutationObserver(() => {
        wireframe?.syncColor();
        schedule(true);
      }),
    )
    .observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  for (const button of buttons) {
    resources.listen(button, "click", () =>
      setView(button.dataset.tagView === "cloud" ? "cloud" : "list"),
    );
  }
  resources.listen(stage, "focusin", (event) => {
    focused =
      event.target instanceof Element && event.target.matches(":focus-visible")
        ? tagFor(event.target)
        : undefined;
    highlight();
  });
  resources.listen(stage, "focusout", () => {
    focused = undefined;
    highlight();
  });
  resources.listen(stage, "pointerleave", (event) => {
    if ((event as PointerEvent).pointerType !== "mouse") return;
    pointer = hovered = undefined;
    highlight();
  });
  resources.listen(
    stage,
    "pointerdown",
    (input) => {
      const event = input as PointerEvent;
      if (!event.isPrimary || event.button !== 0) return;
      suppressClick = false;
      if (view !== "cloud") return;
      const { x, y } = readPointer(event);
      gesture = {
        id: event.pointerId,
        touch: event.pointerType === "touch",
        x: event.clientX,
        y: event.clientY,
        previous: trackball(x, y),
        lastMove: event.timeStamp,
        velocity: { ...still },
        dragging: false,
      };
    },
    { passive: true },
  );

  resources.listen(
    stage,
    "pointermove",
    (input) => {
      const event = input as PointerEvent;
      if (view !== "cloud" || !event.isPrimary) return;
      const { x, y } = readPointer(event);
      if (!gesture) {
        if (event.pointerType !== "mouse") return;
        pointer = { x: -clamp(y) * 0.67, y: clamp(x) * 0.75, z: 0 };
        hovered = tagFor(event.target);
        highlight();
        schedule();
        return;
      }
      if (gesture.id !== event.pointerId) return;
      if (!gesture.dragging) {
        const dx = event.clientX - gesture.x;
        const dy = event.clientY - gesture.y;
        if (Math.hypot(dx, dy) < dragThreshold) return;
        suppressClick = true;
        if (gesture.touch && Math.abs(dy) >= Math.abs(dx)) {
          endGesture();
          return;
        }
        gesture.dragging = true;
        stage.setPointerCapture(event.pointerId);
        stage.setAttribute("data-dragging", "");
        hovered = pointer = undefined;
        highlight();
      }
      const current = trackball(x, y);
      const delta = trackballRotation(gesture.previous, current);
      orientation = composeRotation(delta, orientation);
      const seconds = Math.max(0.008, (event.timeStamp - gesture.lastMove) / 1000);
      const axisLength = Math.hypot(delta.x, delta.y, delta.z);
      const speed = Math.min(5, (2 * Math.atan2(axisLength, delta.w)) / seconds);
      const factor = speed / (axisLength || 1);
      gesture.velocity = {
        x: gesture.velocity.x * 0.35 + delta.x * factor * 0.65,
        y: gesture.velocity.y * 0.35 + delta.y * factor * 0.65,
        z: gesture.velocity.z * 0.35 + delta.z * factor * 0.65,
      };
      gesture.previous = current;
      gesture.lastMove = event.timeStamp;
      schedule(true);
    },
    { passive: true },
  );

  const finishGesture = (input: Event): void => {
    const event = input as PointerEvent;
    if (!gesture || event.pointerId !== gesture.id) return;
    if (gesture.dragging) {
      const damping =
        event.type === "pointerup"
          ? Math.exp(-Math.max(0, event.timeStamp - gesture.lastMove) / 85)
          : 0;
      const { x, y, z } = gesture.velocity;
      velocity = motion.matches ? { ...still } : { x: x * damping, y: y * damping, z: z * damping };
    }
    endGesture();
    previousTime = undefined;
    highlight();
    schedule();
  };

  resources.listen(window, "pointerup", finishGesture);
  resources.listen(window, "pointercancel", finishGesture);
  resources.listen(stage, "lostpointercapture", finishGesture);
  resources.listen(stage, "dragstart", (event) => {
    if (view === "cloud") event.preventDefault();
  });
  resources.listen(
    stage,
    "click",
    (event) => {
      if (!suppressClick || (event as MouseEvent).detail === 0) return;
      suppressClick = false;
      event.preventDefault();
      event.stopPropagation();
    },
    { capture: true },
  );

  resources.listen(motion, "change", () => {
    velocity = { ...still };
    schedule(true);
  });
  const suspend = (): void => {
    endGesture();
    hovered = pointer = undefined;
    velocity = { ...idle };
    highlight();
    schedule();
  };
  resources.listen(document, "visibilitychange", () => {
    if (document.hidden) suspend();
    else schedule(true);
  });
  resources.listen(window, "pagehide", () => {
    pageSuspended = true;
    suspend();
  });
  resources.listen(window, "pageshow", () => {
    pageSuspended = false;
    schedule(true);
  });

  list.style.setProperty("--hanlo-tag-focus-scale", String(focusScale));
  setView("cloud");
  controls.hidden = false;
}
