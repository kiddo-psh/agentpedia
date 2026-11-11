import { z } from "zod";

export const Category = z.enum(["people", "trends", "startup", "security"]);
export type Category = z.infer<typeof Category>;

/** Source kinds whose quotes must carry a timestamp (`at`). */
export const TIMED_SOURCE_KINDS = ["video", "podcast", "talk"] as const;

export const Source = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    title: z.string().min(1),
    url: z.url(),
    author: z.string().min(1),
    kind: z.enum([...TIMED_SOURCE_KINDS, "blog", "paper", "thread"]),
    /** When the source was published. Only this date counts toward an article's "출처 시점". */
    publishedAt: z.coerce.date().optional(),
    /** For undated pages (profiles, transcripts): when it was read. Never stands in for publishedAt. */
    accessedAt: z.coerce.date().optional(),
    /** Why the date is uncertain, if it was not read directly from the source. */
    dateNote: z.string().optional(),
  })
  .refine((s) => s.publishedAt || s.accessedAt, {
    message: "a source needs publishedAt, or accessedAt when the page has no date",
    path: ["publishedAt"],
  });
export type Source = z.infer<typeof Source>;

/** Licenses whose terms allow reuse with attribution. Anything else is rejected. */
export const PHOTO_LICENSES = ["CC0", "CC BY 2.0", "CC BY 3.0", "CC BY 4.0", "CC BY-SA 2.0", "CC BY-SA 3.0", "CC BY-SA 4.0", "Public domain", "Owner permission"] as const;

export const Person = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  /** Korean name as readers will see it, e.g. "안드레 카파시". */
  nameKo: z.string().min(1),
  /** One line on who they are, in Korean. */
  role: z.string().min(1).max(80),
  photo: z
    .object({
      url: z.url().refine((u) => u.startsWith("https://"), "photo.url must be https"),
      credit: z.string().min(1),
      license: z.enum(PHOTO_LICENSES),
      sourceUrl: z.url(),
    })
    .optional(),
});
export type Person = z.infer<typeof Person>;
export const PeopleRegistry = z.array(Person).refine((ps) => new Set(ps.map((p) => p.id)).size === ps.length, {
  message: "people[].id must be unique",
});

export const ArticleMeta = z
  .object({
    slug: z.string().regex(/^[a-z0-9-]+$/),
    title: z.string().min(1),
    summary: z.string().min(1).max(200),
    category: Category,
    /** Ids from content/people.yaml. */
    people: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
    sources: z
      .array(Source)
      .min(1)
      .refine((ss) => ss.some((s) => s.publishedAt), "at least one source must have publishedAt"),
    keyIdeas: z.array(z.string().min(1)).min(1).max(7),
    difficulty: z.enum(["intro", "practical", "deep"]),
    /** What running the kit does to a reader's repo, shown before they run it. */
    apply: z.object({
      goal: z.string().min(1).max(120),
      changes: z.array(z.string().min(1)).min(2).max(5),
      doesNotDo: z.array(z.string().min(1)).min(1).max(3),
      fitsWhen: z.string().min(1),
      time: z.string().min(1),
    }),
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
  /** `people` ids resolved against the registry, in the same order. */
  persons: Person[];
};

/** JSX components an article body may use. Anything else fails validation. */
export const MDX_COMPONENTS = ["KeyIdea", "Quote", "TryIt", "Compare", "Steps"] as const;
export type MdxComponentName = (typeof MDX_COMPONENTS)[number];

/** Every kit must ship this file; it is the body of the MCP `apply_article` prompt. */
export const REQUIRED_KIT_FILE = "prompt.md";
