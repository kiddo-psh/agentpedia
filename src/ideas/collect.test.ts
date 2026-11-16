import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { collectIdeas } from "./collect";
import { loadIdeas } from "./load";
import { serializeIdeas } from "./write";
import type { Idea } from "./schema";

const tmpDirs: string[] = [];
afterEach(() => {
  for (const d of tmpDirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

function seedRepo(ideas: Idea[]): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ideas-collect-"));
  tmpDirs.push(root);
  fs.mkdirSync(path.join(root, "content", "articles"), { recursive: true });
  fs.writeFileSync(path.join(root, "content", "ideas.yaml"), serializeIdeas(ideas));
  fs.writeFileSync(
    path.join(root, "content", "ideas-sources.yaml"),
    `
blogs:
  - id: demo
    name: Demo
    kind: rss
    url: https://example.com/rss.xml
    categoryHint: trends
    includeKeywords: [agent]
youtube: []
hn:
  minPoints: 10
  hitsPerQuery: 5
  queries:
    - query: agent
      category: trends
`,
  );
  return root;
}

describe("collectIdeas", () => {
  it("appends new RSS hits and skips known URLs", async () => {
    const existing: Idea = {
      slug: "already-there",
      topic: "Existing",
      category: "trends",
      people: [],
      sources: ["https://example.com/old"],
      tension: "t",
      kitIdea: "k",
      primaryVerified: true,
      confidence: "high",
      status: "idea",
    };
    const root = seedRepo([existing]);
    const rss = `<?xml version="1.0"?><rss><channel>
      <item><title>New Agent Post</title><link>https://example.com/new-agent</link><pubDate>Mon, 10 Nov 2026 00:00:00 GMT</pubDate><description>about agents</description></item>
      <item><title>Old</title><link>https://example.com/old</link><description>agent again</description></item>
    </channel></rss>`;

    const result = await collectIdeas({
      cwd: root,
      source: "blogs",
      fetchFn: async () => new Response(rss, { status: 200 }),
    });

    expect(result.added).toHaveLength(1);
    expect(result.added[0]?.sources[0]).toBe("https://example.com/new-agent");
    expect(result.added[0]?.primaryVerified).toBe(false);
    expect(result.added[0]?.status).toBe("idea");
    const loaded = loadIdeas(root);
    expect(loaded.map((i) => i.slug)).toContain("already-there");
    expect(loaded.length).toBe(2);
  });
});
