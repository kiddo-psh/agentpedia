import { describe, expect, it } from "vitest";
import { MAX_RELATED, relatedGraph } from "./related";

type Input = Parameters<typeof relatedGraph>[0];

const article = (slug: string, o: Partial<Omit<Input, "persons" | "terms">> & { people?: string[]; terms?: string[] } = {}): Input => ({
  slug,
  title: slug.toUpperCase(),
  category: o.category ?? "trends",
  tags: o.tags ?? [],
  persons: (o.people ?? []).map((id) => ({ id, name: id, nameKo: `${id}-ko`, role: "r" })),
  terms: (o.terms ?? []).map((id) => ({ id, term: `${id}-term`, definition: "d" })),
  publishedAt: o.publishedAt ?? new Date("2026-01-01"),
});

const slugs = (g: ReturnType<typeof relatedGraph>) => g.related.map((r) => r.slug);

describe("relatedGraph", () => {
  it("ranks by what the articles share, names it, and never includes the article itself", () => {
    const center = article("c", { people: ["kim"], tags: ["mcp"], terms: ["hook"] });
    const g = relatedGraph(center, [
      center,
      article("tag-and-term", { tags: ["mcp"], terms: ["hook"], category: "security" }),
      article("person-and-category", { people: ["kim"] }),
      article("unrelated", { tags: ["other"], category: "security" }),
    ]);
    expect(slugs(g)).toEqual(["person-and-category", "tag-and-term"]);
    expect(g.related[1].shared.map((s) => s.label)).toEqual(["mcp", "hook-term"]);
  });

  it("does not link articles that only share a category or a single term", () => {
    const center = article("c", { terms: ["hook"] });
    expect(slugs(relatedGraph(center, [article("same-category"), article("one-term", { category: "security", terms: ["hook"] })]))).toEqual([]);
  });

  it("caps the list and breaks ties by newest first", () => {
    const center = article("c", { tags: ["mcp"] });
    const pool = Array.from({ length: MAX_RELATED + 2 }, (_, i) =>
      article(`a${i}`, { tags: ["mcp"], category: "security", publishedAt: new Date(2026, 0, i + 1) }),
    );
    expect(slugs(relatedGraph(center, pool))).toEqual(["a5", "a4", "a3", "a2"]);
  });

  it("links related articles to each other only when they are related themselves", () => {
    const center = article("c", { tags: ["mcp", "cli"] });
    const g = relatedGraph(center, [
      article("x", { tags: ["mcp", "saas"] }),
      article("y", { tags: ["mcp", "saas"] }),
      article("z", { tags: ["cli"], category: "security" }),
    ]);
    expect(g.edges).toEqual([["x", "y"]]);
  });
});
