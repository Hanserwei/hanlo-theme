import { describe, expect, it } from "vitest";

import {
  advanceTime,
  BOTTLE_PROFILE,
  bottleRadius,
  daylight,
  insideBottle,
  nextSpeed,
  resolutionScale,
  SEA_LEVEL,
  shipPose,
  waveHeight,
} from "../../src/js/features/about-bottle/math";
import { THREE_CDN } from "../../src/js/features/about-bottle/three-loader";

describe("bottle ocean simulation", () => {
  it("closes the bottle at both ends and narrows the neck", () => {
    expect(bottleRadius(-6)).toBe(0);
    expect(bottleRadius(6.3)).toBe(0);
    expect(bottleRadius(0)).toBe(2.25);
    expect(bottleRadius(5)).toBe(0.72);
    for (const [x, radius] of BOTTLE_PROFILE) expect(bottleRadius(x)).toBeCloseTo(radius, 8);
    expect(insideBottle(5, 0, 1)).toBe(false);
    expect(insideBottle(0, 0, 2.3)).toBe(false);
    expect(insideBottle(0, SEA_LEVEL, 1)).toBe(true);
  });

  it("bounds storm waves and samples all four buoyancy points", () => {
    for (let time = 0; time < 220; time += 0.7) {
      for (const storm of [0, 0.5, 1]) {
        const pose = shipPose(time, storm);
        const fx = Math.cos(pose.heading),
          fz = -Math.sin(pose.heading);
        const rx = Math.sin(pose.heading),
          rz = Math.cos(pose.heading);
        const fore = waveHeight(pose.x + fx * 0.65, pose.z + fz * 0.65, time, storm);
        const aft = waveHeight(pose.x - fx * 0.65, pose.z - fz * 0.65, time, storm);
        const port = waveHeight(pose.x - rx * 0.25, pose.z - rz * 0.25, time, storm);
        const starboard = waveHeight(pose.x + rx * 0.25, pose.z + rz * 0.25, time, storm);
        expect(pose.y).toBeCloseTo((fore + aft + port + starboard) / 4, 10);
        expect(Math.abs(pose.y - SEA_LEVEL)).toBeLessThanOrEqual(0.393);
        expect(Math.abs(pose.pitch)).toBeLessThan(0.7);
        expect(Math.abs(pose.roll)).toBeLessThan(0.9);
        expect(insideBottle(pose.x, pose.y, pose.z, 0.3)).toBe(true);
      }
    }
  });

  it("keeps the sailing heading tangent to the elliptical course", () => {
    for (const time of [0, 3, 15, 27, 45, 70]) {
      const pose = shipPose(time, 0),
        next = shipPose(time + 0.001, 0);
      const dx = next.x - pose.x,
        dz = next.z - pose.z;
      expect(
        (dx * Math.cos(pose.heading) - dz * Math.sin(pose.heading)) / Math.hypot(dx, dz),
      ).toBeCloseTo(1, 6);
    }
  });

  it("cycles all timelapse speeds and never advances while paused or hidden", () => {
    expect([nextSpeed(1), nextSpeed(4), nextSpeed(12), nextSpeed(0)]).toEqual([4, 12, 0, 1]);
    expect(advanceTime(10, 0.02, 12)).toBeCloseTo(10.24);
    expect(advanceTime(10, 50, 1)).toBe(10.05);
    expect(advanceTime(10, 50, 0)).toBe(10);
    expect(advanceTime(10, -0.1, 1)).toBe(10);
  });

  it("cycles dawn, noon, dusk and midnight within a bounded light range", () => {
    const labels = new Set<string>();
    for (let time = 0; time < 180; time += 1) {
      const sky = daylight(time);
      labels.add(sky.label);
      expect(sky.light).toBeGreaterThanOrEqual(0);
      expect(sky.light).toBeLessThanOrEqual(1);
    }
    expect(labels).toEqual(new Set(["黎明", "正午", "黄昏", "子夜"]));
    expect(daylight(180).light).toBeCloseTo(daylight(0).light);
  });

  it("degrades and restores resolution within a fixed budget", () => {
    expect(resolutionScale(1.4, 29)).toBeLessThan(1.4);
    expect(resolutionScale(1, 12)).toBeGreaterThan(1);
    expect(resolutionScale(0.65, 50)).toBe(0.65);
    expect(resolutionScale(1.6, 8)).toBe(1.6);
    expect(THREE_CDN).toBe("https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js");
  });
});
