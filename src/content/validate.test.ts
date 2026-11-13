import { describe, expect, it } from "vitest";
import { parseArticle, timestampToSeconds } from "./validate";

const kit = [{ path: "prompt.md", content: "apply it" }];

function mdx(body: string, overrides: Record<string, string> = {}) {
  const fm = {
    slug: "sample",
    title: "Sample",
    summary: "A sample article.",
    category: "people",
    difficulty: "intro",
    publishedAt: "2026-11-01",
    brief: "{ what: 무슨 일, why: 중요합니다, action: 키트를 돌립니다 }",
    ...overrides,
  };
  return [
    "---",
    ...Object.entries(fm).map(([k, v]) => `${k}: ${v}`),
    "keyIdeas:",
    "  - one idea",
    "apply:",
    "  goal: Do one thing",
    "  changes: [Edit a file, Add a test]",
    "  doesNotDo: [Touch app logic]",
    "  fitsWhen: Any repo",
    "  time: 10분",
    "tryIt: List the test commands. Change no files.",
    "sources:",
    "  - id: talk",
    "    title: A talk",
    "    url: https://example.com/talk",
    "    author: Someone",
    "    kind: video",
    "    publishedAt: 2026-10-01",
    "  - id: post",
    "    title: A post",
    "    url: https://example.com/post",
    "    author: Someone",
    "    kind: blog",
    "    publishedAt: 2026-10-02",
    "---",
    body,
  ].join("\n");
}

const people = new Map([["ada", { id: "ada", name: "Ada", nameKo: "에이다", role: "테스트 인물" }]]);
const glossary = new Map([["mcp", { id: "mcp", term: "MCP", definition: "에이전트에 도구를 연결하는 규약입니다." }]]);
const parse = (raw: string, dirName = "sample", k = kit) => parseArticle({ dirName, raw, kit: k, people, glossary });

