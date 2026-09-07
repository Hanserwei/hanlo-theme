import { describe, expect, it } from "vitest";

import { PageResourceScope } from "../../src/js/core/resource-scope";
import {
  createCommentAvatar,
  mountCommentAvatars,
} from "../../src/js/features/page-widgets/comment-avatar";

function fixture(src: string, complete: boolean, naturalWidth: number) {
  const image = Object.assign(new EventTarget(), {
    src,
    complete,
    naturalWidth,
    alt: "访客",
    dataset: { hanloAvatarSeed: "visitor-1" },
    getAttribute: () => image.src,
    removeAttribute: () => {},
  });
  const root = { querySelectorAll: () => [image] } as unknown as ParentNode;
  return { image, root };
}

describe("comment avatar fallback", () => {
  it("generates stable, distinct images without interpolating visitor markup", () => {
    expect(createCommentAvatar("visitor-1")).toBe(createCommentAvatar("visitor-1"));
    expect(createCommentAvatar("visitor-1")).not.toBe(createCommentAvatar("visitor-2"));
    const svg = decodeURIComponent(
      createCommentAvatar('<img onerror="alert(1)">').split(",").slice(1).join(","),
    );
    expect(svg).toContain("<svg");
    expect(svg).not.toMatch(/onerror|<img|alert|<script/);
  });

  it.each([
    ["", true, 0],
    ["/broken.png", true, 0],
  ] as const)("replaces a missing or already broken avatar (%s)", async (src, complete, width) => {
    const resources = new PageResourceScope();
    const { image, root } = fixture(src, complete, width);
    mountCommentAvatars(root, resources);
    expect(image.src).toBe(createCommentAvatar("visitor-1"));
    image.dispatchEvent(new Event("error"));
    expect(image.src).toBe(createCommentAvatar("visitor-1"));
    await resources.dispose();
  });

  it("preserves pending and loaded remote avatars, then falls back on error", async () => {
    const resources = new PageResourceScope();
    const { image, root } = fixture("/avatar.png", false, 0);
    mountCommentAvatars(root, resources);
    expect(image.src).toBe("/avatar.png");
    image.complete = true;
    image.naturalWidth = 80;
    image.dispatchEvent(new Event("load"));
    expect(image.src).toBe("/avatar.png");
    image.dispatchEvent(new Event("error"));
    expect(image.src).toBe(createCommentAvatar("visitor-1"));
    await resources.dispose();
  });

  it("releases error listeners on disposal", async () => {
    const resources = new PageResourceScope();
    const { image, root } = fixture("/avatar.png", true, 80);
    mountCommentAvatars(root, resources);
    await resources.dispose();
    image.dispatchEvent(new Event("error"));
    expect(image.src).toBe("/avatar.png");
  });
});
