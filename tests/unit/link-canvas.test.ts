import { describe, expect, it } from "vitest";

import { extractLinkLogos } from "../../src/js/features/link-canvas";

describe("link canvas data", () => {
  it("extracts only valid link logos", () => {
    expect(
      extractLinkLogos([
        { links: [{ spec: { logo: "https://example.test/a.png" } }, { spec: {} }] },
        { links: [{ spec: { logo: "https://example.test/b.png" } }] },
      ]),
    ).toEqual(["https://example.test/a.png", "https://example.test/b.png"]);
  });

  it("degrades malformed plugin data to an empty canvas", () => {
    expect(extractLinkLogos({ links: [] })).toEqual([]);
  });
});