describe("parseArticle", () => {
  it("accepts a valid article with timed and untimed quotes", () => {
    const r = parse(
      mdx('<Quote source="talk" at="1:02:03">said this</Quote>\n\n<Quote source="post">wrote this</Quote>'),
    );
    expect(r).toMatchObject({ ok: true, article: { slug: "sample", draft: false } });
  });

  it("rejects a quote whose source id is not declared", () => {
    const r = parse(mdx('<Quote source="nope" at="0:10">x</Quote>'));
    expect(r.ok).toBe(false);
    expect(!r.ok && r.issues.join("\n")).toMatch(/source="nope".*does not match/);
  });

  it("rejects a video quote without a timestamp", () => {
    const r = parse(mdx('<Quote source="talk">x</Quote>'));
    expect(!r.ok && r.issues.join("\n")).toMatch(/"at" timestamp is required/);
  });

  it("rejects a malformed timestamp", () => {
    const r = parse(mdx('<Quote source="talk" at="12m">x</Quote>'));
    expect(!r.ok && r.issues.join("\n")).toMatch(/mm:ss/);
  });

  it("rejects a quote with no source attribute", () => {
    const r = parse(mdx("<Quote>x</Quote>"));
    expect(!r.ok && r.issues.join("\n")).toMatch(/needs a string "source"/);
  });

  it("checks quotes nested inside other components", () => {
    const r = parse(mdx('<KeyIdea>\n  <Quote source="nope">x</Quote>\n</KeyIdea>'));
    expect(!r.ok && r.issues.join("\n")).toMatch(/does not match/);
  });

  it("rejects components outside the allowed set, including raw HTML tags", () => {
    const r = parse(mdx("<Callout>x</Callout>\n\n<div>y</div>\n\n<Steps>z</Steps>"));
    const text = !r.ok ? r.issues.join("\n") : "";
    expect(text).toMatch(/<Callout> is not an allowed component/);
    expect(text).toMatch(/<div> is not an allowed component/);
    expect(text).toMatch(/<Steps> is not an allowed component/);
  });

  it("resolves people ids and rejects unknown ones", () => {
    const ok = parse(mdx("body", { people: "[ada]" }));
    expect(ok).toMatchObject({ ok: true, article: { persons: [{ nameKo: "에이다" }] } });
    const bad = parse(mdx("body", { people: "[ghost]" }));
    expect(!bad.ok && bad.issues.join("\n")).toMatch(/"ghost" is not in content\/people.yaml/);
  });

  it("resolves <Term> ids in first-use order and rejects unknown ones", () => {
    const ok = parse(mdx('<Term id="mcp">MCP</Term> 서버와 <Term id="mcp">MCP</Term>'));
    expect(ok).toMatchObject({ ok: true, article: { terms: [{ id: "mcp" }] } });
    expect(ok.ok && ok.article.terms).toHaveLength(1);
    const bad = parse(mdx('<Term id="ghost">x</Term>\n\n<Term>y</Term>'));
    const text = !bad.ok ? bad.issues.join("\n") : "";
    expect(text).toMatch(/<Term id="ghost"> is not in content\/glossary.yaml/);
    expect(text).toMatch(/<Term> needs a string "id"/);
  });

  it("accepts a brief and rejects an over-long one", () => {
    const brief = (what: string) => `{ what: "${what}", why: "중요합니다", action: "키트를 돌립니다" }`;
    expect(parse(mdx("body", { brief: brief("무슨 일") })).ok).toBe(true);
    const bad = parse(mdx("body", { brief: brief("가".repeat(141)) }));
    expect(!bad.ok && bad.issues.join("\n")).toMatch(/frontmatter\.brief\.what/);
  });

  it("rejects a hook-colon title", () => {
    const bad = parse(mdx("body", { title: `"로봇 말고 슈트를: 카파시의 Software 3.0"` }));
    expect(!bad.ok && bad.issues.join("\n")).toMatch(/frontmatter\.title: no ":" in titles/);
  });

  it("rejects body headings but allows a scene break", () => {
    const bad = parse(mdx("첫 문단입니다.\n\n## 소제목\n\n둘째 문단입니다."));
    expect(!bad.ok && bad.issues.join("\n")).toMatch(/body headings are not allowed/);
    expect(parse(mdx("첫 문단입니다.\n\n---\n\n둘째 문단입니다.")).ok).toBe(true);
  });

  it("rejects bold that cannot close before Korean text", () => {
    const bad = parse(mdx('그는 **"에이전트의 10년"**이라고 부릅니다.'));
    expect(!bad.ok && bad.issues.join("\n")).toMatch(/literal asterisks/);
    expect(parse(mdx('그는 "**에이전트의 10년**"이라고 부릅니다.')).ok).toBe(true);
  });

  it("rejects slug that differs from directory name", () => {
    const r = parse(mdx("body"), "other-dir");
    expect(!r.ok && r.issues.join("\n")).toMatch(/must equal directory name/);
  });

  it("rejects missing kit prompt", () => {
    const r = parse(mdx("body"), "sample", []);
    expect(!r.ok && r.issues.join("\n")).toMatch(/kit\/prompt\.md is missing/);
  });

  it("reports frontmatter errors and continues collecting others", () => {
    const r = parse(mdx("body", { category: "gossip" }), "sample", []);
    expect(r.ok).toBe(false);
    const text = !r.ok ? r.issues.join("\n") : "";
    expect(text).toMatch(/frontmatter\.category/);
    expect(text).toMatch(/kit\/prompt\.md is missing/);
  });

  it("reports invalid MDX instead of throwing", () => {
    const r = parse(mdx("<Quote source="));
    expect(!r.ok && r.issues.join("\n")).toMatch(/^mdx:/m);
  });
});

describe("timestampToSeconds", () => {
  it("handles mm:ss and h:mm:ss", () => {
    expect(timestampToSeconds("12:34")).toBe(754);
    expect(timestampToSeconds("1:02:03")).toBe(3723);
  });
});
