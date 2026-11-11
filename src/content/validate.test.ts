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
    ...overrides,
  };
  return [
    "---",
    ...Object.entries(fm).map(([k, v]) => `${k}: ${v}`),
    "keyIdeas:",
    "  - one idea",
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

const parse = (raw: string, dirName = "sample", k = kit) => parseArticle({ dirName, raw, kit: k });

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
    const r = parse(mdx("<Callout>x</Callout>\n\n<div>y</div>"));
    const text = !r.ok ? r.issues.join("\n") : "";
    expect(text).toMatch(/<Callout> is not an allowed component/);
    expect(text).toMatch(/<div> is not an allowed component/);
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
