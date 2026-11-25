import { type Projection, type Vector, sphereSilhouette } from "./geometry";

function sphereRings(): Vector[][] {
  const angles = Array.from({ length: 45 }, (_, step) => (Math.PI * 2 * step) / 44);
  const latitudes = [-0.56, 0, 0.56].map((y) => {
    const r = Math.sqrt(1 - y * y);
    return angles.map((angle) => ({ x: r * Math.cos(angle), y, z: r * Math.sin(angle) }));
  });
  const meridians = [0, Math.PI / 3, (Math.PI * 2) / 3].map((longitude) =>
    angles.map((angle) => ({
      x: Math.cos(longitude) * Math.sin(angle),
      y: Math.cos(angle),
      z: Math.sin(longitude) * Math.sin(angle),
    })),
  );
  return [...latitudes, ...meridians];
}

type Project = (point: Vector, result: Projection) => void;

export function createWireframe(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const rings = sphereRings();
  const point: Projection = { x: 0, y: 0, z: 0, scale: 1 };
  let width = 0;
  let height = 0;
  let color = "";

  return {
    resize(w: number, h: number): void {
      width = w;
      height = h;
      const resolution = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(width * resolution);
      canvas.height = Math.round(height * resolution);
      ctx.setTransform(
        resolution,
        0,
        0,
        resolution,
        (resolution * width) / 2,
        (resolution * height) / 2,
      );
    },
    syncColor(): void {
      color = getComputedStyle(canvas).color;
    },
    draw(project: Project, radius: number): void {
      ctx.clearRect(-width / 2, -height / 2, width, height);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.arc(0, 0, radius * sphereSilhouette, 0, Math.PI * 2);
      ctx.stroke();

      ctx.globalAlpha = 0.18;
      ctx.beginPath();
      for (const ring of rings) {
        project(ring[0], point);
        ctx.moveTo(point.x, point.y);
        for (let i = 1; i < ring.length; i++) {
          project(ring[i], point);
          ctx.lineTo(point.x, point.y);
        }
      }
      ctx.stroke();

      ctx.globalAlpha = 0.36;
      ctx.beginPath();
      for (const ring of rings) {
        let x = 0;
        let y = 0;
        let front = false;
        for (const vertex of ring) {
          project(vertex, point);
          if (front && point.z > 0) {
            ctx.moveTo(x, y);
            ctx.lineTo(point.x, point.y);
          }
          x = point.x;
          y = point.y;
          front = point.z > 0;
        }
      }
      ctx.stroke();
    },
  };
}
