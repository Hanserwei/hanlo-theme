import type { Material, Matrix4, MeshStandardMaterial, ShaderMaterial } from "three";

import type { Three } from "./three-loader";

export const WAVE_GLSL = `
float oceanWave(vec2 p) {
  return (0.045 + uStorm * 0.16) * sin(p.x * 2.2 + uTime * 1.7)
    + (0.025 + uStorm * 0.09) * sin(p.y * 3.1 - uTime * 1.3)
    + (0.018 + uStorm * 0.055) * sin(p.x * 4.1 + p.y * 2.7 + uTime * 2.4);
}`;
const boundary = `
uniform mat4 uBottleInverse;
varying vec3 vBottleWorld;
float bottleRadius(float x) {
  if (x < -5.6 || x > 6.2) return 0.0;
  if (x < -5.5) return mix(0.0, 0.8, (x + 5.6) / 0.1);
  if (x < -5.2) return mix(0.8, 1.65, (x + 5.5) / 0.3);
  if (x < -4.7) return mix(1.65, 2.18, (x + 5.2) / 0.5);
  if (x < -4.2) return mix(2.18, 2.25, (x + 4.7) / 0.5);
  if (x < 3.25) return 2.25;
  if (x < 3.7) return mix(2.25, 2.05, (x - 3.25) / 0.45);
  if (x < 4.45) return mix(2.05, 0.85, (x - 3.7) / 0.75);
  if (x < 4.7) return mix(0.85, 0.72, (x - 4.45) / 0.25);
  if (x < 6.05) return 0.72;
  return mix(0.72, 0.0, (x - 6.05) / 0.15);
}
void clipBottle() {
  vec3 p = (uBottleInverse * vec4(vBottleWorld, 1.0)).xyz;
  float radius = bottleRadius(p.x) - 0.09;
  if (radius <= 0.0 || dot(p.yz, p.yz) > radius * radius) discard;
}`;
const worldVertex = `
vec4 bottlePosition = vec4(transformed, 1.0);
#ifdef USE_INSTANCING
  bottlePosition = instanceMatrix * bottlePosition;
#endif
vBottleWorld = (modelMatrix * bottlePosition).xyz;
`;

export interface OceanUniforms {
  time: { value: number };
  storm: { value: number };
  night: { value: number };
  inverse: { value: Matrix4 };
}

export function clipMaterial<T extends Material>(
  material: T,
  uniforms: OceanUniforms,
  wave = false,
): T {
  material.onBeforeCompile = (shader) => {
    shader.uniforms["uBottleInverse"] = uniforms.inverse;
    shader.uniforms["uTime"] = uniforms.time;
    shader.uniforms["uStorm"] = uniforms.storm;
    shader.vertexShader =
      `varying vec3 vBottleWorld;\nuniform float uTime;\nuniform float uStorm;\n${wave ? "varying float vOceanTop;\n" + WAVE_GLSL : ""}\n` +
      shader.vertexShader;
    if (wave)
      shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>\nvOceanTop = step(0.5, normal.y);\ntransformed.y += oceanWave(instanceMatrix[3].xz) / max(instanceMatrix[1].y, 0.001);`,
      );
    shader.vertexShader = shader.vertexShader.replace(
      "#include <project_vertex>",
      worldVertex + "\n#include <project_vertex>",
    );
    shader.fragmentShader = boundary + "\n" + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <clipping_planes_fragment>",
      "#include <clipping_planes_fragment>\nclipBottle();",
    );
    if (wave) {
      shader.fragmentShader =
        "uniform float uTime;\nuniform float uStorm;\nvarying float vOceanTop;\n" +
        WAVE_GLSL +
        shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        vec2 cell = floor(vBottleWorld.xz / 0.16);
        float grain = fract(sin(dot(cell, vec2(127.1, 311.7))) * 43758.5453);
        float crest = smoothstep(0.062 + uStorm * 0.19, 0.084 + uStorm * 0.27, oceanWave(vBottleWorld.xz));
        float foam = crest * smoothstep(0.44, 0.8, grain) * vOceanTop;
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.65, 0.85, 0.78), foam * (0.4 + uStorm * 0.25));`,
      );
    }
  };
  material.customProgramCacheKey = () => (wave ? "bottle-wave-160" : "bottle-clip-160");
  return material;
}

