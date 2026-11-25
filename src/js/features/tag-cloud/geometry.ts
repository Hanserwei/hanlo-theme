export interface Vector {
  x: number;
  y: number;
  z: number;
}

export interface Rotation extends Vector {
  w: number;
}

export interface Projection extends Vector {
  scale: number;
}

const camera = 2.65;
export const sphereSilhouette = camera / Math.sqrt(camera ** 2 - 1);

export function tagTier(count: number, min: number, max: number): number {
  if (min === max) return max > 1 ? 2 : 1;
  const floor = Math.log1p(min);
  const weight = (Math.log1p(count) - floor) / (Math.log1p(max) - floor);
  return 1 + Math.min(3, Math.floor(weight * 4));
}

export function fibonacciSphere(count: number): Vector[] {
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  return Array.from({ length: count }, (_, index) => {
    const y = 1 - (2 * (index + 0.5)) / count;
    const ring = Math.sqrt(1 - y * y);
    const angle = index * goldenAngle;
    return { x: Math.cos(angle) * ring, y, z: Math.sin(angle) * ring };
  });
}

export function axisRotation(axis: Vector, angle: number): Rotation {
  const factor = Math.sin(angle / 2) / (Math.hypot(axis.x, axis.y, axis.z) || 1);
  return { x: axis.x * factor, y: axis.y * factor, z: axis.z * factor, w: Math.cos(angle / 2) };
}

export function composeRotation(a: Rotation, b: Rotation): Rotation {
  const x = a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y;
  const y = a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x;
  const z = a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w;
  const w = a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z;
  const length = Math.hypot(x, y, z, w) || 1;
  return { x: x / length, y: y / length, z: z / length, w: w / length };
}

/** Map the pointer onto a sphere with a smooth falloff beyond its silhouette. */
export function trackball(x: number, y: number): Vector {
  const d = x * x + y * y;
  const z = d <= 0.5 ? Math.sqrt(1 - d) : 0.5 / Math.sqrt(d);
  const length = Math.hypot(x, y, z);
  return { x: x / length, y: y / length, z: z / length };
}

export function trackballRotation(from: Vector, to: Vector): Rotation {
  const axis = {
    x: from.y * to.z - from.z * to.y,
    y: from.z * to.x - from.x * to.z,
    z: from.x * to.y - from.y * to.x,
  };
  const dot = from.x * to.x + from.y * to.y + from.z * to.z;
  return axisRotation(axis, Math.atan2(Math.hypot(axis.x, axis.y, axis.z), dot));
}

export function makeProjection(rotation: Rotation, radius: number) {
  const { x, y, z, w } = rotation;
  const xx = 2 * x * x;
  const yy = 2 * y * y;
  const zz = 2 * z * z;
  const xy = 2 * x * y;
  const xz = 2 * x * z;
  const yz = 2 * y * z;
  const wx = 2 * w * x;
  const wy = 2 * w * y;
  const wz = 2 * w * z;
  return (point: Vector, result: Projection): void => {
    const a = point.x * (1 - yy - zz) + point.y * (xy - wz) + point.z * (xz + wy);
    const b = point.x * (xy + wz) + point.y * (1 - xx - zz) + point.z * (yz - wx);
    const depth = point.x * (xz - wy) + point.y * (yz + wx) + point.z * (1 - xx - yy);
    const scale = camera / (camera - depth);
    result.x = a * radius * scale;
    result.y = b * radius * scale;
    result.z = depth;
    result.scale = scale;
  };
}

/** Bound the projected sphere plus half a billboard across every possible depth. */
export function fitRadius(halfViewport: number, halfLabel: number): number {
  const inner = Math.max(0, halfViewport - halfLabel);
  return Math.sqrt(Math.max(0, inner ** 2 - (halfViewport / camera) ** 2));
}
