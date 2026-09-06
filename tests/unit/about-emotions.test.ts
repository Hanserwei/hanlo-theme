import { readFileSync, readdirSync } from "node:fs";

import Matter from "matter-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parse } from "yaml";

import { PageResourceScope } from "../../src/js/core/resource-scope";
import {
  MotionFilter,
  mountMotion,
  screenVector,
} from "../../src/js/features/about-emotions/motion";
import {
  DEFAULT_EMOTIONS,
  EMOTION_IDS,
  EmotionPhysics,
  distributeEmotions,
  emotionCount,
  emotionSelection,
  playgroundHeight,
} from "../../src/js/features/about-emotions/physics";

const tick = (world: EmotionPhysics, count = 720): void => {
  for (let index = 0; index < count; index++) world.step();
};

function expectInside(world: EmotionPhysics, width: number, height: number): void {
  for (const body of world.balls) {
    expect(Number.isFinite(body.angle)).toBe(true);
    expect(body.position.x).toBeGreaterThanOrEqual(world.radius);
    expect(body.position.x).toBeLessThanOrEqual(width - world.radius);
    expect(body.position.y).toBeGreaterThanOrEqual(world.radius);
    expect(body.position.y).toBeLessThanOrEqual(height - world.radius);
  }
}

describe("yellow emotion configuration", () => {
  it("supports old configurations, explicit empty selections, duplicates and invalid values", () => {
    expect(emotionSelection(undefined)).toEqual(DEFAULT_EMOTIONS);
    expect(emotionSelection("")).toEqual([]);
    expect(emotionSelection("25,25,6,16,31,34,62,100,124,../image,2")).toEqual([25, 2]);
    expect(emotionCount(undefined)).toBe(24);
    expect(emotionCount("")).toBe(24);
    expect(emotionCount("oops")).toBe(24);
    expect(emotionCount("100000")).toBe(48);
    expect(emotionCount("0")).toBe(1);
    expect(emotionCount("5.4")).toBe(5);
  });

  it("distributes the chosen faces evenly and never invents a choice", () => {
    const result = distributeEmotions([2, 25, 28], 8);
    expect(result).toHaveLength(8);
    for (const id of [2, 25, 28]) {
      expect(result.filter((value) => value === id).length).toBeGreaterThanOrEqual(2);
      expect(result.filter((value) => value === id).length).toBeLessThanOrEqual(3);
    }
    expect(new Set(distributeEmotions([2, 25, 28], 2)).size).toBe(2);
    expect(distributeEmotions([], 24)).toEqual([]);
  });

  it("keeps every selectable image local and the yellow-only asset catalog in sync", () => {
    const settings = parse(readFileSync("settings.yaml", "utf8"));
    const about = settings.spec.forms.find((form: { group: string }) => form.group === "about");
    const selector = about.formSchema.find((field: { name: string }) => field.name === "emotions");
    const options = selector.options as { value: string; icon: string }[];
    expect(options.map((option) => Number(option.value))).toEqual(EMOTION_IDS);
    expect(selector.value.map(Number)).toEqual(DEFAULT_EMOTIONS);
    const files = readdirSync("public/assets/images/tieba").filter((file) => file.endsWith(".png"));
    expect(files).toHaveLength(EMOTION_IDS.length);
    for (const option of options) {
      expect(option.icon.startsWith("/themes/theme-hanlo/assets/images/tieba/")).toBe(true);
      expect(files).toContain(option.icon.split("/").at(-1));
    }
    expect(about.formSchema.some((field: { name: string }) => field.name === "helloAbout")).toBe(
      false,
    );
  });
});

describe("emotion rigid bodies", () => {
  it("falls, collides and settles into a pile with a uniform circular radius", () => {
    const width = 360;
    const height = playgroundHeight(width, 24);
    const world = new EmotionPhysics(width, height, 24);
    tick(world, 1_200);
    expectInside(world, width, height);
    for (const [index, body] of world.balls.entries()) {
      expect(body.circleRadius).toBe(28);
      for (const other of world.balls.slice(index + 1)) {
        expect(
          Math.hypot(body.position.x - other.position.x, body.position.y - other.position.y),
        ).toBeGreaterThan(50);
      }
    }
    expect(world.balls.some((body) => body.position.y > height - 32)).toBe(true);
    expect(world.balls.every((body) => body.speed < 0.1)).toBe(true);
    world.dispose();
  });

  it("survives repeated shakes, extreme velocities and a desktop-to-phone resize", () => {
    const world = new EmotionPhysics(1_200, playgroundHeight(1_200, 48), 48);
    tick(world, 120);
    const height = playgroundHeight(320, 48);
    world.resize(320, height);
    for (let shake = 0; shake < 6; shake++) {
      world.toss();
      world.nudge(100, -100);
      world.gravity(shake % 2 ? -1 : 1, 0.6);
      tick(world, 60);
      expectInside(world, 320, height);
    }
    Matter.Body.setVelocity(world.balls[0]!, { x: 1_000, y: -1_000 });
    tick(world);
    expectInside(world, 320, height);
    world.dispose();
  });

  it("drags against a constraint, releases momentum, and clears the physics world", () => {
    const world = new EmotionPhysics(500, 320, 1);
    const body = world.balls[0]!;
    world.grab(0, { x: body.position.x, y: body.position.y });
    world.move({ x: 350, y: 100 });
    tick(world, 30);
    expect(body.position.x).toBeCloseTo(350, 0);
    world.move({ x: 450, y: 100 });
    tick(world, 4);
    world.release();
    expect(body.velocity.x).toBeGreaterThan(0);
    expect(world.engine.world.constraints).toHaveLength(0);
    tick(world);
    expectInside(world, 500, 320);
    world.dispose();
    expect(world.engine.world.bodies).toHaveLength(0);
  });
});