export function createMaterials(T: Three, uniforms: OceanUniforms) {
  const solid = clipMaterial(
    // InstancedMesh supplies instanceColor; geometry has no per-vertex color attribute.
    new T.MeshStandardMaterial({ roughness: 0.76, metalness: 0.06 }),
    uniforms,
  );
  const glow = clipMaterial(
    new T.MeshStandardMaterial({
      emissive: 0xffaa42,
      emissiveIntensity: 0.5,
      roughness: 0.4,
    }),
    uniforms,
  );
  const rope = clipMaterial(new T.LineBasicMaterial({ color: 0x433322 }), uniforms);
  const water = clipMaterial(
    new T.MeshStandardMaterial({
      color: 0x288b9b,
      roughness: 0.32,
      metalness: 0.28,
      transparent: true,
      opacity: 0.86,
      depthWrite: false,
    }),
    uniforms,
    true,
  );
  const sea = new T.ShaderMaterial({
    uniforms: {
      uBottleInverse: uniforms.inverse,
      uNight: uniforms.night,
      uTime: uniforms.time,
      uStorm: uniforms.storm,
    },
    vertexShader: `varying vec3 vBottleWorld; uniform float uTime; uniform float uStorm;
      ${WAVE_GLSL}
      void main(){ vec3 p = position; p.y += oceanWave(p.xz) * smoothstep(-2.1, -0.48, p.y);
        vBottleWorld = (modelMatrix * vec4(p, 1.0)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vBottleWorld, 1.0); }`,
    fragmentShader: `${boundary}
      uniform float uNight;
      void main(){
        clipBottle();
        float depth = clamp((-vBottleWorld.y - 0.48) / 1.7, 0.0, 1.0);
        vec3 color = mix(vec3(0.11,0.65,0.65), vec3(0.025,0.13,0.32), depth);
        gl_FragColor = vec4(color * (1.0-uNight*0.45), 0.22 + depth*0.28);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    transparent: true,
    depthWrite: false,
    side: T.DoubleSide,
  });
  const glass = new T.ShaderMaterial({
    uniforms: {
      uNight: uniforms.night,
      uLightDirection: { value: new T.Vector3(-5, 7, 5).normalize() },
    },
    vertexShader: `varying vec3 vGlassNormal; varying vec3 vGlassPosition;
      void main(){
        vec4 p = modelMatrix * vec4(position, 1.0);
        vGlassNormal = normalize(mat3(modelMatrix) * normal);
        vGlassPosition = p.xyz;
        gl_Position = projectionMatrix * viewMatrix * p;
      }`,
    fragmentShader: `varying vec3 vGlassNormal; varying vec3 vGlassPosition;
      uniform float uNight; uniform vec3 uLightDirection;
      void main(){
        vec3 n = normalize(vGlassNormal);
        vec3 eye = normalize(cameraPosition - vGlassPosition);
        float rim = pow(1.0 - abs(dot(n, eye)), 2.5);
        float light = pow(max(dot(reflect(-uLightDirection, n), eye), 0.0), 64.0) * (1.0 - uNight * 0.6);
        vec3 tint = mix(vec3(0.57,0.82,0.78), vec3(0.24,0.46,0.72), uNight);
        gl_FragColor = vec4(tint + light * 0.9, 0.025 + rim * 0.28 + light * 0.28);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    transparent: true,
    depthWrite: false,
    side: T.FrontSide,
  });
  const beam = clipMaterial(
    new T.MeshBasicMaterial({
      color: 0xffdd91,
      transparent: true,
      opacity: 0.08,
      depthWrite: false,
      side: T.DoubleSide,
      blending: T.AdditiveBlending,
    }),
    uniforms,
  );
  const bubbles = clipMaterial(
    new T.MeshBasicMaterial({
      color: 0xb0f5ec,
      transparent: true,
      opacity: 0.44,
      depthWrite: false,
    }),
    uniforms,
  );
  const stars = clipMaterial(
    new T.PointsMaterial({
      color: 0xffedc2,
      size: 0.035,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    }),
    uniforms,
  );
  return { solid, glow, rope, water, sea, glass, beam, bubbles, stars };
}

export interface BottleMaterials {
  solid: MeshStandardMaterial;
  glow: MeshStandardMaterial;
  rope: Material;
  water: MeshStandardMaterial;
  sea: ShaderMaterial;
  glass: ShaderMaterial;
  beam: import("three").MeshBasicMaterial;
  bubbles: Material;
  stars: import("three").PointsMaterial;
}
