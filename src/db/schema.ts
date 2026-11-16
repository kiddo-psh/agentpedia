import { sql } from "drizzle-orm";
import {
  bigserial,
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
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
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    // Soft delete keeps reply threads readable.
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [index("comments_article_created_idx").on(t.articleSlug, t.createdAt)],
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
