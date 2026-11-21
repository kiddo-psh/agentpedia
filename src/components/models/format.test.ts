import { describe, expect, it } from "vitest";
import { isRedundantModelBody } from "./format";

describe("isRedundantModelBody", () => {
  it("hides a one-line vendor and harness restatement", () => {
    expect(
      isRedundantModelBody("Anthropic 모델입니다. Terminal-Bench 4.1 수치는 Claude Code 하네스로 잰 값입니다."),
    ).toBe(true);
    expect(isRedundantModelBody("")).toBe(true);
  });

  it("keeps a blurb that states a pricing fact", () => {
    const copilot =
      "GitHub 모델입니다. Terminal-Bench 4.1 수치는 GitHub Copilot 하네스로 잰 값입니다. 토큰 단가는 고정 목록가가 없고, 요청마다 골라 쓴 하위 모델 요금으로 청구됩니다.";
    expect(isRedundantModelBody(copilot)).toBe(false);
  });
});
