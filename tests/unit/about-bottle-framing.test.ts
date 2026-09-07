import { PerspectiveCamera, Vector3 } from "three";
import { describe, expect, it } from "vitest";

import {
  BOTTLE_VIEW,
  bottlePixelRatio,
  fitBottleDistance,
} from "../../src/js/features/about-bottle/framing";
import { BOTTLE_PROFILE } from "../../src/js/features/about-bottle/math";

function projection(width: number, height: number, azimuth: number, elevation: number) {
  const distance = fitBottleDistance(width / height, azimuth, elevation);
  const camera = new PerspectiveCamera(BOTTLE_VIEW.fov, width / height, 0.1, 180);
  const target = new Vector3(...BOTTLE_VIEW.target);
  camera.position.set(
    target.x + Math.sin(azimuth) * Math.cos(elevation) * distance,
    target.y + Math.sin(elevation) * distance,
    target.z + Math.cos(azimuth) * Math.cos(elevation) * distance,
  );
  camera.lookAt(target);
  camera.updateMatrixWorld(true);
  const points: Vector3[] = [];
  for (const [x, radius] of [...BOTTLE_PROFILE, [6.5, 0.8] as const]) {
    for (let i = 0; i < 64; i += 1) {
      const angle = (i / 64) * Math.PI * 2;
      points.push(
        new Vector3(x, Math.cos(angle) * radius, Math.sin(angle) * radius).project(camera),
      );
    }
  }
  return { distance, points };
}

describe("bottle-first camera framing", () => {
  it.each([
    [390, 780],
    [768, 960],
    [1440, 836],
    [2560, 1376],
    [3840, 1536],
  ])("fits the full bottle while using the available %i × %i viewport", (width, height) => {
    const { points, distance } = projection(
      width,
      height,
      BOTTLE_VIEW.azimuth,
      BOTTLE_VIEW.elevation,
    );
    expect(distance).toBeGreaterThan(8);
    for (const point of points) {
      expect(Math.abs(point.x)).toBeLessThan(0.89);
      expect(Math.abs(point.y)).toBeLessThan(0.69);
      expect(point.z).toBeLessThan(1);
    }
    const horizontalUse = Math.max(...points.map((point) => Math.abs(point.x)));
    const verticalUse = Math.max(...points.map((point) => Math.abs(point.y)));
    // The bottle reaches a usable edge; a distant camera cannot pass by merely fitting it.
    expect(horizontalUse > 0.8 || verticalUse > 0.6).toBe(true);
  });

  it("reframes a rotated bottle safely after portrait/landscape resize", () => {
    for (const azimuth of [0, Math.PI / 2, Math.PI, 4.8]) {
      for (const elevation of [0.1, 0.65, 1.1]) {
        const { points } = projection(768, 600, azimuth, elevation);
        expect(points.every((point) => Math.abs(point.x) < 0.89 && Math.abs(point.y) < 0.69)).toBe(
          true,
        );
      }
    }
  });

  it("brings the default wide-screen view closer than the old distant minimum", () => {
    expect(fitBottleDistance(2)).toBeLessThan(16);
  });

  it.each([
    [390, 780, 3],
    [1440, 836, 2],
    [3840, 1536, 1.5],
    [7680, 2160, 2],
  ])("bounds the drawing buffer at %i × %i and DPR %f", (width, height, devicePixelRatio) => {
    const ratio = bottlePixelRatio(width, height, devicePixelRatio);
    expect(ratio).toBeGreaterThan(0);
    expect(ratio).toBeLessThanOrEqual(Math.min(devicePixelRatio, 1.6));
    expect(width * height * ratio ** 2).toBeLessThanOrEqual(3_600_001);
  });
});
