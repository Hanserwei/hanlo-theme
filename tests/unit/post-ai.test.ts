import { describe, expect, it } from "vitest";

import { chooseLocalSummary } from "../../src/js/features/post-ai";

describe("post AI local summaries", () => {
  it("selects a summary and avoids repeating the prior index", () => {
    expect(chooseLocalSummary("first, second", -1, () => 0)).toEqual({
      summary: "first",
      index: 0,
    });
    expect(chooseLocalSummary("first, second", 0, () => 0)).toEqual({
      summary: "second",
      index: 1,
    });
  });

  it("provides a readable fallback for empty local content", () => {
    expect(chooseLocalSummary("", -1).summary).toBe("暂无文章摘要。");
  });
});
