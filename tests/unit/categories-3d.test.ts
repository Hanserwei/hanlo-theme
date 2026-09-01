import { describe, expect, it } from "vitest";

import { calculateTilt } from "../../src/js/features/categories-3d";

describe("native 3D category tilt", () => {
  it("centers the card when the pointer is centered", () => {
    expect(calculateTilt(50, 50, 100, 100)).toEqual({
      card: "rotateY(0deg) rotateX(0deg)",
      background: "translateX(0px) translateY(0px)",
    });
  });

  it("limits the visual tilt to fifteen degrees", () => {
    expect(calculateTilt(100, 0, 100, 100)).toEqual({
      card: "rotateY(15deg) rotateX(15deg)",
      background: "translateX(-20px) translateY(20px)",
    });
  });
});
