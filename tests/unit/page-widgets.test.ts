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
});
