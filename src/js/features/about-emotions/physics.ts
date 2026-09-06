import Matter from "matter-js";

const { Bodies, Body, Composite, Constraint, Engine, Sleeping } = Matter;

export const EMOTION_DIAMETER = 56;
export const MAX_EMOTIONS = 48;
export const DEFAULT_EMOTIONS = [1, 2, 3, 5, 22, 25, 26, 28];
export const EMOTION_IDS = [
  ...Array.from({ length: 33 }, (_, index) => index + 1).filter((id) => ![6, 16, 31].includes(id)),
  ...Array.from({ length: 11 }, (_, index) => index + 66),
  ...Array.from({ length: 9 }, (_, index) => index + 85),
  ...Array.from({ length: 4 }, (_, index) => index + 95),
];

export function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

export function emotionSelection(value: string | undefined): number[] {
  if (value === undefined) return [...DEFAULT_EMOTIONS];
  return [...new Set(value.split(",").map(Number))].filter((id) => EMOTION_IDS.includes(id));
}

export function emotionCount(value: string | undefined): number {
  const parsed = Number(value);
  return value?.trim() && Number.isFinite(parsed) ? clamp(Math.round(parsed), 1, MAX_EMOTIONS) : 24;
}

export function distributeEmotions(ids: readonly number[], count: number): number[] {
  if (ids.length === 0) return [];
  const shuffled = [...ids];
  for (let index = shuffled.length - 1; index > 0; index--) {
    const other = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[other]] = [shuffled[other]!, shuffled[index]!];
  }
  return Array.from({ length: count }, (_, index) => shuffled[index % shuffled.length]!);
}

export function playgroundHeight(width: number, count: number): number {
  const columns = Math.max(1, Math.floor((width - 16) / (EMOTION_DIAMETER + 4)));
  return Math.max(320, Math.ceil(count / columns) * (EMOTION_DIAMETER + 4) + 64);
}

export class EmotionPhysics {
  readonly engine = Engine.create({ enableSleeping: true });
  readonly balls: Matter.Body[];
  readonly radius = EMOTION_DIAMETER / 2;
  #walls: Matter.Body[] = [];
  #drag: Matter.Constraint | undefined;
  #width: number;
  #height: number;

  constructor(width: number, height: number, count: number) {
    this.#width = width;
    this.#height = height;
    const columns = Math.max(1, Math.floor((width - 16) / (EMOTION_DIAMETER + 4)));
    const spacing = (width - 16) / columns;
    this.balls = Array.from({ length: count }, (_, index) => {
      const body = Bodies.circle(
        8 + spacing * ((index % columns) + 0.5),
        36 + Math.floor(index / columns) * (EMOTION_DIAMETER + 4),
        this.radius,
        { restitution: 0.58, friction: 0.18, frictionStatic: 0.5, frictionAir: 0.012 },
      );
      Body.setAngle(body, (Math.random() - 0.5) * 0.6);
      return body;
    });
    Composite.add(this.engine.world, this.balls);
    this.resize(width, height);
  }

  resize(width: number, height: number): void {
    this.release();
    Composite.remove(this.engine.world, this.#walls);
    const thickness = 120;
    this.#walls = [
      Bodies.rectangle(width / 2, -thickness / 2, width + thickness * 2, thickness, {
        isStatic: true,
      }),
      Bodies.rectangle(width / 2, height + thickness / 2, width + thickness * 2, thickness, {
        isStatic: true,
      }),
      Bodies.rectangle(-thickness / 2, height / 2, thickness, height, { isStatic: true }),
      Bodies.rectangle(width + thickness / 2, height / 2, thickness, height, { isStatic: true }),
    ];
    Composite.add(this.engine.world, this.#walls);
    for (const body of this.balls) {
      Body.setPosition(body, {
        x: clamp((body.position.x / this.#width) * width, this.radius, width - this.radius),
        y: clamp((body.position.y / this.#height) * height, this.radius, height - this.radius),
      });
      Sleeping.set(body, false);
    }
    this.#width = width;
    this.#height = height;
  }

  step(): void {
    // Fixed 120 Hz physics; fast throws cannot skip a whole neighbouring circle.
    for (const body of this.balls) {
      const speed = Math.hypot(body.velocity.x, body.velocity.y);
      if (speed > 18)
        Body.setVelocity(body, {
          x: (body.velocity.x * 18) / speed,
          y: (body.velocity.y * 18) / speed,
        });
      Body.setAngularVelocity(body, clamp(body.angularVelocity, -0.3, 0.3));
    }
    Engine.update(this.engine, 1_000 / 120);
    for (const body of this.balls) {
      const x = clamp(body.position.x, this.radius, this.#width - this.radius);
      const y = clamp(body.position.y, this.radius, this.#height - this.radius);
      if (x !== body.position.x || y !== body.position.y) {
        Body.setVelocity(body, {
          x: x !== body.position.x ? -body.velocity.x * 0.5 : body.velocity.x,
          y: y !== body.position.y ? -body.velocity.y * 0.5 : body.velocity.y,
        });
        Body.setPosition(body, { x, y });
      }
    }
  }

  get moving(): boolean {
    return Boolean(this.#drag) || this.balls.some((body) => !body.isSleeping);
  }

  grab(index: number, point: Matter.Vector): void {
    this.release();
    const body = this.balls[index];
    if (!body) return;
    Sleeping.set(body, false);
    this.#drag = Constraint.create({
      pointA: point,
      bodyB: body,
      pointB: { x: point.x - body.position.x, y: point.y - body.position.y },
      length: 0,
      stiffness: 0.18,
      damping: 0.12,
    });
    Composite.add(this.engine.world, this.#drag);
  }

  move(point: Matter.Vector): void {
    if (!this.#drag) return;
    this.#drag.pointA = {
      x: clamp(point.x, this.radius, this.#width - this.radius),
      y: clamp(point.y, this.radius, this.#height - this.radius),
    };
    if (this.#drag.bodyB) Sleeping.set(this.#drag.bodyB, false);
  }

  release(): void {
    if (this.#drag) Composite.remove(this.engine.world, this.#drag);
    this.#drag = undefined;
  }

  toss(index?: number): void {
    for (const [bodyIndex, body] of this.balls.entries()) {
      if (index !== undefined && bodyIndex !== index) continue;
      Sleeping.set(body, false);
      Body.setVelocity(body, { x: (Math.random() - 0.5) * 13, y: -7 - Math.random() * 6 });
      Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.3);
    }
  }

  gravity(x: number, y: number): void {
    const previous = this.engine.gravity;
    if (Math.hypot(previous.x - x, previous.y - y) > 0.035) {
      for (const body of this.balls) Sleeping.set(body, false);
    }
    previous.x = x;
    previous.y = y;
  }

  nudge(x: number, y: number): void {
    if (Math.hypot(x, y) < 0.04) return;
    for (const body of this.balls) {
      Sleeping.set(body, false);
      Body.setVelocity(body, {
        x: body.velocity.x + clamp(x, -3, 3),
        y: body.velocity.y + clamp(y, -3, 3),
      });
    }
  }

  dispose(): void {
    this.release();
    Composite.clear(this.engine.world, false);
    Engine.clear(this.engine);
  }
}
