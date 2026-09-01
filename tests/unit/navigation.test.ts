import { describe, expect, it } from "vitest";

import { isEligiblePrefetch } from "../../src/js/core/prefetch";

describe("internal link prefetch", () => {
  it("accepts same-origin navigable links", () => {
    expect(
      isEligiblePrefetch({ currentUrl: "https://blog.test/", href: "https://blog.test/next" }),
    ).toBe(true);
  });

  it("rejects external, fragment and new-tab targets", () => {
    expect(
      isEligiblePrefetch({ currentUrl: "https://blog.test/", href: "https://example.test/" }),
    ).toBe(false);
    expect(isEligiblePrefetch({ currentUrl: "https://blog.test/", href: "#section" })).toBe(false);
    expect(
      isEligiblePrefetch({ currentUrl: "https://blog.test/", href: "/next", target: "_blank" }),
    ).toBe(false);
  });
});
