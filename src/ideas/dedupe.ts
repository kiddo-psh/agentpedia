import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { canonicalizeUrl } from "./schema";
import type { Idea } from "./schema";

export type DedupeIndex = {
  urls: Set<string>;
  slugs: Set<string>;
  /** URLs on dropped ideas — do not re-collect. */
  droppedUrls: Set<string>;
};

/** Index article slugs/source URLs plus existing ideas.yaml rows. */
export function buildDedupeIndex(
  ideas: Idea[],
  articlesDir = path.join(process.cwd(), "content", "articles"),
): DedupeIndex {
  const urls = new Set<string>();
  const slugs = new Set<string>();
  const droppedUrls = new Set<string>();

  if (fs.existsSync(articlesDir)) {
    for (const entry of fs.readdirSync(articlesDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      slugs.add(entry.name);
      const indexPath = path.join(articlesDir, entry.name, "index.mdx");
      if (!fs.existsSync(indexPath)) continue;
      const { data } = matter(fs.readFileSync(indexPath, "utf8"));
      const sources = Array.isArray(data.sources) ? data.sources : [];
      for (const s of sources) {
        if (s && typeof s === "object" && typeof (s as { url?: unknown }).url === "string") {
          urls.add(canonicalizeUrl((s as { url: string }).url));
        }
      }
    }
  }

  for (const idea of ideas) {
    slugs.add(idea.slug);
    for (const url of idea.sources) {
      const key = canonicalizeUrl(url);
      urls.add(key);
      if (idea.status === "dropped") droppedUrls.add(key);
    }
  }

  return { urls, slugs, droppedUrls };
}

export function isDuplicate(
  candidate: { slug: string; sources: string[] },
  index: DedupeIndex,
): string | null {
  if (index.slugs.has(candidate.slug)) return `slug ${candidate.slug}`;
  for (const url of candidate.sources) {
    const key = canonicalizeUrl(url);
    if (index.droppedUrls.has(key)) return `dropped url ${key}`;
    if (index.urls.has(key)) return `known url ${key}`;
  }
  return null;
}
