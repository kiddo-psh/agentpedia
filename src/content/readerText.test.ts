import { describe, expect, it } from "vitest";
import { readerText } from "./readerText";
import type { Article } from "./schema";

const article: Article = {
  slug: "demo",
  title: "데모 기사",
  summary: "목록에만 나오는 요약",
  category: "trends",
  people: [],
  tags: [],
  sources: [{ id: "talk", title: "A talk", url: "https://example.com", author: "Ada", kind: "talk", publishedAt: new Date("2026-01-02") }],
  keyIdeas: ["MCP 응답에만 쓰이는 핵심"],
  brief: { what: "무슨 일 문장", why: "왜 중요한가 문장", action: "할 일 문장" },
  difficulty: "intro",
  apply: { goal: "키트 목표", changes: ["파일 A 수정", "파일 B 추가"], doesNotDo: ["코드 안 건드림"], fitsWhen: "맞는 프로젝트", time: "10분" },
  tryIt: "진단 프롬프트. 아무 파일도 바꾸지 마.",
  draft: false,
  publishedAt: new Date("2026-01-03"),
  bodyMarkdown: [
    '첫 문단에 <Term id="mcp">MCP</Term>가 나옵니다.',
    "---",
    '<Quote source="talk" at="1:02">Original words.</Quote>',
    '<KeyIdea title="박스 제목">\n박스 본문입니다.\n</KeyIdea>',
  ].join("\n\n"),
  persons: [],
  terms: [{ id: "mcp", term: "MCP", definition: "도구를 연결하는 규약입니다." }],
  kit: [{ path: "prompt.md", content: "키트 지시문 본문" }],
};

describe("readerText", () => {
  const text = readerText(article);
  const at = (s: string) => text.indexOf(s);

  it("follows the page order: brief, body, glossary, kit, sources", () => {
    const order = ["30초 요약", "첫 문단", "이 글의 용어 1개", "내 프로젝트에 적용하기", "## 출처"].map(at);
    expect(order.every((i) => i >= 0)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it("shows only what the page shows: no list summary, no key ideas", () => {
    expect(text).not.toContain("목록에만 나오는 요약");
    expect(text).not.toContain("MCP 응답에만 쓰이는 핵심");
  });

  it("marks hidden content instead of dropping it", () => {
    expect(text).toContain("MCP [용어 팝오버(클릭 시 표시): MCP — 도구를 연결하는 규약입니다.]");
    expect(text).toMatch(/\[접힌 영역: 키트 파일 보기 \(1개\)\]\n\[펼치면 보이는 내용:\n--- prompt.md\n키트 지시문 본문/);
  });

  it("renders body components the way the page labels them", () => {
    expect(text).toContain("———");
    expect(text).toContain("[인용] Original words.\n— Ada, A talk (1:02)");
    expect(text).toContain("[핵심 아이디어 상자] 박스 제목\n박스 본문입니다.");
  });
});
