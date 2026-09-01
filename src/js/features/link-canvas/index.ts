import type { PageResourceScope } from "../../core/resource-scope";

interface Bubble {
  readonly image: HTMLImageElement;
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  radius: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function extractLinkLogos(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((group) => {
    if (!isRecord(group) || !Array.isArray(group["links"])) return [];
    return group["links"].flatMap((link) => {
      if (!isRecord(link) || !isRecord(link["spec"])) return [];
      const logo = link["spec"]["logo"];
      return typeof logo === "string" && logo ? [logo] : [];
    });
  });
}

function randomVelocity(): number {
  const magnitude = 0.35 + Math.random() * 0.75;
  return Math.random() > 0.5 ? magnitude : -magnitude;
}

export function mountLinkCanvas(resources: PageResourceScope): void {
  const canvas = document.querySelector<HTMLCanvasElement>("#link-canvas");
  const button = document.querySelector<HTMLElement>("[data-hanlo-action='refresh-link-canvas']");
  const data = document.querySelector<HTMLScriptElement>("#link-canvas-data");
  const context = canvas?.getContext("2d");
  if (!canvas || !button || !context || !data?.textContent) return;

  let logos: string[] = [];
  try {
    logos = extractLinkLogos(JSON.parse(data.textContent));
  } catch (error) {
    console.warn("[Hanlo] Link canvas data could not be parsed.", error);
  }
  if (logos.length === 0) {
    canvas.replaceWith(
      Object.assign(document.createElement("p"), { textContent: "暂无可展示的友链头像" }),
    );
    return;
  }

  const bubbles: Bubble[] = logos.slice(0, 48).map((source) => {
    const image = new Image();
    image.src = source;
    return {
      image,
      x: Math.random() * 600,
      y: Math.random() * 360,
      velocityX: randomVelocity(),
      velocityY: randomVelocity(),
      radius: 24 + Math.random() * 10,
    };
  });
  let width = 0;
  let height = 0;
  let frame = 0;

  const resize = (): void => {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.max(1, Math.floor(width * ratio));
    canvas.height = Math.max(1, Math.floor(height * ratio));
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  };
  const shuffle = (): void => {
    for (const bubble of bubbles) {
      bubble.x = bubble.radius + Math.random() * Math.max(1, width - bubble.radius * 2);
      bubble.y = bubble.radius + Math.random() * Math.max(1, height - bubble.radius * 2);
      bubble.velocityX = randomVelocity();
      bubble.velocityY = randomVelocity();
    }
  };
  const draw = (): void => {
    context.clearRect(0, 0, width, height);
    for (const bubble of bubbles) {
      bubble.x += bubble.velocityX;
      bubble.y += bubble.velocityY;
      if (bubble.x <= bubble.radius || bubble.x >= width - bubble.radius) bubble.velocityX *= -1;
      if (bubble.y <= bubble.radius || bubble.y >= height - bubble.radius) bubble.velocityY *= -1;
      bubble.x = Math.max(bubble.radius, Math.min(width - bubble.radius, bubble.x));
      bubble.y = Math.max(bubble.radius, Math.min(height - bubble.radius, bubble.y));
      context.save();
      context.beginPath();
      context.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
      context.clip();
      if (bubble.image.complete && bubble.image.naturalWidth > 0) {
        context.drawImage(
          bubble.image,
          bubble.x - bubble.radius,
          bubble.y - bubble.radius,
          bubble.radius * 2,
          bubble.radius * 2,
        );
      } else {
        context.fillStyle = "#425aef";
        context.fill();
      }
      context.restore();
    }
    frame = requestAnimationFrame(draw);
  };

  resize();
  shuffle();
  draw();
  resources.listen(window, "resize", () => {
    resize();
    shuffle();
  });
  resources.listen(button, "click", shuffle);
  resources.defer(() => cancelAnimationFrame(frame));
}
