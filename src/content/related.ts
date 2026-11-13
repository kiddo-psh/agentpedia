import type { Article } from "./schema";

/** What two articles have in common, as a reader would recognise it. */
export type SharedSignal = { kind: "person" | "tag" | "term"; id: string; label: string };

export type RelatedArticle = {
  slug: string;
  title: string;
  category: Article["category"];
  score: number;
  shared: SharedSignal[];
};

export type RelatedGraph = {
  related: RelatedArticle[];
  /** Pairs of related slugs that are also related to each other. The center links to every related node. */
  edges: [string, string][];
};

type Candidate = Pick<Article, "slug" | "title" | "category" | "tags" | "persons" | "terms" | "publishedAt">;

const WEIGHT = { person: 3, tag: 2, term: 1, category: 1 } as const;
/** One shared tag or person is enough; a shared category or term alone is not. */
export const MIN_SCORE = 2;
export const MAX_RELATED = 4;

function signals(a: Candidate): SharedSignal[] {
  return [
    ...a.persons.map((p) => ({ kind: "person" as const, id: p.id, label: p.nameKo })),
    ...a.tags.map((t) => ({ kind: "tag" as const, id: t, label: t })),
    ...a.terms.map((t) => ({ kind: "term" as const, id: t.id, label: t.term })),
  ];
}

function compare(a: Candidate, b: Candidate): { score: number; shared: SharedSignal[] } {
  const other = new Set(signals(b).map((s) => `${s.kind}:${s.id}`));
  const shared = signals(a).filter((s) => other.has(`${s.kind}:${s.id}`));
  const score =
    shared.reduce((sum, s) => sum + WEIGHT[s.kind], 0) + (a.category === b.category ? WEIGHT.category : 0);
  return { score, shared };
}

/** The closest articles to `center` by shared people, tags and glossary terms, plus the links among them. */
export function relatedGraph(center: Candidate, pool: Candidate[]): RelatedGraph {
  const ranked = pool
    .filter((c) => c.slug !== center.slug)
    .map((c) => ({ c, ...compare(center, c) }))
    .filter((r) => r.score >= MIN_SCORE)
    .sort((x, y) => y.score - x.score || y.c.publishedAt.getTime() - x.c.publishedAt.getTime())
    .slice(0, MAX_RELATED);

  const edges: [string, string][] = [];
  ranked.forEach((x, i) =>
    ranked.slice(i + 1).forEach((y) => {
      if (compare(x.c, y.c).score >= MIN_SCORE) edges.push([x.c.slug, y.c.slug]);
    }),
  );

  return {
    related: ranked.map(({ c, score, shared }) => ({ slug: c.slug, title: c.title, category: c.category, score, shared })),
    edges,
  };
}
