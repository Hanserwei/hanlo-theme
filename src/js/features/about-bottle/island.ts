import type { BottleMaterials } from "./materials";
import type { Three } from "./three-loader";
import { seededRandom, Voxels } from "./voxel";

export function buildIsland(T: Three, materials: BottleMaterials) {
  const island = new T.Group();
  island.position.set(-0.45, 0, 0);
  island.userData["chapter"] = "beacon";
  const blocks = new Voxels(T),
    lights = new Voxels(T);
  const random = seededRandom(2468);
  for (let x = -0.75; x < 0.76; x += 0.13)
    for (let z = -0.6; z < 0.61; z += 0.13) {
      const edge = (x * x) / 0.58 + (z * z) / 0.37;
      if (edge > 1) continue;
      const top = -0.31 + (1 - edge) * 0.16;
      blocks.box(
        x,
        top - 0.28,
        z,
        0.135,
        0.56,
        0.135,
        edge > 0.63 ? 0xe2c183 : random() > 0.5 ? 0x769662 : 0x517c58,
      );
    }
  // Lighthouse: stepped octagonal courses, red/ivory stripes and a brass lantern room.
  for (let floor = 0; floor < 13; floor += 1) {
    const radius = 0.23 - floor * 0.007;
    for (let side = 0; side < 8; side += 1) {
      const angle = (side * Math.PI) / 4;
      blocks.box(
        -0.21 + Math.cos(angle) * radius * 0.6,
        -0.18 + floor * 0.089,
        Math.sin(angle) * radius * 0.6,
        radius,
        0.091,
        radius,
        Math.floor(floor / 3) % 2 ? 0xb74236 : 0xeee1c3,
        angle,
      );
    }
  }
  blocks.box(-0.21, 1.03, 0, 0.49, 0.06, 0.49, 0x343c3d);
  for (const x of [-0.36, -0.06])
    for (const z of [-0.15, 0.15]) blocks.box(x, 1.15, z, 0.025, 0.23, 0.025, 0x86623b);
  lights.box(-0.21, 1.14, 0, 0.25, 0.18, 0.25, 0xffe49b);
  blocks.box(-0.21, 1.29, 0, 0.43, 0.1, 0.43, 0x6e3730);
  blocks.box(-0.21, 1.37, 0, 0.24, 0.07, 0.24, 0x914336);
  blocks.box(-0.21, 1.44, 0, 0.045, 0.12, 0.045, 0xcc9f5a);
  // Warm cottage on the leeward shore.
  blocks.box(0.31, -0.035, -0.18, 0.42, 0.36, 0.34, 0xdac29c);
  for (let row = 0; row < 4; row += 1)
    blocks.box(0.31, 0.16 + row * 0.055, -0.18, 0.51 - row * 0.095, 0.06, 0.44, 0x9e4e39);
  blocks.box(0.34, -0.075, 0, 0.075, 0.2, 0.018, 0x64452e);
  lights.box(0.18, 0.03, 0, 0.08, 0.09, 0.022, 0xffc16a);
  lights.box(0.53, 0.02, -0.18, 0.018, 0.095, 0.12, 0xffc16a);
  // Dock, posts, rope bollards and a tiny moored dinghy.
  for (let n = 0; n < 9; n += 1)
    blocks.box(0.22, -0.34, 0.32 + n * 0.07, 0.27, 0.055, 0.055, n % 2 ? 0xa67848 : 0x886038);
  for (const z of [0.4, 0.8])
    for (const x of [0.07, 0.37]) blocks.box(x, -0.4, z, 0.045, 0.4, 0.045, 0x63492f);
  for (let n = 0; n < 5; n += 1) {
    const width = 0.08 + Math.sin((n / 4) * Math.PI) * 0.08;
    blocks.box(0.57, -0.43, 0.45 + n * 0.055, width, 0.11, 0.055, 0x875838);
    blocks.box(0.57, -0.36, 0.45 + n * 0.055, width * 0.63, 0.025, 0.055, 0xd6b887);
  }
  blocks.box(0.61, -0.28, 0.62, 0.035, 0.035, 0.36, 0xd4b07a, 0.5);
  // Two crooked voxel palms.
  for (const [x, z, scale] of [
    [-0.5, 0.23, 0.8],
    [0.51, -0.39, 0.63],
  ]) {
    for (let n = 0; n < 8; n += 1)
      blocks.box(
        x! + n * 0.012,
        -0.2 + (n * scale!) / 9,
        z!,
        0.065,
        0.1,
        0.065,
        n % 2 ? 0x92724a : 0x735537,
      );
    for (let leaf = 0; leaf < 6; leaf += 1)
      for (let n = 0; n < 5; n += 1) {
        const a = (leaf * Math.PI) / 3;
        blocks.box(
          x! + 0.08 + Math.cos(a) * n * 0.065,
          -0.2 + scale! + Math.sin((n / 5) * Math.PI) * 0.08 - n * 0.025,
          z! + Math.sin(a) * n * 0.065,
          0.14 - n * 0.015,
          0.045,
          0.09,
          leaf % 2 ? 0x478454 : 0x285b48,
          a,
        );
      }
  }
  blocks.box(-0.5, -0.16, -0.25, 0.2, 0.13, 0.14, 0x785035);
  lights.box(-0.5, -0.085, -0.25, 0.2, 0.025, 0.14, 0xdcb459);
  blocks.build(island, materials.solid);
  lights.build(island, materials.glow);
  const beacon = new T.Group();
  beacon.position.set(-0.21, 1.14, 0);
  const beam = new T.Mesh(new T.ConeGeometry(0.35, 2.8, 16, 1, true), materials.beam);
  beam.rotation.z = Math.PI / 2;
  beam.position.x = 1.4;
  beacon.add(beam);
  island.add(beacon);
  const beaconLight = new T.PointLight(0xffc46c, 1.1, 2.7, 2);
  beaconLight.position.copy(beacon.position);
  island.add(beaconLight);
  return { island, beacon, beaconLight };
}

