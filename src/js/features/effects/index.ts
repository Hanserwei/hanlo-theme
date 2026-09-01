import type { PageResourceScope } from "../../core/resource-scope";
import type { PageControllerDefinition } from "../../core/types";

interface Point {
  x: number;
  y: number;
}

class Bubble {
  readonly #context: CanvasRenderingContext2D;
  readonly #size: () => Readonly<{ width: number; height: number }>;
  #alpha = 0;
  #alphaChange = 0;
  #position: Point = { x: 0, y: 0 };
  #scale = 0;
  #scaleChange = 0;
  #speed = 0;

  constructor(
    context: CanvasRenderingContext2D,
    size: () => Readonly<{ width: number; height: number }>,
  ) {
    this.#context = context;
    this.#size = size;
    this.reset();
  }

  reset(): void {
    const { width, height } = this.#size();
    this.#position = { x: Math.random() * width, y: height + 100 * Math.random() };
    this.#alpha = 0.1 + 0.5 * Math.random();
    this.#alphaChange = 0.0002 + 0.0005 * Math.random();
    this.#scale = 0.2 + 0.8 * Math.random();
    this.#scaleChange = 0.002 * Math.random();
    this.#speed = 0.1 + 0.4 * Math.random();
  }

  draw(): void {
    if (this.#alpha <= 0) this.reset();
    this.#position.y -= this.#speed;
    this.#alpha -= this.#alphaChange;
    this.#scale += this.#scaleChange;
    this.#context.beginPath();
    this.#context.arc(this.#position.x, this.#position.y, 10 * this.#scale, 0, 2 * Math.PI);
    this.#context.fillStyle = `rgba(255,255,255,${this.#alpha})`;
    this.#context.fill();
  }
}

interface Star {
  x: number;
  y: number;
  radius: number;
  speedX: number;
  speedY: number;
  opacity: number;
  opacityDelta: number;
}

function createStar(width: number, height: number): Star {
  return {
    x: Math.random() * width,
    y: Math.random() * height,
    radius: 1.1 + Math.random() * 1.5,
    speedX: 0.05 + Math.random() * 0.3,
    speedY: -(0.05 + Math.random() * 0.3),
    opacity: Math.random(),
    opacityDelta: 0.0005 + Math.random() * 0.002,
  };
}

function mountBubbles(resources: PageResourceScope): void {
  const panel = document.querySelector<HTMLElement>(".author-content.author-content-item.single");
  const container = panel?.parentElement;
  if (!panel || !container) return;
  const canvas = document.createElement("canvas");
  canvas.id = "header_canvas";
  canvas.style.cssText = "position:absolute;bottom:0";
  const context = canvas.getContext("2d");
  if (!context) return;
  panel.append(canvas);
  container.classList.add("thumbnail_canvas");
  let width = 0;
  let height = 0;
  let bubbles: Bubble[] = [];
  const resize = () => {
    width = container.offsetWidth;
    height = container.offsetHeight;
    canvas.width = width;
    canvas.height = height;
    bubbles = Array.from(
      { length: Math.ceil(0.04 * width) },
      () => new Bubble(context, () => ({ width, height })),
    );
  };
  const animate = () => {
    context.clearRect(0, 0, width, height);
    bubbles.forEach((bubble) => bubble.draw());
    resources.animationFrame(animate);
  };
  resize();
  animate();
  resources.listen(window, "resize", resize);
  resources.defer(() => {
    bubbles = [];
    canvas.remove();
    container.classList.remove("thumbnail_canvas");
  });
}

function mountUniverse(resources: PageResourceScope): void {
  const canvas = document.querySelector<HTMLCanvasElement>("#universe");
  const context = canvas?.getContext("2d");
  if (!canvas || !context) return;
  let width = 0;
  let height = 0;
  let stars: Star[] = [];
  const resize = () => {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    stars = Array.from({ length: Math.ceil(width * 0.216) }, () => createStar(width, height));
  };
  const animate = () => {
    if (document.documentElement.dataset["theme"] === "dark") {
      context.clearRect(0, 0, width, height);
      for (const star of stars) {
        star.x += star.speedX;
        star.y += star.speedY;
        star.opacity += star.opacityDelta;
        if (star.opacity >= 1 || star.opacity <= 0) star.opacityDelta *= -1;
        if (star.x > width || star.y < 0) Object.assign(star, createStar(width, height));
        context.fillStyle = `rgba(226,225,142,${star.opacity})`;
        context.fillRect(star.x, star.y, star.radius, star.radius);
      }
    }
    resources.animationFrame(animate);
  };
  resize();
  animate();
  resources.listen(window, "resize", resize);
  resources.defer(() => {
    stars = [];
    context.clearRect(0, 0, width, height);
  });
}

export function createEffectsController(): PageControllerDefinition {
  return {
    name: "effects",
    when: ({ config }) => config.effects.bubble || config.effects.universe,
    create: ({ config, resources }) => ({
      mount() {
        if (config.effects.bubble) mountBubbles(resources);
        if (config.effects.universe) mountUniverse(resources);
      },
      unmount() {},
    }),
  };
}
