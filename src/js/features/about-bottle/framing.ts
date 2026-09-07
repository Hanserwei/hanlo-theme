import { BOTTLE_PROFILE } from "./math";

export const BOTTLE_VIEW = Object.freeze({
  fov: 39,
  azimuth: 0.32,
  elevation: 0.22,
  target: [0.2, -0.3, 0] as const,
});

/** Fit the bottle itself, leaving vertical room for the heading and chapter navigation. */
export function fitBottleDistance(
  aspect: number,
  azimuth: number = BOTTLE_VIEW.azimuth,
  elevation: number = BOTTLE_VIEW.elevation,
): number {
  const tanHalfFov = Math.tan((BOTTLE_VIEW.fov * Math.PI) / 360);
  const horizontal = tanHalfFov * Math.max(0.2, aspect) * 0.88;
  const vertical = tanHalfFov * 0.68;
  const sinA = Math.sin(azimuth),
    cosA = Math.cos(azimuth);
  const sinE = Math.sin(elevation),
    cosE = Math.cos(elevation);
  let distance = 8;
  // Include the wax seal beyond the glass profile. A small shell margin covers storm rocking.
  for (const [x, radius] of [...BOTTLE_PROFILE, [6.5, 0.8] as const]) {
    for (let i = 0; i < 32; i += 1) {
      const angle = (i / 32) * Math.PI * 2;
      const dx = x - BOTTLE_VIEW.target[0];
      const dy = Math.cos(angle) * (radius + 0.16) - BOTTLE_VIEW.target[1];
      const dz = Math.sin(angle) * (radius + 0.16) - BOTTLE_VIEW.target[2];
      const right = dx * cosA - dz * sinA;
      const up = -dx * sinA * sinE + dy * cosE - dz * cosA * sinE;
      const towardCamera = dx * sinA * cosE + dy * sinE + dz * cosA * cosE;
      distance = Math.max(
        distance,
        towardCamera + Math.abs(right) / horizontal,
        towardCamera + Math.abs(up) / vertical,
      );
    }
  }
  return distance;
}

/** Bound the full-width drawing buffer independently of the display's physical size. */
export function bottlePixelRatio(width: number, height: number, devicePixelRatio: number): number {
  return Math.min(devicePixelRatio, 1.6, Math.sqrt(3_600_000 / Math.max(1, width * height)));
}
