import type { BottleMaterials } from "./materials";
import type { Three } from "./three-loader";
import { rope, Voxels } from "./voxel";

export function buildShip(T: Three, materials: BottleMaterials) {
  const ship = new T.Group();
  ship.rotation.order = "YXZ";
  const wood = new Voxels(T);
  // Individual stepped planks form a pointed bow and raised stern.
  for (let x = -0.86; x < 0.9; x += 0.12) {
    const width = 0.27 * Math.sqrt(Math.max(0, 1 - (x / 0.98) ** 2));
    for (let row = 0; row < 4; row += 1) {
      const breadth = width * (0.5 + row * 0.17);
      wood.box(x, -0.17 + row * 0.085, 0, 0.125, 0.085, breadth * 2, row % 2 ? 0x935a32 : 0x623821);
    }
    wood.box(x, 0.16, 0, 0.12, 0.045, width * 2, 0xc4935d);
    wood.box(x, 0.25, width, 0.13, 0.085, 0.028, 0xe9c98f);
    wood.box(x, 0.25, -width, 0.13, 0.085, 0.028, 0xe9c98f);
  }
  wood.box(-0.59, 0.32, 0, 0.37, 0.3, 0.39, 0x70452b);
  wood.box(-0.59, 0.49, 0, 0.44, 0.055, 0.44, 0xb7864d);
  wood.box(0.94, 0.27, 0, 0.48, 0.045, 0.045, 0x61422b, 0, 0.23);
  wood.box(-0.94, -0.06, 0, 0.06, 0.3, 0.18, 0x4b3025);
  const canvas = new Voxels(T);
  const rig: number[][][] = [];
  const masts = [
    [-0.52, 1.24],
    [0, 1.58],
    [0.52, 1.36],
  ];
  masts.forEach(([x = 0, height = 1], mast) => {
    wood.box(x, height / 2 + 0.19, 0, 0.045, height, 0.045, 0x583e27);
    for (let tier = 0; tier < 3; tier += 1) {
      const top = height + 0.1 - tier * 0.37;
      const half = 0.2 + tier * 0.072;
      wood.box(x, top, 0, 0.045, 0.035, half * 2 + 0.06, 0x5e3d27);
      for (let row = 0; row < 5; row += 1)
        for (let col = -4; col <= 4; col += 1) {
          const z = (col * half) / 4;
          const bulge = Math.sin(((row + 0.5) / 5) * Math.PI) * 0.065 * (1 - (col / 5) ** 2);
          const red = mast === 1 && (Math.abs(col) <= 0 || row === 2);
          canvas.box(
            x + bulge,
            top - 0.04 - row * 0.052,
            z,
            0.018,
            0.055,
            half / 4 + 0.004,
            red ? 0xb33832 : (row + col) % 3 ? 0xf2dfb3 : 0xe6c995,
          );
        }
      for (const side of [-1, 1]) {
        rig.push([
          [x, height + 0.18, 0],
          [x, top, side * half],
          [x - 0.17, 0.24, side * 0.24],
        ]);
      }
    }
    for (const z of [-0.24, 0.24]) {
      rig.push([
        [x - 0.18, 0.2, z],
        [x, height + 0.18, 0],
        [x + 0.18, 0.2, z],
      ]);
      for (let rung = 1; rung < 8; rung += 1) {
        const u = rung / 9;
        rig.push([
          [x - 0.18 * (1 - u), 0.2 + height * u, z * (1 - u)],
          [x + 0.18 * (1 - u), 0.2 + height * u, z * (1 - u)],
        ]);
      }
    }
    canvas.box(x + 0.1, height + 0.19, 0, 0.19, 0.08, 0.02, mast === 1 ? 0xc64037 : 0xe6cd91);
  });
  rig.push([
    [-0.9, 0.24, 0],
    [-0.52, 1.45, 0],
    [0, 1.79, 0],
    [0.52, 1.57, 0],
    [1.15, 0.32, 0],
  ]);
  // Triangular jib, built as tapering rows of sail cloth.
  for (let row = 0; row < 7; row += 1)
    canvas.box(0.73 + row * 0.035, 1.15 - row * 0.11, 0, 0.05 + row * 0.045, 0.105, 0.02, 0xe8d6a8);
  wood.build(ship, materials.solid);
  const sails = new T.Group();
  canvas.build(sails, materials.solid);
  ship.add(sails);
  const segments = rig.flatMap((points) =>
    points.slice(1).flatMap((point, i) => [...points[i]!, ...point]),
  );
  const rigGeometry = new T.BufferGeometry();
  rigGeometry.setAttribute("position", new T.Float32BufferAttribute(segments, 3));
  ship.add(new T.LineSegments(rigGeometry, materials.rope));
  const lamps = new Voxels(T);
  for (const z of [-0.205, 0.205])
    for (const x of [-0.7, -0.56, -0.42]) lamps.box(x, 0.35, z, 0.08, 0.08, 0.015, 0xffd27b);
  lamps.build(ship, materials.glow);
  rope(T, ship, materials.rope, [
    [-0.84, 0.4, -0.24],
    [-0.84, 0.5, 0],
    [-0.84, 0.4, 0.24],
  ]);
  ship.userData["chapter"] = "voyage";
  return { ship, sails };
}
