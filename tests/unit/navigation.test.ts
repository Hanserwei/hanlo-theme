import { describe, expect, it, vi } from "vitest";

import { navigateTo, type LocationNavigator } from "../../src/js/core/navigation";
import {
  createPrefetchRule,
  isEligiblePrefetch,
  isPrefetchAllowedByConnection,
} from "../../src/js/core/prefetch";

describe("internal link prefetch", () => {
  it("accepts same-origin navigable links", () => {
    expect(
      isEligiblePrefetch({ currentUrl: "https://blog.test/", href: "https://blog.test/next" }),
    ).toBe(true);
  });

  it.each([
    { href: "https://example.test/" },
    { href: "#section" },
    { href: "/next", target: "_blank" },
    { href: "/next", download: true },
    { href: "/next", external: true },
    { href: "/next", nofollow: true },
    { href: "/next", noPrefetch: true },
    { href: "/login" },
    { href: "/logout" },
    { href: "/console" },
    { href: "/uc/profile" },
    { href: "/register" },
    { href: "/password/reset" },
    { href: "/apis/content.halo.run/v1alpha1/posts" },
    { href: "/feed.xml" },
    { href: "/rss.xml" },
    { href: "/atom.xml" },
    { href: "/next?token=secret" },
    { href: "/next?TOKEN=secret" },
    { href: "/next", saveData: true },
    { href: "/next", effectiveType: "2g" },
    { href: "mailto:hello@example.test" },
    { href: "not a valid URL", currentUrl: "also invalid" },
  ])("rejects unsafe or wasteful candidate $href", (candidate) => {
    expect(isEligiblePrefetch({ currentUrl: "https://blog.test/", ...candidate })).toBe(false);
  });

  it("allows safe query navigation but rejects the exact current document", () => {
    expect(
      isEligiblePrefetch({ currentUrl: "https://blog.test/posts?page=1", href: "/posts?page=2" }),
    ).toBe(true);
    expect(
      isEligiblePrefetch({ currentUrl: "https://blog.test/posts?page=1", href: "/posts?page=1" }),
    ).toBe(false);
  });

  it("creates a deduplicated conservative speculation rule", () => {
    expect(createPrefetchRule(["https://blog.test/a", "https://blog.test/a"])).toEqual({
      prefetch: [{ source: "list", urls: ["https://blog.test/a"], eagerness: "conservative" }],
    });
  });

  it("disables hints for data saving and slow connections", () => {
    expect(isPrefetchAllowedByConnection()).toBe(true);
    expect(isPrefetchAllowedByConnection({ saveData: true })).toBe(false);
    expect(isPrefetchAllowedByConnection({ effectiveType: "slow-2g" })).toBe(false);
    expect(isPrefetchAllowedByConnection({ effectiveType: "4g" })).toBe(true);
  });
});

describe("programmatic document navigation", () => {
  it("uses assign or replace for same-origin URLs", () => {
    const location = {
      href: "https://blog.test/current",
      assign: vi.fn(),
      replace: vi.fn(),
    } satisfies LocationNavigator;

    navigateTo("/next", {}, location);
    navigateTo("/final", { replace: true }, location);

    expect(location.assign).toHaveBeenCalledWith("https://blog.test/next");
    expect(location.replace).toHaveBeenCalledWith("https://blog.test/final");
  });

  it("rejects malformed, non-http and cross-origin destinations", () => {
    const location = {
      href: "https://blog.test/current",
      assign: vi.fn(),
      replace: vi.fn(),
    } satisfies LocationNavigator;

    expect(() => navigateTo("https://example.test/", {}, location)).toThrow("same-origin");
    expect(() => navigateTo("javascript:alert(1)", {}, location)).toThrow("same-origin");
    expect(location.assign).not.toHaveBeenCalled();
  });
});
