import { z } from "zod";
import { Category } from "../content/schema";

/**
 * Inbox entry in content/ideas.yaml.
 * `slug`, `topic`, `category`, `people`, `sources` match write-article skill args
 * so a shortlisted row can be passed through as-is.
 */
export const IdeaStatus = z.enum(["idea", "picked", "dropped"]);
export type IdeaStatus = z.infer<typeof IdeaStatus>;

export const IdeaConfidence = z.enum(["high", "medium", "low"]);
export type IdeaConfidence = z.infer<typeof IdeaConfidence>;

/** Source kinds used in the backlog; aligned with article Source.kind where possible. */
export const IdeaSourceKind = z.enum(["blog", "paper", "video", "podcast", "talk", "thread"]);
export type IdeaSourceKind = z.infer<typeof IdeaSourceKind>;

export const Idea = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  topic: z.string().min(1).max(300),
  category: Category,
  /** Free-form people hints for write-article (not registry ids yet). */
  people: z.array(z.string().min(1)).default([]),
  /** Primary source URLs only — no full-text dumps. */
  sources: z.array(z.url()).min(1),
  publishedAt: z.coerce.date().optional(),
  sourceKind: IdeaSourceKind.optional(),
  /** Contrast the piece turns on; doubles as short collector rationale. */
  tension: z.string().min(1).max(600),
  /** What the kit might do; human usually refines before write-article. */
  kitIdea: z.string().min(1).max(600),
  primaryVerified: z.boolean().default(false),
  confidence: IdeaConfidence.default("low"),
  status: IdeaStatus.default("idea"),
  note: z.string().max(500).optional(),
  /** Optional collector hint (0–100); humans shortlist, score does not auto-publish. */
  score: z.number().min(0).max(100).optional(),
  collectedAt: z.coerce.date().optional(),
});
export type Idea = z.infer<typeof Idea>;

export const IdeasFile = z.array(Idea);
export type IdeasFile = z.infer<typeof IdeasFile>;

export const IdeasConfig = z.object({
  blogs: z
    .array(
      z.object({
        id: z.string().regex(/^[a-z0-9-]+$/),
        name: z.string().min(1),
        kind: z.enum(["rss", "html-index"]),
        url: z.url(),
        baseUrl: z.url().optional(),
        linkPattern: z.string().optional(),
        categoryHint: Category.optional(),
        includeKeywords: z.array(z.string().min(1)).default([]),
      }),
    )
    .default([]),
  youtube: z
    .array(
      z.object({
        id: z.string().regex(/^[a-z0-9-]+$/),
        name: z.string().min(1),
        channelId: z.string().regex(/^UC[\w-]{20,}$/),
        categoryHint: Category.optional(),
        includeKeywords: z.array(z.string().min(1)).default([]),
      }),
    )
    .default([]),
  hn: z
    .object({
      minPoints: z.number().int().min(0).default(30),
      hitsPerQuery: z.number().int().min(1).max(50).default(20),
      queries: z
        .array(
          z.object({
            query: z.string().min(1),
            category: Category,
          }),
        )
        .min(1),
    })
    .optional(),
});
export type IdeasConfig = z.infer<typeof IdeasConfig>;

/** Strip tracking params and normalize host/path for dedupe. */
export function canonicalizeUrl(raw: string): string {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return raw.trim().toLowerCase();
  }
  u.hash = "";
  const drop = new Set([
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "ref",
    "fbclid",
    "gclid",
    "si",
  ]);
  for (const key of [...u.searchParams.keys()]) {
    if (drop.has(key.toLowerCase()) || key.toLowerCase().startsWith("utm_")) {
      u.searchParams.delete(key);
    }
  }
  let host = u.hostname.toLowerCase();
  if (host.startsWith("www.")) host = host.slice(4);
  const path = u.pathname.replace(/\/+$/, "") || "";
  const q = u.searchParams.toString();
  return `${u.protocol}//${host}${path}${q ? `?${q}` : ""}`;
}

export const IDEAS_FILE = "content/ideas.yaml";
export const IDEAS_SOURCES_FILE = "content/ideas-sources.yaml";
