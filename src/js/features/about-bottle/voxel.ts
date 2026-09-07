import type { BufferGeometry, Group, Material, Object3D } from "three";

import type { Three } from "./three-loader";

type Cube = {
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
  color: number;
  ry: number;
  rz: number;
};
export class Voxels {
  readonly cubes: Cube[] = [];
  constructor(private readonly T: Three) {}
  box(
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
    color: number,
    ry = 0,
    rz = 0,
  ): void {
    this.cubes.push({ x, y, z, sx, sy, sz, color, ry, rz });
  }
  ball(x: number, y: number, z: number, radius: number, color: number, step = 0.12): void {
    for (let dx = -radius; dx <= radius; dx += step)
      for (let dy = -radius; dy <= radius; dy += step)
        for (let dz = -radius; dz <= radius; dz += step) {
          if (dx * dx + dy * dy + dz * dz < radius * radius)
            this.box(x + dx, y + dy, z + dz, step, step, step, color);
        }
  }
  build(parent: Object3D, material: Material, geometry?: BufferGeometry) {
    const mesh = new this.T.InstancedMesh(
      geometry ?? new this.T.BoxGeometry(1, 1, 1),
      material,
      this.cubes.length,
    );
    const dummy = new this.T.Object3D();
    const color = new this.T.Color();
    this.cubes.forEach((cube, index) => {
      dummy.position.set(cube.x, cube.y, cube.z);
      dummy.rotation.set(0, cube.ry, cube.rz);
      dummy.scale.set(cube.sx, cube.sy, cube.sz);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
      mesh.setColorAt(index, color.setHex(cube.color));
    });
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
}

export function rope(T: Three, parent: Group, material: Material, points: number[][]): void {
  const geometry = new T.BufferGeometry().setFromPoints(
    points.map((p) => new T.Vector3(p[0], p[1], p[2])),
  );
  parent.add(new T.Line(geometry, material));
}

export function seededRandom(seed = 12345): () => number {
  let state = seed;
  return () => {
    state = Math.imul(state ^ (state >>> 15), 1 | state);
    state ^= state + Math.imul(state ^ (state >>> 7), 61 | state);
    return ((state ^ (state >>> 14)) >>> 0) / 4294967296;
  };
}
