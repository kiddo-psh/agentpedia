import { describe, expect, it } from "vitest";
import { Idea, IdeasFile, canonicalizeUrl } from "./schema";

const sample = {
  slug: "persistent-agents-trusted-control-plane",
  topic: "OpenAI는 24시간 도는 코딩 에이전트를 untrusted로 운영한다",
  category: "security",
  people: ["Kevin S Lin (OpenAI)"],
  sources: ["https://developers.openai.com/blog/securing-persistent-agents-like-openclaw-at-openai"],
  publishedAt: "2026-11-12",
  sourceKind: "blog",
  tension: "권한을 더 주는 방향과 달리 제어면을 분리한다.",
  kitIdea: "최소권한 체크리스트를 만든다.",
  primaryVerified: true,
  confidence: "high",
  status: "idea",
};

describe("Idea schema", () => {
  it("accepts the content/ideas.yaml write-article-shaped row", () => {
    const r = Idea.safeParse(sample);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.slug).toBe(sample.slug);
      expect(r.data.sources[0]).toMatch(/^https:/);
      expect(r.data.status).toBe("idea");
    }
  });

  it("defaults primaryVerified false and confidence low for collector rows", () => {
    const r = Idea.parse({
      slug: "auto-hit",
      topic: "A collected topic",
      category: "trends",
      sources: ["https://example.com/a"],
      tension: "짧은 긴장.",
      kitIdea: "사람이 채웁니다.",
    });
    expect(r.primaryVerified).toBe(false);
    expect(r.confidence).toBe("low");
    expect(r.status).toBe("idea");
    expect(r.people).toEqual([]);
  });

  it("rejects unknown status values from the old plan vocabulary", () => {
    const r = Idea.safeParse({ ...sample, status: "shortlisted" });
    expect(r.success).toBe(false);
  });

  it("parses a backlog array", () => {
    expect(IdeasFile.safeParse([sample]).success).toBe(true);
  });
});

describe("canonicalizeUrl", () => {
  it("strips www, trailing slash, and utm params", () => {
    expect(canonicalizeUrl("https://www.Example.com/path/?utm_source=x&id=1")).toBe(
      "https://example.com/path?id=1",
    );
  });
});
