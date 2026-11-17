import { describe, expect, it } from "vitest";
import type { Article } from "@/content/schema";
import { AGENT_BODY_MAX_CHARS, bodyExcerptForAgent, bodyMarkdownForAgent } from "./bodyForAgent";

const article: Article = {
  slug: "demo",
  title: "데모",
  summary: "요약",
  category: "trends",
  people: [],
  tags: [],
  sources: [
    {
      id: "talk",
      title: "A talk",
      url: "https://example.com",
      author: "Ada",
      kind: "talk",
      publishedAt: new Date("2026-01-02"),
    },
  ],
  keyIdeas: ["아이디어"],
  brief: { what: "w", why: "y", action: "a" },
  difficulty: "intro",
  apply: {
    goal: "g",
    changes: ["c1", "c2"],
    doesNotDo: ["d"],
    fitsWhen: "any",
    time: "5분",
  },
  tryIt: "진단. 아무 파일도 바꾸지 마.",
  draft: false,
  publishedAt: new Date("2026-01-03"),
  bodyMarkdown: [
    '첫 문단에 <Term id="mcp">MCP</Term>가 나옵니다.',
    "## 첫째 절",
    "첫째 본문.",
    '<Quote source="talk" at="1:02">Original words.</Quote>',
    '<Pyramid shape="inverted" title="층">\n<PyramidLayer name="코드" />\n<PyramidLayer name="글" />\n</Pyramid>',
    "## 둘째 절",
    "둘째 본문.",
    "## 셋째 절",
    "셋째는 잘립니다.",
  ].join("\n\n"),
  persons: [],
  terms: [{ id: "mcp", term: "MCP", definition: "도구 규약." }],
  kit: [{ path: "prompt.md", content: "x" }],
};

describe("bodyForAgent", () => {
  it("strips MDX JSX into plain markdown", () => {
    const t = bodyMarkdownForAgent(article);
    expect(t).toContain("첫 문단에 MCP가 나옵니다.");
    expect(t).not.toMatch(/<Term|<Pyramid|<Quote/);
    expect(t).toContain("> Original words.");
    expect(t).toContain("1. 코드");
  });

  it("keeps at most the lead plus two ## sections and notes truncation", () => {
    const t = bodyExcerptForAgent(article);
    expect(t).toContain("## 첫째 절");
    expect(t).toContain("## 둘째 절");
    expect(t).not.toContain("## 셋째 절");
    expect(t).toContain("본문 일부만 포함");
  });

  it("respects the character cap", () => {
    const long: Article = {
      ...article,
      bodyMarkdown: ("단어 ".repeat(2000) + "\n\n## A\n\n" + "본문 ".repeat(2000) + "\n\n## B\n\n" + "더 ".repeat(2000)).trim(),
    };
    const t = bodyExcerptForAgent(long, 800);
    expect(t.length).toBeLessThanOrEqual(800 + 80); // room for the truncation note
    expect(t).toContain("…");
  });

  it("exports the documented default cap", () => {
    expect(AGENT_BODY_MAX_CHARS).toBe(3500);
  });
});
