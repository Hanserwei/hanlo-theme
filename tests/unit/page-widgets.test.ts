import { describe, expect, it } from "vitest";

import { pageWidgetTestables } from "../../src/js/features/page-widgets";

describe("page widget configuration", () => {
  it("normalizes FormKit realNode values", () => {
    expect(
      pageWidgetTestables.parseGreetingItems([
        { realNode: { greeting: "早上好", start_time: "6", end_time: "9" } },
      ]),
    ).toEqual([{ greeting: "早上好", start: 6, end: 9 }]);
    expect(pageWidgetTestables.parseTypedTexts([{ realNode: { text: "Hello" } }])).toEqual([
      "Hello",
    ]);
  });

  it("replaces legacy footer defaults without rewriting custom images", () => {
    expect(
      pageWidgetTestables.normalizeFooterRuntimeImage(
        "/upload/%E5%9B%B0%E5%9B%B0%E9%B1%BC-%E4%B8%8B%E7%8F%AD%E5%95%A6-yellowgreen.svg",
      ),
    ).toBe("/themes/theme-hanlo/assets/images/footer/shiba.svg");
    expect(
      pageWidgetTestables.normalizeFooterRuntimeImage(
        "/themes/theme-hanlo/assets/images/hanlo-logo.png",
      ),
    ).toBe("/themes/theme-hanlo/assets/images/footer/shiba.svg");
    expect(pageWidgetTestables.normalizeFooterRuntimeImage("")).toBe(
      "/themes/theme-hanlo/assets/images/footer/shiba.svg",
    );
    expect(pageWidgetTestables.normalizeFooterRuntimeImage("/upload/custom.webp")).toBe(
      "/upload/custom.webp",
    );
  });
});
