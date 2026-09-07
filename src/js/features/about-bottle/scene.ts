import type { Object3D } from "three";

import { PageResourceScope } from "../../core/resource-scope";
import { buildBottle, buildDesk, buildOcean } from "./bottle";
import { BOTTLE_VIEW, bottlePixelRatio, fitBottleDistance } from "./framing";
import { buildIsland, buildSeabedTreasures } from "./island";
import { buildLife } from "./life";
import { createMaterials } from "./materials";
import {
  advanceTime,
  daylight,
  nextSpeed,
  resolutionScale,
  shipPose,
  type TimeSpeed,
} from "./math";
import { buildShip } from "./ship";
import type { Three } from "./three-loader";

export interface SceneState {
  speed: TimeSpeed;
  period: string;
  storm: boolean;
}
export interface BottleScene {
  setActive(active: boolean): void;
  setStorm(storm: boolean): void;
  cycleSpeed(): void;
  resetView(): void;
  dispose(): Promise<void>;
}

export function createBottleScene(
  T: Three,
  stage: HTMLElement,
  select: (chapter: string) => void,
  report: (state: SceneState) => void,
  failed: () => void,
): BottleScene {
  const resources = new PageResourceScope();
  const scene = new T.Scene();
  let renderer: import("three").WebGLRenderer | undefined;
  const geometries = new Set<import("three").BufferGeometry>(),
    materialsUsed = new Set<import("three").Material>();
  resources.defer(() => {
    scene.traverse((object) => {
      const mesh = object as import("three").Mesh;
      if (mesh.geometry) geometries.add(mesh.geometry);
      if (mesh.material)
        for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material])
          materialsUsed.add(material);
      if (object instanceof T.InstancedMesh) object.dispose();
      if (
        object instanceof T.DirectionalLight ||
        object instanceof T.PointLight ||
        object instanceof T.SpotLight
      )
        object.shadow.dispose();
    });
    geometries.forEach((geometry) => geometry.dispose());
    materialsUsed.forEach((material) => material.dispose());
    renderer?.dispose();
    renderer?.forceContextLoss();
    renderer?.domElement.remove();
    scene.clear();
  });
  try {
    renderer = new T.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    const canvas = renderer.domElement;
    canvas.tabIndex = 0;
    canvas.setAttribute(
      "aria-label",
      "瓶中沧海三维场景；拖动环视，滚轮缩放，聚焦后按住空格唤起风暴",
    );
    stage.prepend(canvas);
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setClearAlpha(0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    // Clear to transparent so the scene joins the page instead of painting a rectangular backdrop.
    const camera = new T.PerspectiveCamera(BOTTLE_VIEW.fov, 1, 0.1, 180);
    const target = new T.Vector3(...BOTTLE_VIEW.target);
    const uniforms = {
      time: { value: 0 },
      storm: { value: 0 },
      night: { value: 0 },
      inverse: { value: new T.Matrix4() },
    };
    const materials = createMaterials(T, uniforms);
    Object.values(materials).forEach((material) => materialsUsed.add(material));
    const bottle = buildBottle(T, materials);
    scene.add(bottle);
    const ocean = buildOcean(T, materials);
    scene.add(ocean);
    scene.add(buildDesk(T));
    const { island, beacon, beaconLight } = buildIsland(T, materials);
    scene.add(island);
    const { group: treasures, light: treasureLight } = buildSeabedTreasures(T, materials);
    scene.add(treasures);
    const { ship, sails } = buildShip(T, materials);
    scene.add(ship);
    const life = buildLife(T, materials, uniforms);
    scene.add(life.group);
    const hemisphere = new T.HemisphereLight(0xe7bda1, 0x303747, 2.1);
    scene.add(hemisphere);
    const key = new T.DirectionalLight(0xffcb95, 3.4);
    key.position.set(-5, 7, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -9;
    key.shadow.camera.right = 9;
    key.shadow.camera.top = 7;
    key.shadow.camera.bottom = -7;
    key.shadow.normalBias = 0.045;
    scene.add(key);
    const rim = new T.DirectionalLight(0x8fcdd1, 1.4);
    rim.position.set(5, 3, -4);
    scene.add(rim);
    const pointer = new T.Vector2(),
      raycaster = new T.Raycaster();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let speed: TimeSpeed = reduced.matches ? 0 : 1,
      time = 0,
      storm = 0,
      stormHeld = false;
    let active = true,
      inView = true,
      hidden = document.hidden,
      frame = 0,
      previous = 0,
      lastInteraction = performance.now();
    let azimuth: number = BOTTLE_VIEW.azimuth,
      elevation: number = BOTTLE_VIEW.elevation,
      distance = fitBottleDistance(1),
      fitDistance = distance,
      scale = Math.min(window.devicePixelRatio, 1.6);
    let frameTotal = 0,
      frameCount = 0,
      lastReport = "";
    const pointers = new Map<number, { x: number; y: number }>();
    let pointerStart = { x: 0, y: 0 },
      dragged = false;
    const release = () => {
      stormHeld = false;
      for (const id of pointers.keys())
        if (canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
      pointers.clear();
    };
    const cancelFrame = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      previous = 0;
    };
    resources.defer(() => {
      cancelFrame();
      release();
    });
    function publish() {
      const state = { speed, period: daylight(time).label, storm: stormHeld };
      const key = JSON.stringify(state);
      if (key !== lastReport) {
        lastReport = key;
        report(state);
      }
    }
    function aim() {
      camera.position.set(
        target.x + Math.sin(azimuth) * Math.cos(elevation) * distance,
        target.y + Math.sin(elevation) * distance,
        target.z + Math.cos(azimuth) * Math.cos(elevation) * distance,
      );
      camera.lookAt(target);
    }
    function render(now: number) {
      frame = 0;
      if (resources.disposed || !active || !inView || hidden) return;
      const delta = previous ? Math.min((now - previous) / 1000, 0.05) : 0;
      previous = now;
      time = advanceTime(time, delta, speed);
      if (speed !== 0) storm += (Number(stormHeld) - storm) * (1 - Math.exp(-delta * 3));
      if (speed !== 0 && !reduced.matches && pointers.size === 0 && now - lastInteraction > 7000)
        azimuth += delta * 0.065;
      uniforms.time.value = time;
      uniforms.storm.value = storm;
      // The bottle rocks; ocean geometry stays in world space and clips against its inverse transform.
      bottle.rotation.z = Math.sin(time * 1.9) * storm * 0.025;
      bottle.rotation.x = Math.sin(time * 1.4) * storm * 0.018;
      bottle.position.y = Math.abs(Math.sin(time * 1.9)) * storm * 0.035;
      bottle.updateMatrixWorld(true);
      uniforms.inverse.value.copy(bottle.matrixWorld).invert();
      const pose = shipPose(time, storm);
      ship.position.set(pose.x, pose.y + 0.08, pose.z);
      ship.rotation.set(-pose.roll, pose.heading, pose.pitch);
      sails.scale.x = 1 + Math.sin(time * 3) * storm * 0.06;
      const sky = daylight(time),
        night = 1 - sky.light;
      uniforms.night.value = night;
      beacon.rotation.y = time * 0.7;
      materials.beam.opacity = 0.025 + night * 0.16;
      beaconLight.intensity = 0.4 + night * 2.5;
      treasureLight.intensity = 1.1 + night * 1.8;
      materials.glow.emissiveIntensity = 0.22 + night * 1.6;
      hemisphere.intensity = (0.65 + sky.light * 1.5) * (1 - storm * 0.42);
      key.intensity = (0.7 + sky.light * 2.8) * (1 - storm * 0.65);
      rim.intensity = 0.9 + night * 0.9;
      key.color.setHex(sky.label === "正午" ? 0xfff1ce : 0xffbb85);
      life.update(time, storm, sky.phase, night, pose);
      aim();
      renderer!.render(scene, camera);
      publish();
      if (delta > 0 && speed !== 0) {
        frameTotal += delta * 1000;
        frameCount += 1;
        if (frameCount >= 150) {
          const cap = bottlePixelRatio(
            stage.clientWidth,
            stage.clientHeight,
            window.devicePixelRatio,
          );
          const next = Math.min(cap, resolutionScale(scale, frameTotal / frameCount));
          if (next !== scale) {
            scale = next;
            renderer!.setPixelRatio(scale);
          }
          frameTotal = 0;
          frameCount = 0;
        }
      }
      if (speed !== 0) requestFrame();
    }
    function requestFrame() {
      if (!frame && !resources.disposed && active && inView && !hidden)
        frame = requestAnimationFrame(render);
    }
    function resize() {
      const width = stage.clientWidth,
        height = Math.max(360, stage.clientHeight);
      if (width === 0) return;
      const ratio = distance / fitDistance;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      fitDistance = fitBottleDistance(camera.aspect, azimuth, elevation);
      distance = fitDistance * Math.max(0.62, Math.min(1.65, ratio));
      scale = Math.min(scale, bottlePixelRatio(width, height, window.devicePixelRatio));
      renderer!.setPixelRatio(scale);
      renderer!.setSize(width, height, false);
      requestFrame();
    }
    resources.observe(new ResizeObserver(resize)).observe(stage);
    if (typeof IntersectionObserver !== "undefined")
      resources
        .observe(
          new IntersectionObserver(
            ([entry]) => {
              inView = entry?.isIntersecting ?? false;
              if (inView) requestFrame();
              else cancelFrame();
            },
            { threshold: 0.02 },
          ),
        )
        .observe(stage);
    resources.listen(document, "visibilitychange", () => {
      hidden = document.hidden;
      if (hidden) {
        release();
        cancelFrame();
      } else requestFrame();
    });
    resources.listen(window, "pagehide", () => {
      hidden = true;
      release();
      cancelFrame();
    });
    resources.listen(window, "pageshow", () => {
      hidden = document.hidden;
      requestFrame();
    });
    resources.listen(window, "blur", () => {
      release();
      publish();
    });
    resources.listen(reduced, "change", () => {
      if (reduced.matches) {
        speed = 0;
        storm = 0;
        release();
      }
      publish();
      requestFrame();
    });
    resources.listen(canvas, "webglcontextlost", (event) => {
      event.preventDefault();
      cancelFrame();
      failed();
    });
    resources.listen(canvas, "pointerdown", (event) => {
      const e = event as PointerEvent;
      if (e.button !== 0) return;
      canvas.focus({ preventScroll: true });
      canvas.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      pointerStart = { x: e.clientX, y: e.clientY };
      dragged = pointers.size > 1;
      lastInteraction = performance.now();
    });
    resources.listen(canvas, "pointermove", (event) => {
      const e = event as PointerEvent,
        old = pointers.get(e.pointerId);
      if (!old) return;
      const dx = e.clientX - old.x,
        dy = e.clientY - old.y;
      if (Math.hypot(e.clientX - pointerStart.x, e.clientY - pointerStart.y) > 5) dragged = true;
      if (pointers.size === 2) {
        const other = [...pointers.entries()].find(([id]) => id !== e.pointerId)?.[1];
        if (other) {
          const before = Math.hypot(old.x - other.x, old.y - other.y),
            after = Math.hypot(e.clientX - other.x, e.clientY - other.y);
          if (before > 0 && after > 0)
            distance = Math.max(
              fitDistance * 0.62,
              Math.min(fitDistance * 1.65, (distance * before) / after),
            );
        }
      } else {
        azimuth -= dx * 0.006;
        elevation = Math.max(0.1, Math.min(1.1, elevation + dy * 0.004));
      }
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      lastInteraction = performance.now();
      requestFrame();
    });
    resources.listen(canvas, "pointerup", (event) => {
      const e = event as PointerEvent;
      const wasDown = pointers.delete(e.pointerId);
      const clicked = wasDown && !dragged;
      if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
      if (clicked) {
        const rect = canvas.getBoundingClientRect();
        pointer.set(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          (-(e.clientY - rect.top) / rect.height) * 2 + 1,
        );
        raycaster.setFromCamera(pointer, camera);
        for (const hit of raycaster.intersectObjects(scene.children, true)) {
          let object: Object3D | null = hit.object;
          while (object && !object.userData["chapter"]) object = object.parent;
          if (object) {
            select(String(object.userData["chapter"]));
            break;
          }
        }
      }
      lastInteraction = performance.now();
    });
    for (const event of ["pointercancel", "lostpointercapture"])
      resources.listen(canvas, event, () => {
        pointers.clear();
        dragged = true;
      });
    resources.listen(
      canvas,
      "wheel",
      (event) => {
        event.preventDefault();
        distance = Math.max(
          fitDistance * 0.62,
          Math.min(fitDistance * 1.65, distance * Math.exp((event as WheelEvent).deltaY * 0.001)),
        );
        lastInteraction = performance.now();
        requestFrame();
      },
      { passive: false },
    );
    resources.listen(canvas, "keydown", (event) => {
      const e = event as KeyboardEvent;
      if (e.code === "Space") {
        e.preventDefault();
        if (!reduced.matches) {
          stormHeld = true;
          publish();
          requestFrame();
        }
      }
    });
    resources.listen(window, "keyup", (event) => {
      if ((event as KeyboardEvent).code === "Space") {
        stormHeld = false;
        publish();
      }
    });
    resources.listen(canvas, "blur", () => {
      stormHeld = false;
      publish();
    });
    resize();
    publish();
    return {
      setActive(value) {
        active = value;
        if (active) {
          hidden = document.hidden;
          resize();
          requestFrame();
        } else {
          release();
          cancelFrame();
        }
      },
      setStorm(value) {
        stormHeld = value && !reduced.matches;
        publish();
        requestFrame();
      },
      cycleSpeed() {
        speed = nextSpeed(speed);
        lastInteraction = performance.now();
        previous = 0;
        publish();
        requestFrame();
      },
      resetView() {
        azimuth = BOTTLE_VIEW.azimuth;
        elevation = BOTTLE_VIEW.elevation;
        fitDistance = fitBottleDistance(camera.aspect);
        distance = fitDistance;
        lastInteraction = performance.now();
        requestFrame();
      },
      dispose: () => resources.dispose(),
    };
  } catch (error) {
    void resources.dispose();
    throw error;
  }
}
