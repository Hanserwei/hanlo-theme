import type { BottleMaterials } from "./materials";
import { BOTTLE_PROFILE, bottleRadius, insideBottle, SEA_LEVEL } from "./math";
import type { Three } from "./three-loader";
import { Voxels, rope } from "./voxel";

export function buildBottle(T: Three, materials: BottleMaterials) {
  const bottle = new T.Group();
  const profile = BOTTLE_PROFILE.map(([x, r]) => new T.Vector2(r, x));
  const glassGeometry = new T.LatheGeometry(profile, 96);
  glassGeometry.rotateZ(-Math.PI / 2);
  const glass = new T.Mesh(glassGeometry, materials.glass);
  glass.renderOrder = 8;
  bottle.add(glass);
  const woodMaterial = new T.MeshStandardMaterial({ roughness: 0.85 });
  const detail = new Voxels(T);
  // Neck rings, a faceted cork and the wax seal close the bottle completely.
  for (let i = 0; i < 20; i += 1) {
    const a = (i * Math.PI) / 10;
    detail.box(
      6.02,
      Math.cos(a) * 0.54,
      Math.sin(a) * 0.54,
      0.4,
      0.19,
      0.19,
      i % 3 ? 0xad8552 : 0x8e693e,
      a,
    );
  }
  detail.box(6.15, 0, 0, 0.32, 1.05, 1.05, 0xa67a48);
  for (let i = 0; i < 16; i += 1) {
    const a = (i * Math.PI) / 8;
    detail.box(6.35, Math.cos(a) * 0.41, Math.sin(a) * 0.41, 0.1, 0.21, 0.21, 0x992f31, a);
  }
  detail.box(6.38, 0, 0, 0.11, 0.72, 0.72, 0xa73135);
  detail.box(5.94, -0.45, 0.38, 0.32, 0.33, 0.13, 0xa63432, 0, 0.15);
  detail.build(bottle, woodMaterial);
  const neckMaterial = new T.MeshStandardMaterial({
    color: 0xabc6b5,
    transparent: true,
    opacity: 0.35,
    roughness: 0.14,
    metalness: 0.15,
  });
  for (const x of [4.82, 5.74]) {
    const ring = new T.Mesh(new T.TorusGeometry(0.73, 0.045, 8, 48), neckMaterial);
    ring.rotation.y = Math.PI / 2;
    ring.position.x = x;
    bottle.add(ring);
  }
  const ropeMaterial = new T.LineBasicMaterial({ color: 0xb38d56 });
  const cord: number[][] = [];
  for (let i = 0; i <= 80; i += 1) {
    const a = (i / 80) * Math.PI * 4;
    cord.push([5.08 + i / 500, Math.cos(a) * 0.77, Math.sin(a) * 0.77]);
  }
  rope(T, bottle, ropeMaterial, cord);
  rope(T, bottle, ropeMaterial, [
    [5.2, -0.3, 0.7],
    [5, -1.14, 0.97],
    [5.38, -1.12, 1.02],
    [5.35, -0.25, 0.7],
  ]);
  const tag = new Voxels(T);
  tag.box(5.2, -1.24, 1.0, 0.67, 0.73, 0.045, 0xd1b783, 0, 0.18);
  tag.box(5.2, -1.22, 1.035, 0.43, 0.025, 0.01, 0x85663f, 0, 0.18);
  tag.box(5.2, -1.37, 1.035, 0.33, 0.025, 0.01, 0x85663f, 0, 0.18);
  const tagMesh = tag.build(bottle, woodMaterial);
  tagMesh.userData["chapter"] = "intro";
  return bottle;
}

