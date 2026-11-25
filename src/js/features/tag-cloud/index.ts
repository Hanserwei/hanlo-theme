import type { PageControllerDefinition } from "../../core/types";

export function createTagCloudController(): PageControllerDefinition {
  return {
    name: "tag-cloud",
    create: ({ resources }) => ({
      mount(root) {
        const index = root.querySelector<HTMLElement>("[data-tag-index]");
        if (!index?.querySelector(".tag-index__item")) return;
        void import("./scene.js")
          .then(({ mountTagCloud }) => {
            if (!resources.disposed && index.isConnected) mountTagCloud(index, resources);
          })
          .catch((error: unknown) => {
            if (!resources.disposed) console.error("[Hanlo] Could not start the tag cloud.", error);
          });
      },
      unmount() {},
    }),
  };
}
