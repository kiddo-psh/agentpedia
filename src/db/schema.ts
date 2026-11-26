import { sql } from "drizzle-orm";
import {
  bigserial,
  boolean,
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

export * from "./auth-schema";

export const comments = pgTable(
  "comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Content lives in git, so slugs are not foreign keys; the build validates them.
    articleSlug: text("article_slug").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    parentId: uuid("parent_id").references((): AnyPgColumn => comments.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    /** Selected article prose for citation comments; roots only. */
    citationQuote: text("citation_quote"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    // Soft delete keeps reply threads readable.
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [index("comments_article_created_idx").on(t.articleSlug, t.createdAt)],
);

/**
 * Community posts: one shape for showcase and apply stories.
 * Optional articleSlug (and linkKit when that article ships a kit); external links are free-form https URLs.
 */
export const communityPosts = pgTable(
  "community_posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    body: text("body").notNull(),
    links: text("links").array().notNull().default([]),
    articleSlug: text("article_slug"),
    linkKit: boolean("link_kit").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [index("community_posts_created_idx").on(t.createdAt)],
);

/** Comments on community posts; same one-level parentId reply pattern as article comments. */
export const communityComments = pgTable(
  "community_comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    postId: uuid("post_id")
      .notNull()
      .references(() => communityPosts.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    parentId: uuid("parent_id").references((): AnyPgColumn => communityComments.id, {
      onDelete: "cascade",
    }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [index("community_comments_post_created_idx").on(t.postId, t.createdAt)],
);

/** One row per (user, article); the primary key makes a second like a no-op. */
export const likes = pgTable(
  "likes",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    articleSlug: text("article_slug").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.articleSlug] }), index("likes_article_idx").on(t.articleSlug)],
);

/**
 * Reader suggestions about an article. Signed-in readers are linked by user; anonymous ones
 * carry only the daily visitor hash, which also caps how often one visitor can send.
 */
export const suggestions = pgTable(
  "suggestions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    articleSlug: text("article_slug").notNull(),
    body: text("body").notNull(),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    visitorHash: text("visitor_hash"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("suggestions_created_idx").on(t.createdAt),
    index("suggestions_visitor_created_idx").on(t.visitorHash, t.createdAt),
  ],
);

export const EVENT_KINDS = [
  "view",
  "web_copy",
  "share",
  "kit_download",
  "mcp_get_article",
  "mcp_get_kit",
  "mcp_prompt",
] as const;
export type EventKind = (typeof EVENT_KINDS)[number];
/** Every kind except `view` and `share` counts toward the apply rate. */
export const APPLY_KINDS = EVENT_KINDS.filter((k) => k !== "view" && k !== "share");

/**
 * Append-only. Raw IPs and user agents are never stored, only a daily salted hash.
 * Browser events also carry `visitorId`, a random ID from a 28-day first-party cookie, so
 * returning visitors can be counted without linking IP or user agent across days.
 */
export const events = pgTable(
  "events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    kind: text("kind", { enum: EVENT_KINDS }).notNull(),
    articleSlug: text("article_slug").notNull(),
    visitorHash: text("visitor_hash"),
    visitorId: uuid("visitor_id"),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [
    index("events_article_created_idx").on(t.articleSlug, t.createdAt),
    index("events_visitor_created_idx").on(t.visitorId, t.createdAt),
  ],
);

/**
 * One row per anonymous visitor cookie (`ap_vid`). A signed-in reader is linked when a
 * session exists; the cookie is still the uniqueness key. Free-text "기타" answers are
 * stored for aggregation and are not shown back on the public results.
 */
export const surveyResponses = pgTable(
  "survey_responses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    visitorId: uuid("visitor_id").notNull(),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    agents: text("agents").array().notNull(),
    /** JSON {"orchestrator","other"} or null. The chart counts the buckets and does not show the text. */
    agentOther: text("agent_other"),
    /** JSON array of model ids, including "other". Text so multi-select did not add a column. */
    model: text("model").notNull(),
    modelOther: text("model_other"),
    uses: text("uses").array().notNull(),
    useOther: text("use_other"),
    tenure: text("tenure").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("survey_responses_visitor_idx").on(t.visitorId)],
);

/** Anonymous comments on the seeded survey post. Hidden and deleted rows stay for the audit trail. */
export const surveyComments = pgTable(
  "survey_comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    postSlug: text("post_slug").notNull(),
    visitorId: uuid("visitor_id").notNull(),
    nickname: text("nickname").notNull(),
    body: text("body").notNull(),
    hiddenAt: timestamp("hidden_at", { withTimezone: true }),
    /** `reports` when distinct visitors cross the threshold, `admin` when a metrics admin hides it. */
    hiddenReason: text("hidden_reason"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("survey_comments_post_created_idx").on(t.postSlug, t.createdAt)],
);

/** One report per visitor per comment. The primary key makes a second report a no-op. */
export const surveyCommentReports = pgTable(
  "survey_comment_reports",
  {
    commentId: uuid("comment_id")
      .notNull()
      .references(() => surveyComments.id, { onDelete: "cascade" }),
    visitorId: uuid("visitor_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.commentId, t.visitorId] })],
);
