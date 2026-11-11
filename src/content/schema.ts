import { z } from "zod";

export const Category = z.enum(["people", "trends", "startup", "security"]);
export type Category = z.infer<typeof Category>;

/** Source kinds whose quotes must carry a timestamp (`at`). */
export const TIMED_SOURCE_KINDS = ["video", "podcast", "talk"] as const;

export const Source = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  url: z.url(),
  author: z.string().min(1),
  kind: z.enum([...TIMED_SOURCE_KINDS, "blog", "paper", "thread"]),
  publishedAt: z.coerce.date(),
});
export type Source = z.infer<typeof Source>;

export const ArticleMeta = z
  .object({
    slug: z.string().regex(/^[a-z0-9-]+$/),
    title: z.string().min(1),
    summary: z.string().min(1).max(200),
    category: Category,
    people: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
    sources: z.array(Source).min(1),
    keyIdeas: z.array(z.string().min(1)).min(1).max(7),
    difficulty: z.enum(["intro", "practical", "deep"]),
    draft: z.boolean().default(false),
    publishedAt: z.coerce.date(),
    updatedAt: z.coerce.date().optional(),
  })
  .refine((m) => new Set(m.sources.map((s) => s.id)).size === m.sources.length, {
    message: "sources[].id must be unique",
    path: ["sources"],
  });
export type ArticleMeta = z.infer<typeof ArticleMeta>;

export type KitFile = { path: string; content: string };

export type Article = ArticleMeta & {
  bodyMarkdown: string;
  kit: KitFile[];
};

/** Every kit must ship this file; it is the body of the MCP `apply_article` prompt. */
export const REQUIRED_KIT_FILE = "prompt.md";
