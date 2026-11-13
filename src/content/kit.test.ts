import { strFromU8, unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { buildKitArchive, orderedKit } from "./kit";
import type { Article } from "./schema";

const article: Article = {
  slug: "demo",
  title: "Demo",
  summary: "s",
  category: "trends",
  people: [],
  tags: [],
  sources: [
    { id: "a", title: "Src", url: "https://example.com", author: "Au", kind: "blog", publishedAt: new Date() },
  ],
  keyIdeas: ["idea one"],
  brief: { what: "w", why: "y", action: "a" },
  difficulty: "intro",
  apply: { goal: "g", changes: ["a", "b"], doesNotDo: ["c"], fitsWhen: "f", time: "t" },
  tryIt: "p",
  draft: false,
  publishedAt: new Date(),
  bodyMarkdown: "",
  persons: [],
  terms: [],
  kit: [
    { path: "checklist.md", content: "- [ ] done" },
    { path: "skills/x/SKILL.md", content: "skill" },
    { path: "prompt.md", content: "do it — 한글" },
  ],
};

describe("orderedKit", () => {
  it("puts prompt.md first", () => {
    expect(orderedKit(article.kit).map((f) => f.path)).toEqual([
      "prompt.md",
      "checklist.md",
      "skills/x/SKILL.md",
    ]);
  });
});

describe("buildKitArchive", () => {
  it("zips README plus every kit file under <slug>-kit/, preserving UTF-8", () => {
    const files = unzipSync(buildKitArchive(article, "https://site.test/a/demo"));
    expect(Object.keys(files).sort()).toEqual([
      "demo-kit/README.md",
      "demo-kit/checklist.md",
      "demo-kit/prompt.md",
      "demo-kit/skills/x/SKILL.md",
    ]);
    expect(strFromU8(files["demo-kit/prompt.md"])).toBe("do it — 한글");
    const readme = strFromU8(files["demo-kit/README.md"]);
    expect(readme).toContain("https://site.test/a/demo");
    expect(readme).toContain("- idea one");
  });
});
