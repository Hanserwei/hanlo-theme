import { describe, expect, it } from "vitest";

import {
  type Projection,
  axisRotation,
  composeRotation,
  fibonacciSphere,
  fitRadius,
  makeProjection,
  tagTier,
  trackball,
  trackballRotation,
} from "../../src/js/features/tag-cloud/geometry";

const identity = { x: 0, y: 0, z: 0, w: 1 };
const projection: Projection = { x: 0, y: 0, z: 0, scale: 1 };

describe("3D tag cloud geometry", () => {
  it("distributes the complete tag set over a sphere", () => {
    const points = fibonacciSphere(92);
    expect(points).toHaveLength(92);
    expect(points.some((point) => point.z < -0.9)).toBe(true);
    expect(points.some((point) => point.z > 0.9)).toBe(true);
    for (const { x, y, z } of points) expect(Math.hypot(x, y, z)).toBeCloseTo(1, 12);
  });

  it("projects a near billboard at more than twice the scale of a far billboard", () => {
    const project = makeProjection(identity, 200);
    project({ x: 0, y: 0, z: -1 }, projection);
    const back = projection.scale;
    project({ x: 0, y: 0, z: 1 }, projection);
    expect(projection.scale / back).toBeGreaterThan(2);
    expect(projection.z).toBe(1);
  });

  it("flips the poles and turns around both axes with a diagonal drag", () => {
    const flip = axisRotation({ x: 1, y: 0, z: 0 }, Math.PI);
    const drag = trackballRotation(trackball(0, 0), trackball(0.4, -0.3));

    makeProjection(flip, 200)({ x: 0, y: 0, z: 1 }, projection);
    expect(projection.z).toBeCloseTo(-1);
    makeProjection(drag, 200)({ x: 0, y: 0, z: 1 }, projection);
    expect(projection.x).toBeGreaterThan(0);
    expect(projection.y).toBeLessThan(0);
    expect(composeRotation(flip, flip).w).toBeCloseTo(-1);
  });

  it("keeps a focused label inside a narrow viewport throughout its orbit", () => {
    const halfScreen = 145;
    const halfLabel = 42;
    const project = makeProjection(identity, fitRadius(halfScreen, halfLabel));
    for (let degree = 0; degree < 360; degree++) {
      const angle = (degree * Math.PI) / 180;
      project({ x: Math.sin(angle), y: 0, z: Math.cos(angle) }, projection);
      expect(Math.abs(projection.x) + halfLabel * projection.scale).toBeLessThanOrEqual(halfScreen);
    }
  });

  it("keeps four count tiers separate even with a steep long tail", () => {
    expect([0, 3, 12, 82].map((count) => tagTier(count, 0, 82))).toEqual([1, 2, 3, 4]);
    expect(tagTier(0, 0, 0)).toBe(1);
  });
});
