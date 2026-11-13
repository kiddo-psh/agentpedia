import { describe, expect, it } from "vitest";
import { monthsBetween, newestPublished, sourceAge, sourcePeriod } from "./labels";

const at = (iso: string, dateNote?: string) => ({ publishedAt: new Date(iso), dateNote });

describe("sourcePeriod", () => {
  it("shows one month when all sources share it", () => {
    expect(sourcePeriod([at("2025-06-17"), at("2025-06-19")])).toBe("2025년 6월");
  });
  it("shows a range across months and flags estimated dates", () => {
    expect(sourcePeriod([at("2026-01-10"), at("2025-12-28", "추정")])).toBe("2025년 12월 ~ 2026년 1월 (일부 날짜는 원문 밖에서 확인)");
  });
});

describe("undated sources", () => {
  it("are left out of the period and the newest date", () => {
    const sources = [at("2025-06-18"), { accessedAt: new Date("2026-11-11") }];
    expect(sourcePeriod(sources)).toBe("2025년 6월");
    expect(newestPublished(sources).toISOString().slice(0, 10)).toBe("2025-06-18");
  });
});

describe("monthsBetween", () => {
  it("floors partial months", () => {
    expect(monthsBetween(new Date("2025-06-19"), new Date("2025-12-18"))).toBe(5);
    expect(monthsBetween(new Date("2025-06-19"), new Date("2025-12-19"))).toBe(6);
  });
});

describe("sourceAge", () => {
  it("reads this month, months, and years with months", () => {
    expect(sourceAge(0)).toBe("이번 달 자료");
    expect(sourceAge(5)).toBe("5개월 전 자료");
    expect(sourceAge(12)).toBe("1년 전 자료");
    expect(sourceAge(17)).toBe("1년 5개월 전 자료");
  });
});
