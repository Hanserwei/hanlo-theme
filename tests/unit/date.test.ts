import { describe, expect, it } from "vitest";

import {
  differenceInDays,
  formatExactRelativeDate,
  formatRelativeDate,
} from "../../src/js/core/date";

const suffixes = { just: "刚刚", min: "分钟前", hour: "小时前", day: "天前" };
const now = new Date("2026-09-01T12:00:00Z");

describe("date utilities", () => {
  it("calculates whole elapsed days", () => {
    expect(differenceInDays("2026-08-30T12:00:00Z", now)).toBe(2);
  });

  it("formats recent and exact relative dates", () => {
    expect(formatRelativeDate("2026-09-01T11:30:00Z", suffixes, now)).toBe("30 分钟前");
    expect(formatExactRelativeDate("2026-09-01T10:00:00Z", suffixes, now)).toBe("2 小时前");
  });

  it("uses a calendar date for older content", () => {
    expect(formatRelativeDate("2026-08-01T12:00:00Z", suffixes, now)).toContain("2026");
  });
});
