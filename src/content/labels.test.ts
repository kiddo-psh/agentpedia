import { describe, expect, it } from "vitest";
import { monthsBetween, sourcePeriod } from "./labels";

const at = (iso: string, dateNote?: string) => ({ publishedAt: new Date(iso), dateNote });

describe("sourcePeriod", () => {
  it("shows one month when all sources share it", () => {
    expect(sourcePeriod([at("2025-06-17"), at("2025-06-19")])).toBe("2025년 6월");
  });
  it("shows a range across months and flags estimated dates", () => {
    expect(sourcePeriod([at("2026-01-10"), at("2025-12-28", "추정")])).toBe("2025년 12월 ~ 2026년 1월 (일부 추정)");
  });
});

describe("monthsBetween", () => {
  it("floors partial months", () => {
    expect(monthsBetween(new Date("2025-06-19"), new Date("2025-12-18"))).toBe(5);
    expect(monthsBetween(new Date("2025-06-19"), new Date("2025-12-19"))).toBe(6);
  });
});