export function buildOcean(T: Three, materials: BottleMaterials) {
  const ocean = new T.Group();
  const voxels = new Voxels(T);
  const cell = 0.16;
  for (let x = -5.5; x < 6; x += cell)
    for (let z = -2.24; z < 2.24; z += cell) {
      if (insideBottle(x, SEA_LEVEL, z, 0.13))
        voxels.box(x, SEA_LEVEL - 0.07, z, cell * 0.98, 0.14, cell * 0.98, 0xffffff);
    }
  const surface = voxels.build(ocean, materials.water);
  surface.castShadow = false;
  surface.receiveShadow = false;
  surface.renderOrder = 3;
  surface.frustumCulled = false;
  // Continuous closed lower volume follows every bottle cross-section, with no floor.
  const vertices: number[] = [],
    indices: number[] = [];
  const slices = 120,
    arcSteps = 40;
  for (let s = 0; s <= slices; s += 1) {
    const x = -5.5 + (s / slices) * 11.5;
    const r = Math.max(0.01, bottleRadius(x) - 0.13);
    const start = Math.acos(Math.max(-0.999, Math.min(0.999, SEA_LEVEL / r)));
    for (let j = 0; j <= arcSteps; j += 1) {
      const angle = start + (j / arcSteps) * (2 * Math.PI - 2 * start);
      vertices.push(x, Math.cos(angle) * r, Math.sin(angle) * r);
    }
  }
  for (let s = 0; s < slices; s += 1)
    for (let j = 0; j < arcSteps; j += 1) {
      const a = s * (arcSteps + 1) + j,
        b = a + arcSteps + 1;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  // Flat top closes the volume beneath the independently displaced voxel surface.
  for (let s = 0; s < slices; s += 1) {
    const a = s * (arcSteps + 1),
      b = a + arcSteps + 1;
    indices.push(a, a + arcSteps, b, b, a + arcSteps, b + arcSteps);
  }
  for (const s of [0, slices])
    for (let j = 1; j < arcSteps - 1; j += 1) {
      const a = s * (arcSteps + 1);
      indices.push(a, a + j, a + j + 1);
    }
  const volumeGeometry = new T.BufferGeometry();
  volumeGeometry.setAttribute("position", new T.Float32BufferAttribute(vertices, 3));
  volumeGeometry.setIndex(indices);
  volumeGeometry.computeVertexNormals();
  const volume = new T.Mesh(volumeGeometry, materials.sea);
  volume.renderOrder = 2;
  ocean.add(volume);
  return ocean;
}

export function buildDesk(T: Three) {
  const desk = new T.Group();
  const material = new T.MeshStandardMaterial({ roughness: 0.8 });
  const brass = new T.MeshStandardMaterial({ color: 0xb68c4d, roughness: 0.3, metalness: 0.78 });
  const blocks = new Voxels(T);
  // Wide wooden table and its alternating grain strips.
  for (let plank = 0; plank < 14; plank += 1) {
    blocks.box((plank - 6.5) * 1.12, -2.88, 0, 1.1, 0.25, 11.5, plank % 2 ? 0x69442f : 0x795038);
    for (let line = 0; line < 3; line += 1)
      blocks.box(
        (plank - 6.5) * 1.12 + (line - 1) * 0.28,
        -2.75,
        0.2,
        0.025,
        0.007,
        10.8,
        0x503827,
      );
  }
  // Two timber saddles follow the bottle's lower arc.
  for (const x of [-3, 2.6]) {
    blocks.box(x, -2.57, 0, 1.1, 0.28, 3.5, 0x4d3325);
    for (let n = -7; n <= 7; n += 1) {
      const z = n * 0.2;
      const upper = -Math.sqrt(Math.max(0, 2.3 ** 2 - z * z));
      blocks.box(x, (upper - 2.52) / 2, z, 0.72, upper + 2.52, 0.2, 0x805b38);
    }
    for (const z of [-1.52, 1.52]) blocks.box(x, -2.41, z, 0.84, 0.17, 0.19, 0xa57b48);
  }
  // Old books, exposed page edges and embossed spines.
  for (let n = 0; n < 3; n += 1) {
    const y = -2.55 + n * 0.27,
      angle = -0.12 + n * 0.16;
    blocks.box(-5.1, y, 3.0, 2.45, 0.2, 1.7, 0xc3b082, angle);
    for (const dy of [-0.13, 0.13])
      blocks.box(-5.1, y + dy, 3, 2.57, 0.055, 1.82, n % 2 ? 0x5f493a : 0x445952, angle);
    blocks.box(-6.3, y, 3, 0.08, 0.27, 1.82, 0x33473f, angle);
    for (let line = 0; line < 3; line += 1)
      blocks.box(-5.1, y + (line - 1) * 0.05, 3.87, 2.28, 0.012, 0.01, 0x9c865f, angle);
  }
  const furniture = blocks.build(desk, material);
  furniture.userData["chapter"] = "journal";
  const telescope = new T.Group();
  telescope.position.set(3.4, -2.4, 3.1);
  telescope.rotation.set(0, 0.25, Math.PI / 2 - 0.08);
  for (const [height, radius, offset] of [
    [1.3, 0.22, 0],
    [0.9, 0.17, 0.92],
    [0.42, 0.27, -0.7],
  ]) {
    const tube = new T.Mesh(new T.CylinderGeometry(radius, radius, height, 20), brass);
    tube.position.y = offset!;
    telescope.add(tube);
  }
  const lens = new T.Mesh(
    new T.CylinderGeometry(0.21, 0.21, 0.03, 24),
    new T.MeshStandardMaterial({ color: 0x172a2b, metalness: 0.8, roughness: 0.14 }),
  );
  lens.position.y = -0.92;
  telescope.add(lens);
  telescope.userData["chapter"] = "horizon";
  desk.add(telescope);
  return desk;
}
