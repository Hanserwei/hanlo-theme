import type { PageResourceScope } from "../../core/resource-scope";
import { clamp, type EmotionPhysics } from "./physics";

interface MotionVector {
  x: number;
  y: number;
}

type MotionPermission = typeof DeviceMotionEvent & {
  requestPermission?: () => Promise<PermissionState>;
};

export function screenVector(x: number, y: number, angle: number): MotionVector {
  const radians = (angle * Math.PI) / 180;
  return {
    x: x * Math.cos(radians) - y * Math.sin(radians),
    y: -(x * Math.sin(radians) + y * Math.cos(radians)),
  };
}

function usable(
  value: DeviceMotionEventAcceleration | null,
): value is DeviceMotionEventAcceleration & MotionVector {
  return (
    typeof value?.x === "number" &&
    Number.isFinite(value.x) &&
    typeof value.y === "number" &&
    Number.isFinite(value.y)
  );
}

export class MotionFilter {
  #gravity: MotionVector | undefined;

  sample(
    event: Pick<DeviceMotionEvent, "acceleration" | "accelerationIncludingGravity" | "interval">,
    angle: number,
  ): { gravity: MotionVector; impulse: MotionVector } | undefined {
    const combined = event.accelerationIncludingGravity;
    const linear = event.acceleration;
    if (!usable(combined)) return undefined;
    const measured = usable(linear)
      ? { x: combined.x - linear.x, y: combined.y - linear.y }
      : combined;
    const previous = this.#gravity ?? measured;
    const smoothing = 1 - Math.exp(-clamp(event.interval || 16, 8, 100) / 100);
    this.#gravity = {
      x: previous.x + (measured.x - previous.x) * smoothing,
      y: previous.y + (measured.y - previous.y) * smoothing,
    };
    const acceleration = usable(linear)
      ? linear
      : { x: combined.x - this.#gravity.x, y: combined.y - this.#gravity.y };
    const gravity = screenVector(this.#gravity.x / 9.81, this.#gravity.y / 9.81, angle);
    const inertia = screenVector(-acceleration.x, -acceleration.y, angle);
    const interval = clamp(event.interval || 16, 8, 50) / 1_000;
    return {
      gravity:
        Math.hypot(gravity.x, gravity.y) < 0.12
          ? { x: 0, y: 0.65 }
          : { x: clamp(gravity.x, -1.4, 1.4), y: clamp(gravity.y, -1.4, 1.4) },
      impulse: { x: inertia.x * interval * 5, y: inertia.y * interval * 5 },
    };
  }
}

export function mountMotion(
  button: HTMLButtonElement,
  status: HTMLElement,
  world: EmotionPhysics,
  resources: PageResourceScope,
  active: () => boolean,
  resume: () => void,
  wake: () => void,
): void {
  const motion = window.DeviceMotionEvent as MotionPermission | undefined;
  if (!window.isSecureContext || !motion) return;
  button.hidden = false;
  let enabled = false;
  let pending = false;
  let filter = new MotionFilter();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let lastReading = 0;

  const disable = (message: string): void => {
    enabled = false;
    pending = false;
    button.disabled = false;
    button.textContent = "开启手机感应";
    button.setAttribute("aria-pressed", "false");
    status.textContent = message;
    world.gravity(0, 1);
    if (timer) clearTimeout(timer);
    wake();
  };

  resources.listen(button, "click", () => {
    if (pending) return;
    if (enabled) {
      disable("手机感应已关闭，可以继续拖动或摇一摇。");
      return;
    }
    pending = true;
    button.disabled = true;
    const enable = async (): Promise<void> => {
      try {
        // iOS permission must be requested directly within this click gesture.
        const permission = motion.requestPermission ? await motion.requestPermission() : "granted";
        if (resources.disposed) return;
        if (permission !== "granted") {
          disable("未获得运动感应权限，可以继续拖动或摇一摇。");
          return;
        }
        pending = false;
        enabled = true;
        filter = new MotionFilter();
        lastReading = 0;
        button.disabled = false;
        button.textContent = "关闭手机感应";
        button.setAttribute("aria-pressed", "true");
        status.textContent = "正在连接手机感应，请轻轻倾斜或晃动手机。";
        resume();
        timer = resources.timeout(() => {
          if (!lastReading && enabled) disable("未收到运动数据，可以继续拖动或摇一摇。");
        }, 3_000);
      } catch {
        if (!resources.disposed) disable("此浏览器暂时无法使用手机感应，可以继续拖动或摇一摇。");
      }
    };
    void enable();
  });

  resources.listen(
    window,
    "devicemotion",
    (rawEvent) => {
      if (!enabled || !active()) return;
      const now = performance.now();
      if (lastReading && now - lastReading < 12) return;
      if (now - lastReading > 500) filter = new MotionFilter();
      const angle =
        window.screen.orientation?.angle ??
        (window as Window & { orientation?: number }).orientation ??
        0;
      const reading = filter.sample(rawEvent as DeviceMotionEvent, angle);
      if (!reading) return;
      if (!lastReading) {
        if (timer) clearTimeout(timer);
        status.textContent = "手机感应已开启，倾斜改变方向，轻晃让表情跳起来。";
      }
      lastReading = now;
      world.gravity(reading.gravity.x, reading.gravity.y);
      world.nudge(reading.impulse.x, reading.impulse.y);
      wake();
    },
    { passive: true },
  );
  resources.defer(() => {
    enabled = false;
    if (timer) clearTimeout(timer);
  });
}
