import { describe, expect, it } from "vitest";
import { checkKitFidelity, claimTokens, pathsInChanges, promptIntro } from "./kitFidelity";
import type { Article } from "./schema";

function article(overrides: Partial<Article> & { prompt: string }): Article {
  const { prompt, ...rest } = overrides;
  return {
    slug: "demo-kit",
    title: "Demo",
    summary: "summary",
    category: "trends",
    people: [],
    tags: [],
    sources: [
      {
        id: "s",
        title: "S",
        url: "https://example.com",
        author: "A",
        kind: "blog",
        publishedAt: new Date("2026-01-01"),
      },
    ],
    keyIdeas: ["에이전트가 CLI로 결과를 확인한다"],
    brief: { what: "w", why: "y", action: "a" },
    difficulty: "intro",
    apply: {
      goal: "핵심 기능을 CLI로 노출합니다",
      changes: ["`docs/demo-audit.md`에 보고서 추가", "CLI 명령 추가"],
      doesNotDo: ["앱 코드 수정"],
      fitsWhen: "any",
      time: "10분",
    },
    tryIt: "진단. 아무 파일도 바꾸지 마.",
    draft: false,
    publishedAt: new Date("2026-01-02"),
    bodyMarkdown: "본문",
    persons: [{ id: "p", name: "Peter Steinberger", nameKo: "피터 스타인berger", role: "개발자" }],
    terms: [],
    kit: [{ path: "prompt.md", content: prompt }, { path: "checklist.md", content: "- [ ] ok" }],
    ...rest,
  };
}

const goodPrompt = `# 목표: 핵심 기능을 CLI로 노출하기

Peter Steinberger의 CLI-first 원칙으로 에이전트가 결과를 확인하게 한다.

## 0. 맞는지 먼저 판단하기

하나라도 해당하지 않으면 **변경하지 말고 멈춘 뒤** 이유를 알린다.

## 1. 계획을 보여주고 승인받기

사용자의 승인을 받은 뒤에만 진행한다. \`docs/demo-audit.md\`에 보고서를 쓴다.

## 2. 실행해서 확인하기

만든 CLI를 직접 실행해 출력을 확인한다.
`;

describe("kitFidelity helpers", () => {
  it("splits claim tokens and prompt intro", () => {
    expect(claimTokens("에이전트가 CLI로 확인")).toEqual(
      expect.arrayContaining(["에이전트가", "cli", "확인"]),
    );
    expect(promptIntro("# a\n\nintro\n\n## 1\nbody")).toContain("intro");
    expect(promptIntro("# a\n\nintro\n\n## 1\nbody")).not.toContain("body");
    expect(pathsInChanges(["`docs/foo.md`에 추가", "plain"])).toEqual(["docs/foo.md"]);
  });
});

describe("checkKitFidelity", () => {
  it("accepts a prompt that states the claim and safety gates", () => {
    expect(checkKitFidelity(article({ prompt: goodPrompt }))).toEqual([]);
  });

  it("rejects a prompt missing claim cues and safety gates", () => {
    const issues = checkKitFidelity(
      article({
        prompt: `# 목표: 뭔가 하기\n\n일반 안내만 있다.\n`,
        persons: [],
        keyIdeas: ["격리와 샌드박스"],
      }),
    );
    expect(issues.some((i) => i.includes("keyIdeas"))).toBe(true);
    expect(issues.some((i) => i.includes("stop"))).toBe(true);
    expect(issues.some((i) => i.includes("approval"))).toBe(true);
    expect(issues.some((i) => i.includes("verify"))).toBe(true);
  });

  it("rejects sibling kits that take Boris's verify-command job", () => {
    const issues = checkKitFidelity(
      article({
        slug: "harrison-chase-agent-harness",
        persons: [{ id: "h", name: "Harrison Chase", nameKo: "해리슨 체이스", role: "CEO" }],
        keyIdeas: ["하네스와 컨텍스트"],
        apply: {
          goal: "하네스를 점검합니다",
          changes: ["`docs/agent-harness-audit.md`에 보고서 추가"],
          doesNotDo: ["코드 수정"],
          fitsWhen: "any",
          time: "10분",
        },
        prompt: `# 목표: 하네스 점검

Harrison Chase의 하네스 틀로 컨텍스트를 본다.

## 0. 맞는지 먼저 판단하기
해당하지 않으면 멈춘 뒤 이유를 알린다.

## 1. 승인받기
승인을 받는다. \`docs/agent-harness-audit.md\`를 쓴다.

## 2. 실행해서 확인하기
검증 명령을 CLAUDE.md에 덧붙인다. 명령을 실행해 확인한다.
`,
      }),
    );
    expect(issues.some((i) => i.includes("Boris"))).toBe(true);
  });

  it("allows mentioning Boris's job only to refuse it", () => {
    expect(
      checkKitFidelity(
        article({
          slug: "harrison-chase-agent-harness",
          persons: [{ id: "h", name: "Harrison Chase", nameKo: "해리슨 체이스", role: "CEO" }],
          keyIdeas: ["하네스와 컨텍스트"],
          apply: {
            goal: "하네스를 점검합니다",
            changes: ["`docs/agent-harness-audit.md`에 보고서 추가"],
            doesNotDo: ["코드 수정"],
            fitsWhen: "any",
            time: "10분",
          },
          prompt: `# 목표: 하네스를 점검하기

Harrison Chase의 하네스 틀로 컨텍스트를 본다. **검증 명령을 지시 파일에 덧붙이는 일은 하지 않는다**(그건 Boris Cherny 키트 범위다).

## 0. 맞는지 먼저 판단하기
해당하지 않으면 멈춘 뒤 이유를 알린다.

## 1. 승인받기
승인을 받는다. \`docs/agent-harness-audit.md\`를 쓴다.

## 2. 실행해서 확인하기
명령을 실행해 확인한다.
`,
        }),
      ),
    ).toEqual([]);
  });
});
