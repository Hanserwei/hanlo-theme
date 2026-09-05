import { describe, expect, it } from "vitest";

import { submenuViewportShift } from "../../src/js/features/site-shell/desktop-menus";

describe("desktop submenu viewport placement", () => {
  it.each([
    { left: 400, width: 480, viewport: 1280, expected: 0 },
    { left: -180, width: 700, viewport: 1280, expected: 196 },
    { left: 1000, width: 240, viewport: 1200, expected: -56 },
    { left: -40, width: 736, viewport: 768, expected: 56 },
    { left: 80, width: 900, viewport: 768, expected: -64 },
  ])(
    "keeps a $width px panel inside a $viewport px viewport",
    ({ left, width, viewport, expected }) => {
      expect(submenuViewportShift(left, width, viewport)).toBe(expected);
    },
  );

  it("does not shift a panel repeatedly when measured after adjustment", () => {
    const left = 890;
    const width = 560;
    const viewport = 1280;
    const adjusted = left + submenuViewportShift(left, width, viewport);
    expect(submenuViewportShift(adjusted, width, viewport)).toBe(0);
  });
});