const acceleration = (x: number | null, y: number | null) => ({ x, y, z: null });
const sample = (x = 0, y = -9.81) => ({
  acceleration: acceleration(0, 0),
  accelerationIncludingGravity: acceleration(x, y),
  interval: 16,
});

describe("phone motion", () => {
  it("rotates portrait and landscape sensor coordinates into screen coordinates", () => {
    expect(screenVector(2, -3, 0)).toEqual({ x: 2, y: 3 });
    expect(screenVector(-9.81, 0, 90).y).toBeCloseTo(9.81);
    expect(screenVector(9.81, 0, 270).y).toBeCloseTo(9.81);
  });

  it("separates gravity from shaking, filters noise, and ignores missing readings", () => {
    const filter = new MotionFilter();
    expect(filter.sample(sample(), 0)?.gravity.y).toBeCloseTo(1);
    const shaking = filter.sample({ ...sample(6, -9.81), acceleration: acceleration(6, 0) }, 0)!;
    expect(shaking.gravity.x).toBeCloseTo(0);
    expect(shaking.impulse.x).toBeLessThan(0);
    expect(
      filter.sample({ ...sample(), accelerationIncludingGravity: acceleration(null, null) }, 0),
    ).toBeUndefined();
    expect(
      filter.sample({ ...sample(), accelerationIncludingGravity: acceleration(NaN, Infinity) }, 0),
    ).toBeUndefined();
    expect(new MotionFilter().sample(sample(0, 0), 0)?.gravity).toEqual({ x: 0, y: 0.65 });
    const fallback = new MotionFilter();
    fallback.sample({ ...sample(), acceleration: null }, 0);
    expect(fallback.sample({ ...sample(6, -9.81), acceleration: null }, 0)?.impulse.x).toBeLessThan(
      0,
    );
  });
});

class MotionButton extends EventTarget {
  hidden = true;
  disabled = false;
  textContent = "";
  attributes = new Map<string, string>();
  setAttribute(key: string, value: string): void {
    this.attributes.set(key, value);
  }
}

function motionFixture(requestPermission: () => Promise<PermissionState>) {
  const windowTarget = Object.assign(new EventTarget(), {
    isSecureContext: true,
    DeviceMotionEvent: { requestPermission },
    screen: { orientation: { angle: 0 } },
  });
  vi.stubGlobal("window", windowTarget);
  const button = new MotionButton();
  const status = new MotionButton();
  const world = new EmotionPhysics(400, 320, 2);
  const resources = new PageResourceScope();
  const resume = vi.fn();
  const wake = vi.fn();
  mountMotion(
    button as unknown as HTMLButtonElement,
    status as unknown as HTMLElement,
    world,
    resources,
    () => true,
    resume,
    wake,
  );
  return { button, status, world, resources, resume, windowTarget };
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("motion permission lifecycle", () => {
  it("asks only on a click and leaves dragging available after a denial", async () => {
    const request = vi.fn(async () => "denied" as const);
    const fixture = motionFixture(request);
    expect(request).not.toHaveBeenCalled();
    fixture.button.dispatchEvent(new Event("click"));
    expect(request).toHaveBeenCalledOnce();
    await Promise.resolve();
    expect(fixture.status.textContent).toContain("未获得");
    expect(fixture.button.disabled).toBe(false);
    expect(fixture.resume).not.toHaveBeenCalled();
    await fixture.resources.dispose();
    fixture.world.dispose();
  });

  it("does not start sensors after the page was disposed during a permission prompt", async () => {
    const { promise, resolve } = Promise.withResolvers<PermissionState>();
    const fixture = motionFixture(() => promise);
    fixture.button.dispatchEvent(new Event("click"));
    await fixture.resources.dispose();
    resolve("granted");
    await Promise.resolve();
    expect(fixture.resume).not.toHaveBeenCalled();
    fixture.world.dispose();
  });

  it("times out unavailable sensors and removes listeners when leaving the page", async () => {
    vi.useFakeTimers();
    const fixture = motionFixture(async () => "granted");
    fixture.button.dispatchEvent(new Event("click"));
    await Promise.resolve();
    expect(fixture.button.attributes.get("aria-pressed")).toBe("true");
    vi.advanceTimersByTime(3_000);
    expect(fixture.status.textContent).toContain("未收到");
    expect(fixture.button.attributes.get("aria-pressed")).toBe("false");
    await fixture.resources.dispose();
    const message = fixture.status.textContent;
    fixture.button.dispatchEvent(new Event("click"));
    fixture.windowTarget.dispatchEvent(Object.assign(new Event("devicemotion"), sample(9.81, 0)));
    expect(fixture.status.textContent).toBe(message);
    fixture.world.dispose();
  });
});