export function buildSeabedTreasures(T: Three, materials: BottleMaterials) {
  // Objects hang in the water column. There is deliberately no seabed plane.
  const group = new T.Group();
  group.userData["chapter"] = "treasure";
  const stone = new Voxels(T),
    gold = new Voxels(T);
  stone.box(1.2, -1.75, 0.38, 0.62, 0.3, 0.42, 0x69492f);
  stone.box(1.2, -1.47, 0.2, 0.64, 0.07, 0.42, 0x8c643e, 0, 0.32);
  for (const x of [0.96, 1.44]) stone.box(x, -1.7, 0.38, 0.045, 0.35, 0.44, 0xad8848);
  for (let n = 0; n < 18; n += 1)
    gold.box(
      1.0 + (n % 6) * 0.07,
      -1.56 + Math.floor(n / 6) * 0.026,
      0.27 + Math.floor(n / 6) * 0.08,
      0.065,
      0.025,
      0.065,
      0xffd66c,
    );
  // Anchor shaft, stock and curved stepped flukes.
  stone.box(-2, -1.45, -0.3, 0.07, 0.75, 0.07, 0x425958, 0, 0.38);
  stone.box(-2.09, -1.2, -0.3, 0.55, 0.065, 0.065, 0x425958);
  for (const side of [-1, 1])
    for (let n = 0; n < 4; n += 1)
      stone.box(-1.86 + side * n * 0.075, -1.76 + n * n * 0.016, -0.3, 0.09, 0.07, 0.07, 0x526662);
  // Amphora with two handles.
  for (let row = 0; row < 6; row += 1) {
    const width = row < 4 ? 0.19 + Math.sin((row / 4) * Math.PI) * 0.08 : 0.12;
    stone.box(-0.45, -1.87 + row * 0.085, 0.67, width, 0.09, width, row % 2 ? 0xa16e4e : 0xbd8660);
  }
  for (const side of [-1, 1])
    for (let n = 0; n < 4; n += 1)
      stone.box(
        -0.45 + side * (0.12 + Math.sin((n / 3) * Math.PI) * 0.065),
        -1.53 + n * 0.06,
        0.67,
        0.055,
        0.065,
        0.055,
        0xb78055,
      );
  const random = seededRandom(666);
  for (let coral = 0; coral < 12; coral += 1) {
    const x = -2.5 + random() * 5,
      z = (random() - 0.5) * 1.5,
      y = -1.85 + random() * 0.24;
    const color = [0xdd7762, 0xb67196, 0xdaaa73, 0x69aaa0][coral % 4]!;
    for (let n = 0; n < 5; n += 1) {
      stone.box(x, y + n * 0.075, z, 0.06, 0.08, 0.06, color);
      if (n > 1)
        for (const s of [-1, 1])
          stone.box(x + s * (n - 1) * 0.05, y + n * 0.065, z + s * 0.035, 0.07, 0.07, 0.065, color);
    }
  }
  stone.build(group, materials.solid);
  gold.build(group, materials.glow);
  const light = new T.PointLight(0xffbf46, 2, 2, 2);
  light.position.set(1.2, -1.25, 0.4);
  group.add(light);
  return { group, light };
}
