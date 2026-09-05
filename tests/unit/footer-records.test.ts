import { describe, expect, it } from "vitest";

import { footerUptime, voyagerEstimate } from "../../src/js/features/page-widgets/footer-records";

describe("footer site records", () => {
  it("counts from local midnight and carries seconds into the next day", () => {
    const start = new Date(2026, 0, 1).getTime();
    expect(footerUptime("2026-01-01", start + 86_399_000)).toBe(
      "本站居然运行了 0 天 23 小时 59 分 59 秒",
    );
    expect(footerUptime("2026-01-01", start + 86_400_000)).toBe(
      "本站居然运行了 1 天 0 小时 0 分 0 秒",
    );
  });

  it.each(["", "not-a-date", "2026-02-30", "2026-13-01", "2026-00-01"])(
    "hides the counter for an invalid start date: %s",
    (start) => expect(footerUptime(start, Date.now())).toBeNull(),
  );

  it("accepts leap days and clamps future starts to zero", () => {
    expect(footerUptime("2024-02-29", new Date(2024, 2, 1).getTime())).toBe(
      "本站居然运行了 1 天 0 小时 0 分 0 秒",
    );
    expect(footerUptime("2030-01-01", new Date(2026, 0, 1).getTime())).toBe(
      "本站居然运行了 0 天 0 小时 0 分 0 秒",
    );
  });

  it("uses the stated flight-speed model and kilometers per astronomical unit", () => {
    const launch = Date.parse("1977-09-05T12:56:00Z");
    expect(voyagerEstimate(launch - 1_000).kilometers).toBe(0);
    expect(voyagerEstimate(launch).kilometers).toBe(0);
    expect(voyagerEstimate(launch + 1_000).kilometers).toBe(17);
    const estimate = voyagerEstimate(launch + 86_400_000);
    expect(estimate.kilometers).toBe(1_468_800);
    expect(estimate.astronomicalUnits).toBeCloseTo(1_468_800 / 149_597_870.7, 10);
  });
});
