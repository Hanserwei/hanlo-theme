import { describe, expect, it } from "vitest";

import { bangumiPageCount } from "../../src/js/features/bangumi";

describe("bangumi pagination", () => {
  it("always has one page and rounds additional pages up", () => {
    expect(bangumiPageCount(0)).toBe(1);
    expect(bangumiPageCount(10)).toBe(1);
    expect(bangumiPageCount(11)).toBe(2);
  });
});
