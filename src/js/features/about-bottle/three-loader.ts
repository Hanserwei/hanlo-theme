export type Three = typeof import("three");
export const THREE_CDN = "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
let pending: Promise<Three> | undefined;

export function loadThree(): Promise<Three> {
  pending ??= import(/* @vite-ignore */ THREE_CDN)
    .then((module: Three) => {
      if (module.REVISION !== "160") throw new Error("Unexpected Three.js revision.");
      return module;
    })
    .catch((error: unknown) => {
      pending = undefined;
      throw error;
    });
  return pending;
}
