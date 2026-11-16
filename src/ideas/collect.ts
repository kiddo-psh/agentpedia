import { buildDedupeIndex, isDuplicate } from "./dedupe";
import { loadIdeas, loadIdeasConfig } from "./load";
import { writeIdeas } from "./write";
import { collectBlogs } from "./collectors/blogs";
import { collectHn } from "./collectors/hn";
import { collectYoutube } from "./collectors/youtube";
import type { FetchFn } from "./collectors/fetch";
import type { CollectedHit } from "./collectors/types";
import type { Idea } from "./schema";

export type CollectSource = "hn" | "blogs" | "youtube" | "all";

export type CollectOptions = {
  source?: CollectSource;
  limit?: number;
  dryRun?: boolean;
  fetchFn?: FetchFn;
  cwd?: string;
};

export type CollectResult = {
  considered: number;
  added: Idea[];
  skipped: { slug: string; reason: string }[];
  errors: string[];
};

function hitToIdea(hit: CollectedHit): Idea {
  return {
    slug: hit.slug,
    topic: hit.topic,
    category: hit.category,
    people: hit.people,
    sources: hit.sources,
    publishedAt: hit.publishedAt,
    sourceKind: hit.sourceKind,
    tension: hit.tension,
    kitIdea: hit.kitIdea,
    primaryVerified: hit.primaryVerified,
    confidence: hit.confidence,
    status: hit.status,
    note: hit.note,
    score: hit.score,
    collectedAt: hit.collectedAt,
  };
}

/** Run configured collectors, dedupe against articles + ideas.yaml, append new rows. */
export async function collectIdeas(opts: CollectOptions = {}): Promise<CollectResult> {
  const cwd = opts.cwd ?? process.cwd();
  const source = opts.source ?? "all";
  const fetchFn = opts.fetchFn ?? fetch;
  const config = loadIdeasConfig(cwd);
  const existing = loadIdeas(cwd);
  const index = buildDedupeIndex(existing, `${cwd}/content/articles`);

  const hits: CollectedHit[] = [];
  const errors: string[] = [];

  const run = async (label: string, fn: () => Promise<CollectedHit[]>) => {
    try {
      hits.push(...(await fn()));
    } catch (e) {
      errors.push(`${label}: ${(e as Error).message}`);
    }
  };

  if (source === "all" || source === "hn") {
    if (config.hn) await run("hn", () => collectHn(config.hn!, fetchFn));
    else if (source === "hn") errors.push("hn: not configured in content/ideas-sources.yaml");
  }
  if (source === "all" || source === "blogs") {
    await run("blogs", () => collectBlogs(config.blogs, fetchFn));
  }
  if (source === "all" || source === "youtube") {
    await run("youtube", () => collectYoutube(config.youtube, fetchFn));
  }

  hits.sort((a, b) => b.score - a.score);

  const skipped: { slug: string; reason: string }[] = [];
  const added: Idea[] = [];
  const limit = opts.limit ?? 40;

  for (const hit of hits) {
    if (added.length >= limit) break;
    const reason = isDuplicate(hit, index);
    if (reason) {
      skipped.push({ slug: hit.slug, reason });
      continue;
    }
    const idea = hitToIdea(hit);
    added.push(idea);
    index.slugs.add(idea.slug);
    for (const url of idea.sources) index.urls.add(url);
  }

  if (!opts.dryRun && added.length > 0) {
    writeIdeas([...existing, ...added], cwd);
  }

  return { considered: hits.length, added, skipped, errors };
}
