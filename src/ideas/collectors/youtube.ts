import type { Category } from "../../content/schema";
import { canonicalizeUrl, type IdeasConfig } from "../schema";
import { ideaSlug } from "../slug";
import { fetchText, type FetchFn } from "./fetch";
import { parseFeedItems } from "./rss";
import type { CollectedHit } from "./types";

function matchesKeywords(text: string, keywords: string[]): boolean {
  if (keywords.length === 0) return true;
  const hay = text.toLowerCase();
  return keywords.some((k) => hay.includes(k.toLowerCase()));
}

function feedUrl(channelId: string): string {
  return `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
}

export async function collectYoutube(
  channels: IdeasConfig["youtube"],
  fetchFn: FetchFn = fetch,
): Promise<CollectedHit[]> {
  const hits: CollectedHit[] = [];
  const now = new Date();

  for (const ch of channels) {
    const xml = await fetchText(feedUrl(ch.channelId), fetchFn);
    const category = (ch.categoryHint ?? "people") as Category;
    for (const item of parseFeedItems(xml)) {
      const blob = `${item.title} ${item.summary ?? ""}`;
      const keywordHit = matchesKeywords(blob, ch.includeKeywords);
      if (ch.includeKeywords.length > 0 && !keywordHit) continue;
      let score = 50;
      if (keywordHit || ch.includeKeywords.length === 0) score += 10;
      if (item.publishedAt) {
        const ageDays = (Date.now() - item.publishedAt.getTime()) / (1000 * 60 * 60 * 24);
        if (ageDays <= 21) score += 15;
        else if (ageDays <= 60) score += 5;
      }
      const key = canonicalizeUrl(item.url);
      hits.push({
        slug: ideaSlug(item.title, key),
        topic: item.title,
        category,
        people: [item.author ?? ch.name],
        sources: [item.url],
        publishedAt: item.publishedAt,
        sourceKind: "video",
        tension: `YouTube 채널 ${ch.name}의 최신 영상입니다. 타임스탬프 인용이 가능한 1차 출처 후보입니다.`,
        kitIdea: "사람이 shortlist할 때 키트 아이디어를 채웁니다.",
        primaryVerified: false,
        confidence: "low",
        status: "idea",
        note: `collector=youtube:${ch.id}; Atom metadata only (no transcript)`,
        score: Math.min(100, score),
        collectedAt: now,
      });
    }
  }

  return hits;
}
