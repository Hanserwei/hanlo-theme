import { describe, expect, it } from "vitest";

import { extractHeight } from "../../src/js/features/content-elements";

describe("content element dimensions", () => {
  it("derives responsive heights without evaluating arbitrary code", () => {
    expect(extractHeight(1_000, "50%", "cwidth")).toBe("500");
    expect(extractHeight(1_000, "100%", "${full}")).toBe(1_000);
    expect(extractHeight(1_000, "100%", "${>=900?600:400}")).toBe(600);
  });
});
