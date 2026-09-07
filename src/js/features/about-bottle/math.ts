export const SEA_LEVEL = -0.48;
export const BOTTLE_PROFILE = [
  [-5.6, 0],
  [-5.5, 0.8],
  [-5.2, 1.65],
  [-4.7, 2.18],
  [-4.2, 2.25],
  [3.25, 2.25],
  [3.7, 2.05],
  [4.45, 0.85],
  [4.7, 0.72],
  [6.05, 0.72],
  [6.2, 0],
] as const;
export const SPEEDS = [1, 4, 12, 0] as const;
export type TimeSpeed = (typeof SPEEDS)[number];

export function bottleRadius(x: number): number {
  for (let i = 1; i < BOTTLE_PROFILE.length; i += 1) {
    const before = BOTTLE_PROFILE[i - 1]!;
    const after = BOTTLE_PROFILE[i]!;
    if (x >= before[0] && x <= after[0]) {
      return before[1] + ((after[1] - before[1]) * (x - before[0])) / (after[0] - before[0]);
    }
  }
  return 0;
}

export function insideBottle(x: number, y: number, z: number, margin = 0.12): boolean {
  const radius = bottleRadius(x) - margin;
  return radius > 0 && y * y + z * z < radius * radius;
}

/** Keep these coefficients identical to WAVE_GLSL. */
export function waveHeight(x: number, z: number, time: number, storm: number): number {
  const strength = Math.max(0, Math.min(1, storm));
  return (
    SEA_LEVEL +
    (0.045 + strength * 0.16) * Math.sin(x * 2.2 + time * 1.7) +
    (0.025 + strength * 0.09) * Math.sin(z * 3.1 - time * 1.3) +
    (0.018 + strength * 0.055) * Math.sin(x * 4.1 + z * 2.7 + time * 2.4)
  );
}

export function shipPose(time: number, storm: number) {
  const angle = time * 0.095;
  const x = -0.25 + Math.cos(angle) * 2.55;
  const z = Math.sin(angle) * 1.12;
  const heading = Math.atan2(-Math.cos(angle) * 1.12, -Math.sin(angle) * 2.55);
  const fx = Math.cos(heading),
    fz = -Math.sin(heading);
  const rx = Math.sin(heading),
    rz = Math.cos(heading);
  const fore = waveHeight(x + fx * 0.65, z + fz * 0.65, time, storm);
  const aft = waveHeight(x - fx * 0.65, z - fz * 0.65, time, storm);
  const port = waveHeight(x - rx * 0.25, z - rz * 0.25, time, storm);
  const starboard = waveHeight(x + rx * 0.25, z + rz * 0.25, time, storm);
  return {
    x,
    z,
    heading,
    y: (fore + aft + port + starboard) / 4,
    pitch: Math.atan2(fore - aft, 1.3),
    roll: Math.atan2(starboard - port, 0.5),
  };
}

export function advanceTime(time: number, delta: number, speed: TimeSpeed): number {
  return time + Math.max(0, Math.min(delta, 0.05)) * speed;
}

export function daylight(time: number) {
  const phase = (((time / 180 + 0.39) % 1) + 1) % 1;
  const elevation = Math.sin(phase * Math.PI * 2);
  const light = Math.max(0, Math.min(1, (elevation + 0.18) / 0.9));
  const label =
    phase < 0.12 || phase > 0.94 ? "黎明" : phase < 0.34 ? "正午" : phase < 0.55 ? "黄昏" : "子夜";
  return { phase, elevation, light, label };
}

export function nextSpeed(speed: TimeSpeed): TimeSpeed {
  return SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length]!;
}

export function resolutionScale(current: number, frameMs: number): number {
  if (frameMs > 23) return Math.max(0.65, current - 0.12);
  if (frameMs < 15) return Math.min(1.6, current + 0.06);
  return current;
}
