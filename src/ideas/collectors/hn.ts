import { canonicalizeUrl } from "../schema";
import type { IdeasConfig } from "../schema";
import type { Category } from "../../content/schema";
import { ideaSlug } from "../slug";
import { fetchJson, type FetchFn } from "./fetch";
import type { CollectedHit } from "./types";

type AlgoliaHit = {
  objectID: string;
  title: string | null;
  url: string | null;
  points: number | null;
  num_comments: number | null;
  created_at: string;
  author: string;
};

type AlgoliaResponse = { hits: AlgoliaHit[] };

function hnDiscussionUrl(objectID: string): string {
  return `https://news.ycombinator.com/item?id=${objectID}`;
}

function clampScore(points: number, comments: number): number {
  const base = Math.min(90, 20 + Math.log10(Math.max(points, 1) + 1) * 28);
  const commentBoost = Math.min(10, Math.log10(Math.max(comments, 1) + 1) * 6);
  return Math.round(Math.min(100, base + commentBoost));
}

export async function collectHn(
  config: NonNullable<IdeasConfig["hn"]>,
  fetchFn: FetchFn = fetch,
): Promise<CollectedHit[]> {
  const byKey = new Map<string, CollectedHit>();
  const now = new Date();

  for (const { query, category } of config.queries) {
    const url =
      `https://hn.algolia.com/api/v1/search?` +
      new URLSearchParams({
        query,
        tags: "story",
        hitsPerPage: String(config.hitsPerQuery),
      }).toString();
    const data = await fetchJson<AlgoliaResponse>(url, fetchFn);
    for (const hit of data.hits) {
      if (!hit.title) continue;
      const points = hit.points ?? 0;
      if (points < config.minPoints) continue;
      const primaryUrl = hit.url?.trim() || hnDiscussionUrl(hit.objectID);
      const key = canonicalizeUrl(primaryUrl);
      const publishedAt = new Date(hit.created_at);
      const sources = [primaryUrl];
      if (hit.url) sources.push(hnDiscussionUrl(hit.objectID));
      const candidate: CollectedHit = {
        slug: ideaSlug(hit.title, key),
        topic: hit.title,
        category: category as Category,
        people: hit.author ? [hit.author] : [],
        sources,
        publishedAt: Number.isNaN(publishedAt.getTime()) ? undefined : publishedAt,
        sourceKind: hit.url ? "blog" : "thread",
        tension: `HN에서 ${points}점·댓글 ${hit.num_comments ?? 0}개로 눈에 띈 글입니다. ${category} 쿼리와 맞습니다.`,
        kitIdea: "사람이 shortlist할 때 키트 아이디어를 채웁니다.",
        primaryVerified: false,
        confidence: "low",
        status: "idea",
        note: `collector=hn; query category=${category}`,
        score: clampScore(points, hit.num_comments ?? 0),
        collectedAt: now,
      };
      const prev = byKey.get(key);
      if (!prev || candidate.score > prev.score) byKey.set(key, candidate);
    }
  }

  return [...byKey.values()];
}
