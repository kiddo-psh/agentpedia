import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildDedupeIndex, isDuplicate } from "./dedupe";
import type { Idea } from "./schema";

const tmpDirs: string[] = [];
afterEach(() => {
  for (const d of tmpDirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

function idea(partial: Partial<Idea> & Pick<Idea, "slug" | "sources">): Idea {
  return {
    topic: "t",
    category: "trends",
    people: [],
    tension: "x",
    kitIdea: "y",
    primaryVerified: false,
    confidence: "low",
    status: "idea",
    ...partial,
  };
}

describe("dedupe", () => {
  it("blocks existing article slugs and source URLs", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "ideas-dedupe-"));
    tmpDirs.push(root);
    const art = path.join(root, "content", "articles", "existing-slug");
    fs.mkdirSync(art, { recursive: true });
    fs.writeFileSync(
      path.join(art, "index.mdx"),
      `---\nslug: existing-slug\nsources:\n  - url: https://example.com/post?utm_source=x\n---\n`,
    );

    const index = buildDedupeIndex([], path.join(root, "content", "articles"));
    expect(isDuplicate({ slug: "existing-slug", sources: ["https://other.com"] }, index)).toMatch(
      /slug/,
    );
    expect(
      isDuplicate({ slug: "new-one", sources: ["https://www.example.com/post/"] }, index),
    ).toMatch(/known url/);
  });

  it("blocks dropped idea URLs and keeps other idea slugs", () => {
    const ideas = [
      idea({ slug: "kept", sources: ["https://a.example/1"], status: "idea" }),
      idea({ slug: "gone", sources: ["https://b.example/2"], status: "dropped" }),
    ];
    const index = buildDedupeIndex(ideas, path.join(os.tmpdir(), "no-articles-here"));
    expect(isDuplicate({ slug: "kept", sources: ["https://c.example"] }, index)).toMatch(/slug/);
    expect(isDuplicate({ slug: "fresh", sources: ["https://b.example/2"] }, index)).toMatch(
      /dropped url/,
    );
  });
});
