export interface CategoryTilt {
  readonly rotationX: number;
  readonly rotationY: number;
  readonly backgroundX: number;
  readonly backgroundY: number;
  readonly lightX: number;
  readonly lightY: number;
}

export function calculateTilt(
  pointerX: number,
  pointerY: number,
  width: number,
  height: number,
): CategoryTilt {
  const normalize = (value: number, size: number): number =>
    Number.isFinite(value) && Number.isFinite(size) && size > 0
      ? Math.max(-1, Math.min(1, (value / size - 0.5) * 2))
      : 0;
  const x = normalize(pointerX, width);
  const y = normalize(pointerY, height);
  return {
    rotationX: y === 0 ? 0 : -y * 10,
    rotationY: x * 12,
    backgroundX: x === 0 ? 0 : -x * 16,
    backgroundY: y === 0 ? 0 : -y * 16,
    lightX: (x + 1) * 50,
    lightY: (y + 1) * 50,
  };
}
