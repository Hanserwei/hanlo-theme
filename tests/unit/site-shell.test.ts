import { describe, expect, it } from "vitest";

import { siteShellTestables } from "../../src/js/features/site-shell";

describe("site shell state helpers", () => {
  it("selects the established greeting for each time period", () => {
    expect(siteShellTestables.timeGreeting("default", new Date("2026-09-01T08:00:00"))).toBe(
      "早上好",
    );
    expect(siteShellTestables.timeGreeting("one", new Date("2026-09-01T20:00:00"))).toBe(
      "不要太劳累了，早睡更健康",
    );
  });

  it("samples without mutating or duplicating input", () => {
    const input = [1, 2, 3];
    const result = siteShellTestables.randomItems(input, 3);
    expect(new Set(result).size).toBe(3);
    expect(input).toEqual([1, 2, 3]);
  });

  it("classifies contrast and clamps color adjustments", () => {
    expect(siteShellTestables.contrastIsLight("#ffffff")).toBe(true);
    expect(siteShellTestables.contrastIsLight("#000000")).toBe(false);
    expect(siteShellTestables.adjustHexColor("#101010", -40)).toBe("#000000");
  });
});
