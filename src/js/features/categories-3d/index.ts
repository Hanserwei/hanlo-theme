import { PageResourceScope } from "../../core/resource-scope";
import type { PageControllerDefinition } from "../../core/types";

export { calculateTilt } from "./geometry";

export type CategorySceneLoader = () => Promise<{
  mountCategoryScene: (resources: PageResourceScope) => void;
}>;

export function mountCategories3d(
  resources: PageResourceScope,
  load: CategorySceneLoader = () => import("./scene.js"),
): void {
  if (!document.querySelector("[data-hanlo-category-card]")) return;
  document
    .querySelectorAll<HTMLImageElement>("[data-category-gallery] .category-image")
    .forEach((image) => {
      const hideBrokenImage = (): void => {
        image.hidden = true;
      };
      resources.listen(image, "error", hideBrokenImage, { once: true });
      if (image.complete && image.naturalWidth === 0) hideBrokenImage();
    });
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  let scene: PageResourceScope | undefined;
  let loading = false;
  let failed = false;
  const stop = (): void => {
    const previous = scene;
    scene = undefined;
    if (previous) void previous.dispose();
  };
  const start = async (): Promise<void> => {
    if (scene || loading || failed || reduced.matches || resources.disposed) return;
    loading = true;
    try {
      const { mountCategoryScene } = await load();
      if (reduced.matches || resources.disposed) return;
      scene = new PageResourceScope();
      mountCategoryScene(scene);
    } catch (error) {
      stop();
      failed = true;
      if (!resources.disposed) console.error("[Hanlo] Could not start category animations.", error);
    } finally {
      loading = false;
    }
  };
  resources.listen(reduced, "change", () => {
    if (reduced.matches) stop();
    else void start();
  });
  resources.defer(() => scene?.dispose());
  void start();
}

export function createCategories3dController(): PageControllerDefinition {
  return {
    name: "categories-3d",
    create: ({ resources }) => ({
      mount: () => mountCategories3d(resources),
      unmount() {},
    }),
  };
}
