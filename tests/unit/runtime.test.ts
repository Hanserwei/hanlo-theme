import { describe, expect, it } from "vitest";

import { documentLifecycleAction } from "../../src/js/core/runtime";

describe("native document lifecycle decisions", () => {
  it("preserves controllers when a page enters the back-forward cache", () => {
    expect(documentLifecycleAction("pagehide", true)).toBe("preserve");
  });

  it("destroys controllers when the document realm is discarded", () => {
    expect(documentLifecycleAction("pagehide", false)).toBe("destroy");
  });

  it("emits a restore signal only for BFCache history restoration", () => {
    expect(documentLifecycleAction("pageshow", true)).toBe("restore");
    expect(documentLifecycleAction("pageshow", false)).toBe("ignore");
  });
});
