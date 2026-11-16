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

function scoreBlog(publishedAt: Date | undefined, keywordHit: boolean): number {
  let score = 55;
  if (keywordHit) score += 15;
  if (publishedAt) {
    const ageDays = (Date.now() - publishedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (ageDays <= 14) score += 15;
    else if (ageDays <= 45) score += 8;
    else if (ageDays > 180) score -= 10;
  }
  return Math.max(0, Math.min(100, score));
}

function parseHtmlIndex(html: string, baseUrl: string, linkPattern: string): { title: string; url: string }[] {
  const re = new RegExp(linkPattern);
  const base = new URL(baseUrl);
  const found = new Map<string, string>();
  const anchorRe = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = anchorRe.exec(html))) {
    let href = m[1];
    if (href.startsWith("/")) href = `${base.origin}${href}`;
    let abs: URL;
    try {
      abs = new URL(href);
    } catch {
      continue;
    }
    if (abs.origin !== base.origin) continue;
    if (!re.test(abs.pathname)) continue;
    const title = m[2]
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!title || title.length < 8 || title.length > 200) continue;
    const key = canonicalizeUrl(abs.toString());
    if (!found.has(key)) found.set(key, title);
  }
  return [...found.entries()].map(([url, title]) => ({ url, title }));
}

export async function collectBlogs(
  blogs: IdeasConfig["blogs"],
  fetchFn: FetchFn = fetch,
): Promise<CollectedHit[]> {
  const hits: CollectedHit[] = [];
  const now = new Date();

  for (const blog of blogs) {
    const category = (blog.categoryHint ?? "trends") as Category;
    if (blog.kind === "rss") {
      const xml = await fetchText(blog.url, fetchFn);
      for (const item of parseFeedItems(xml)) {
        const blob = `${item.title} ${item.summary ?? ""}`;
        const keywordHit = matchesKeywords(blob, blog.includeKeywords);
        if (blog.includeKeywords.length > 0 && !keywordHit) continue;
        const key = canonicalizeUrl(item.url);
        hits.push({
          slug: ideaSlug(item.title, key),
          topic: item.title,
          category,
          people: item.author ? [`${item.author} (${blog.name})`] : [blog.name],
          sources: [item.url],
          publishedAt: item.publishedAt,
          sourceKind: "blog",
          tension: `${blog.name} 공식 피드에서 에이전트·보안·제품 운영과 맞물릴 수 있는 글입니다.`,
          kitIdea: "사람이 shortlist할 때 키트 아이디어를 채웁니다.",
          primaryVerified: false,
          confidence: "low",
          status: "idea",
          note: `collector=blog:${blog.id}; metadata only`,
          score: scoreBlog(item.publishedAt, keywordHit || blog.includeKeywords.length === 0),
          collectedAt: now,
        });
      }
      continue;
    }

    const html = await fetchText(blog.url, fetchFn);
    const pattern = blog.linkPattern ?? "^/(research|engineering|news)/[a-z0-9-]+$";
    const baseUrl = blog.baseUrl ?? blog.url;
    for (const item of parseHtmlIndex(html, baseUrl, pattern)) {
      const keywordHit = matchesKeywords(item.title, blog.includeKeywords);
      if (blog.includeKeywords.length > 0 && !keywordHit) continue;
      const key = canonicalizeUrl(item.url);
      hits.push({
        slug: ideaSlug(item.title, key),
        topic: item.title,
        category,
        people: [blog.name],
        sources: [item.url],
        sourceKind: "blog",
        tension: `${blog.name} 목록 페이지의 제목·URL만 모았습니다. 본문은 저장하지 않습니다.`,
        kitIdea: "사람이 shortlist할 때 키트 아이디어를 채웁니다.",
        primaryVerified: false,
        confidence: "low",
        status: "idea",
        note: `collector=blog:${blog.id}; html-index metadata only`,
        score: scoreBlog(undefined, keywordHit || blog.includeKeywords.length === 0),
        collectedAt: now,
      });
    }
  }

  return hits;
}
