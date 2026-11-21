import { describe, expect, it } from "vitest";
import { koreanStyleWarnings } from "./koreanStyle";

describe("koreanStyleWarnings", () => {
  it("warns on a sentence over 60 characters and stays quiet under the limit", () => {
    const long = `${"가".repeat(61)}.`;
    expect(koreanStyleWarnings(long).some((warning) => warning.includes("60자"))).toBe(true);
    expect(koreanStyleWarnings("짧은 문장입니다.")).toEqual([]);
  });

  it("warns on reported speech, third-person pronouns, memos, and extra parentheses", () => {
    expect(koreanStyleWarnings("비용이 줄었다고 합니다.").some((w) => w.includes("간접화법"))).toBe(true);
    expect(koreanStyleWarnings("그는 비용을 줄였습니다.").some((w) => w.includes("대명사"))).toBe(true);
    expect(koreanStyleWarnings("2026년 11월 17일에 확인했습니다.").some((w) => w.includes("검증 메모"))).toBe(true);
    expect(koreanStyleWarnings("| a (1) | b (2) |\n|---|---|").some((w) => w.includes("괄호"))).toBe(false);
    expect(koreanStyleWarnings("값(가)과 다른 값(나)을 적습니다.").some((w) => w.includes("괄호"))).toBe(true);
  });

  it("ignores long lines inside code fences and English quotes", () => {
    const markdown = ["```", "가".repeat(80), "```", "", "짧은 문장입니다.", "", "<Quote>", "가".repeat(80), "</Quote>"].join(
      "\n",
    );
    expect(koreanStyleWarnings(markdown)).toEqual([]);
  });
});
