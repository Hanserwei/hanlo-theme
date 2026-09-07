import type { BottleMaterials, OceanUniforms } from "./materials";
import { clipMaterial } from "./materials";
import { insideBottle, SEA_LEVEL, waveHeight } from "./math";
import type { Three } from "./three-loader";
import { Voxels, seededRandom } from "./voxel";

export function buildLife(T: Three, materials: BottleMaterials, uniforms: OceanUniforms) {
  const group = new T.Group();
  const random = seededRandom(705);
  const birds = Array.from({ length: 6 }, (_, index) => {
    const bird = new T.Group(),
      body = new Voxels(T),
      left = new T.Group(),
      right = new T.Group();
    body.box(0, 0, 0, 0.105, 0.055, 0.055, 0xeae4ce);
    body.box(0.055, 0.015, 0, 0.055, 0.045, 0.045, 0xf5eacf);
    body.box(0.095, 0.005, 0, 0.045, 0.02, 0.02, 0xdfb060);
    body.build(bird, materials.solid);
    for (const [wing, sign] of [
      [left, -1],
      [right, 1],
    ] as const) {
      const v = new Voxels(T);
      v.box(-0.018, 0, sign * 0.1, 0.065, 0.021, 0.16, 0xeee9d9);
      v.box(-0.055, 0, sign * 0.19, 0.052, 0.025, 0.065, 0x7f8a86);
      v.build(wing, materials.solid);
      bird.add(wing);
    }
    group.add(bird);
    return { bird, left, right, index };
  });
  const cloudMaterial = clipMaterial(
    new T.MeshStandardMaterial({ color: 0xe7d6c0, roughness: 1, flatShading: true }),
    uniforms,
  );
  const clouds = Array.from({ length: 7 }, (_, index) => {
    const cloud = new T.Group(),
      v = new Voxels(T);
    for (let puff = 0; puff < 4; puff += 1)
      v.ball(
        (puff - 1.5) * 0.14,
        Math.sin(puff) * 0.04,
        0,
        0.13 + random() * 0.035,
        0xffffff,
        0.09,
      );
    v.build(cloud, cloudMaterial);
    group.add(cloud);
    return { cloud, index };
  });
  const whale = new T.Group(),
    whaleVoxels = new Voxels(T);
  for (let x = -0.52; x <= 0.5; x += 0.085) {
    const r = 0.17 * Math.sqrt(Math.max(0, 1 - (x / 0.6) ** 2));
    whaleVoxels.box(x, 0, 0, 0.09, r * 1.4, r * 2, 0x3b656d);
    whaleVoxels.box(x, -r * 0.52, 0, 0.09, 0.055, r * 1.5, 0x91b4b0);
  }
  for (const s of [-1, 1]) {
    whaleVoxels.box(-0.53, 0.01, s * 0.11, 0.2, 0.065, 0.23, 0x426a71, s * 0.3);
    whaleVoxels.box(0.05, -0.055, s * 0.22, 0.24, 0.045, 0.16, 0x426a71, s * 0.6);
    whaleVoxels.box(0.33, 0.075, s * 0.135, 0.025, 0.025, 0.018, 0x182a30);
  }
  whaleVoxels.box(-0.15, 0.17, 0, 0.15, 0.17, 0.035, 0x375a60, 0, -0.4);
  whaleVoxels.build(whale, materials.solid);
  group.add(whale);
  const fishVoxels = new Voxels(T);
  for (let i = 0; i < 30; i += 1)
    fishVoxels.box(0, 0, 0, 0.11, 0.045, 0.04, i % 3 ? 0x81b7b1 : 0xe8b463);
  const fish = fishVoxels.build(group, materials.solid);
  fish.instanceMatrix.setUsage(T.DynamicDrawUsage);
  fish.frustumCulled = false;
  const bubbleVoxels = new Voxels(T);
  for (let i = 0; i < 55; i += 1) bubbleVoxels.box(0, 0, 0, 1, 1, 1, 0xffffff);
  const bubbles = bubbleVoxels.build(group, materials.bubbles, new T.IcosahedronGeometry(1, 0));
  bubbles.instanceMatrix.setUsage(T.DynamicDrawUsage);
  bubbles.frustumCulled = false;
  const foamVoxels = new Voxels(T);
  for (let i = 0; i < 160; i += 1) foamVoxels.box(0, 0, 0, 1, 1, 1, 0xe2f6e9);
  const spray = foamVoxels.build(group, materials.solid);
  spray.instanceMatrix.setUsage(T.DynamicDrawUsage);
  spray.frustumCulled = false;
  const buoy = new T.Group(),
    buoyBlocks = new Voxels(T);
  buoyBlocks.box(0, 0, 0, 0.16, 0.12, 0.16, 0xb23c36);
  buoyBlocks.box(0, 0.11, 0, 0.055, 0.14, 0.055, 0xebdcb7);
  buoyBlocks.box(0, 0.2, 0, 0.09, 0.06, 0.09, 0xb33d32);
  buoyBlocks.build(buoy, materials.solid);
  group.add(buoy);
  const crab = new T.Group(),
    crabBlocks = new Voxels(T);
  crabBlocks.box(0, 0, 0, 0.13, 0.06, 0.09, 0xb84b3b);
  for (const side of [-1, 1])
    for (let i = 0; i < 3; i += 1)
      crabBlocks.box((i - 1) * 0.045, -0.02, side * 0.07, 0.018, 0.018, 0.08, 0xc86b4c, side * 0.3);
  crabBlocks.box(0.09, 0.02, 0.08, 0.07, 0.045, 0.055, 0xda7856);
  crabBlocks.box(0.09, 0.02, -0.08, 0.07, 0.045, 0.055, 0xda7856);
  crabBlocks.build(crab, materials.solid);
  group.add(crab);
  const starGeometry = new T.BufferGeometry(),
    starPositions: number[] = [];
  for (let i = 0; i < 90; i += 1) {
    const x = (random() - 0.5) * 7,
      y = 1.4 + random() * 0.65,
      z = (random() - 0.5) * 2;
    if (insideBottle(x, y, z, 0.2)) starPositions.push(x, y, z);
  }
  starGeometry.setAttribute("position", new T.Float32BufferAttribute(starPositions, 3));
  group.add(new T.Points(starGeometry, materials.stars));
  const sunMaterial = clipMaterial(new T.MeshBasicMaterial({ color: 0xffcf83 }), uniforms);
  const moonMaterial = clipMaterial(new T.MeshBasicMaterial({ color: 0xd9e7df }), uniforms);
  const sun = new T.Mesh(new T.IcosahedronGeometry(0.16, 1), sunMaterial),
    moon = new T.Mesh(new T.IcosahedronGeometry(0.12, 1), moonMaterial);
  group.add(sun, moon);
  const lightningMaterial = clipMaterial(
    new T.LineBasicMaterial({ color: 0xd9e6ff, transparent: true, opacity: 0 }),
    uniforms,
  );
  const bolt = new T.BufferGeometry().setFromPoints(
    [
      [1.5, 1.9, -0.2],
      [1.26, 1.48, -0.18],
      [1.49, 1.45, -0.15],
      [1.1, 0.82, -0.1],
      [1.3, 0.86, -0.12],
      [0.95, 0.2, -0.1],
    ].map((p) => new T.Vector3(...(p as [number, number, number]))),
  );
  group.add(new T.Line(bolt, lightningMaterial));
  const flashLight = new T.PointLight(0xc6daff, 0, 7);
  flashLight.position.set(1.3, 1.5, -0.2);
  group.add(flashLight);
  const dummy = new T.Object3D();
  const cloudLight = new T.Color(0xe7d6c0),
    cloudDark = new T.Color(0x394453);
  function update(
    time: number,
    storm: number,
    phase: number,
    night: number,
    ship: ReturnType<typeof import("./math").shipPose>,
  ) {
    for (const { bird, left, right, index } of birds) {
      const a = time * 0.24 + (index * Math.PI) / 3;
      bird.position.set(
        Math.cos(a) * (1.4 + index * 0.07),
        1.5 + Math.sin(a * 2) * 0.07,
        Math.sin(a) * 0.63,
      );
      bird.rotation.y = -a - Math.PI / 2;
      left.rotation.x = Math.sin(time * 5 + index) * 0.42;
      right.rotation.x = -left.rotation.x;
    }
    for (const { cloud, index } of clouds) {
      cloud.position.set(
        -3 + ((index * 0.85 + time * 0.026) % 6),
        1.92 + Math.sin(index) * 0.035,
        -0.27 + Math.cos(index) * 0.2,
      );
    }
    cloudMaterial.color.copy(cloudLight).lerp(cloudDark, Math.max(storm, night * 0.65));
    const breach = (time % 28) / 28;
    whale.visible = breach > 0.7;
    if (whale.visible) {
      const t = (breach - 0.7) / 0.3;
      whale.position.set(1.15 - t * 1.3, SEA_LEVEL - 0.6 + Math.sin(t * Math.PI) * 1.18, -1.36);
      whale.rotation.z = Math.cos(t * Math.PI) * 0.6;
    }
    buoy.position.set(-2.25, waveHeight(-2.25, -0.95, time, storm) + 0.04, -0.95);
    buoy.rotation.z = Math.sin(time * 1.7) * (0.08 + storm * 0.2);
    crab.position.set(-0.1 + Math.sin(time * 0.5) * 0.12, -0.16, 0.45);
    crab.rotation.y = Math.sin(time * 0.4) * 0.3;
    for (let i = 0; i < 30; i += 1) {
      const a = time * 0.22 + i * 0.33;
      dummy.position.set(Math.cos(a) * 2.1, -1.2 + Math.sin(a * 1.7) * 0.3, Math.sin(a) * 0.8);
      dummy.rotation.set(0, -a - Math.PI / 2, Math.sin(a) * 0.1);
      dummy.scale.set(0.11, 0.045, 0.04);
      dummy.updateMatrix();
      fish.setMatrixAt(i, dummy.matrix);
    }
    fish.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < 55; i += 1) {
      const age = (time * 0.18 + i * 0.173) % 1;
      const x = -2.6 + (i % 11) * 0.48,
        z = Math.sin(i * 4.7) * 0.85;
      dummy.position.set(x + Math.sin(time + i) * 0.035, -1.93 + age * 1.4, z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.setScalar(0.018 + age * 0.017);
      dummy.updateMatrix();
      bubbles.setMatrixAt(i, dummy.matrix);
    }
    bubbles.instanceMatrix.needsUpdate = true;
    const fx = Math.cos(ship.heading),
      fz = -Math.sin(ship.heading);
    for (let i = 0; i < 160; i += 1) {
      const age = (time * (0.8 + storm * 0.7) + i * 0.061) % 1;
      let x: number, z: number, y: number;
      if (i < 90) {
        const trailing = i < 60;
        const distance = trailing ? -0.7 - age * 1.25 : 0.9 + age * 0.35;
        const spread = Math.sin(i * 7.13) * (0.1 + age * 0.36);
        x = ship.x + fx * distance + fz * spread;
        z = ship.z + fz * distance - fx * spread;
        y =
          waveHeight(x, z, time, storm) +
          0.04 +
          (trailing ? 0 : Math.sin(age * Math.PI) * (0.14 + storm * 0.35));
      } else {
        x = Math.sin(i * 3.3) * 3.5;
        z = Math.cos(i * 1.7) * 1.5;
        y = waveHeight(x, z, time, storm) + Math.sin(age * Math.PI) * storm * 0.6;
      }
      dummy.position.set(x, y, z);
      dummy.rotation.set(age * 4, i, 0);
      dummy.scale.setScalar((i < 90 ? 1 : storm) * (0.035 + storm * 0.025) * (1 - age));
      dummy.updateMatrix();
      spray.setMatrixAt(i, dummy.matrix);
    }
    spray.instanceMatrix.needsUpdate = true;
    const skyAngle = phase * Math.PI * 2;
    sun.position.set(Math.cos(skyAngle) * 3, Math.sin(skyAngle) * 1.7, 0.05);
    moon.position.set(-Math.cos(skyAngle) * 3, -Math.sin(skyAngle) * 1.7, 0.05);
    sun.visible = sun.position.y > 0.2;
    moon.visible = moon.position.y > 0.2;
    materials.stars.opacity = night * 0.85 * (1 - storm);
    const flash = storm > 0.65 && time % 6.7 > 6.35 && Math.sin(time * 47) > 0.25 ? storm : 0;
    lightningMaterial.opacity = flash;
    flashLight.intensity = flash * 8;
  }
  return { group, update };
}
