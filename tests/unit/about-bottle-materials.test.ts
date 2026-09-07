import * as THREE from "three";
import { describe, expect, it } from "vitest";

import { buildBottle, buildDesk, buildOcean } from "../../src/js/features/about-bottle/bottle";
import { buildIsland, buildSeabedTreasures } from "../../src/js/features/about-bottle/island";
import { buildLife } from "../../src/js/features/about-bottle/life";
import { createMaterials } from "../../src/js/features/about-bottle/materials";
import { buildShip } from "../../src/js/features/about-bottle/ship";

// Use the exact CDN revision's real materials/geometry, without creating a browser or renderer.
describe("bottle material and geometry contracts", () => {
  it("provides every color attribute requested by the scene's materials", () => {
    expect(THREE.REVISION).toBe("160");
    const uniforms = {
      time: { value: 0 },
      storm: { value: 0 },
      night: { value: 0 },
      inverse: { value: new THREE.Matrix4() },
    };
    const materials = createMaterials(THREE, uniforms);
    const root = new THREE.Group();
    root.add(
      buildBottle(THREE, materials),
      buildOcean(THREE, materials),
      buildDesk(THREE),
      buildIsland(THREE, materials).island,
      buildSeabedTreasures(THREE, materials).group,
      buildShip(THREE, materials).ship,
      buildLife(THREE, materials, uniforms).group,
    );
    const missingColors: string[] = [];
    const geometries = new Set<THREE.BufferGeometry>();
    const ownedMaterials = new Set<THREE.Material>();
    let instancedMeshes = 0;
    try {
      root.traverse((object) => {
        if (
          !(
            object instanceof THREE.Mesh ||
            object instanceof THREE.Line ||
            object instanceof THREE.Points
          )
        )
          return;
        geometries.add(object.geometry);
        for (const material of Array.isArray(object.material)
          ? object.material
          : [object.material]) {
          ownedMaterials.add(material);
          if (material.vertexColors && !object.geometry.hasAttribute("color")) {
            missingColors.push(`${object.type}/${material.type}/${object.geometry.type}`);
          }
        }
        if (object instanceof THREE.InstancedMesh) {
          instancedMeshes += 1;
          expect(object.instanceColor?.count).toBe(object.count);
          expect(object.instanceColor?.array.some((value) => value > 0)).toBe(true);
        }
      });
      expect(instancedMeshes).toBeGreaterThan(20);
      expect(missingColors).toEqual([]);
    } finally {
      geometries.forEach((geometry) => geometry.dispose());
      ownedMaterials.forEach((material) => material.dispose());
      root.traverse((object) => {
        if (object instanceof THREE.InstancedMesh) object.dispose();
      });
    }
  });
});
