import type { PageResourceScope } from "../../core/resource-scope";

/** A stable, local identicon; the SVG contains only generated colors and coordinates. */
export function createCommentAvatar(seed: string): string {
  let hash = 2166136261;
  for (const character of seed || "访客") {
    hash = Math.imul(hash ^ (character.codePointAt(0) ?? 0), 16777619) >>> 0;
  }
  const hue = hash % 360;
  const cells: string[] = [];
  for (let row = 0; row < 5; row += 1) {
    for (let column = 0; column < 3; column += 1) {
      const bit = row * 3 + column;
      if (((hash >>> bit) & 1) === 0 && !(row === 2 && column === 2)) continue;
      const positions = column === 2 ? [column] : [column, 4 - column];
      for (const position of positions) {
        cells.push(
          `<rect x="${position * 12 + 10}" y="${row * 12 + 10}" width="12" height="12" rx="3"/>`,
        );
      }
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect width="80" height="80" rx="40" fill="hsl(${hue},55%,92%)"/><g fill="hsl(${hue},58%,42%)">${cells.join("")}</g></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function mountCommentAvatars(root: ParentNode, resources: PageResourceScope): void {
  root.querySelectorAll<HTMLImageElement>("[data-hanlo-comment-avatar]").forEach((image) => {
    let fallbackApplied = false;
    const fallback = () => {
      if (fallbackApplied) return;
      fallbackApplied = true;
      image.removeAttribute("srcset");
      image.src = createCommentAvatar(image.dataset["hanloAvatarSeed"] ?? image.alt);
    };
    resources.listen(image, "error", fallback);
    if (!image.getAttribute("src") || (image.complete && image.naturalWidth === 0)) fallback();
  });
}
