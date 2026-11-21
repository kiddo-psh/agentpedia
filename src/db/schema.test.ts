import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { agentReviews, comments, events, reviewHelpful } from "./schema";
import { createTestDb, insertUser } from "./testing";

describe("database schema", () => {
  it("migrates and enforces comment foreign keys with cascade", async () => {
    const db = await createTestDb();
    const u = await insertUser(db);
    const [root] = await db.insert(comments).values({ articleSlug: "a", userId: u.id, body: "hi" }).returning();
    await db.insert(comments).values({ articleSlug: "a", userId: u.id, body: "re", parentId: root.id });

    await db.delete(comments).where(eq(comments.id, root.id));
    expect(await db.select().from(comments)).toHaveLength(0);

    await expect(
      db.insert(comments).values({ articleSlug: "a", userId: "ghost", body: "x" }),
    ).rejects.toThrow();
  });

  it("checks review ratings and cascades helpful votes", async () => {
    const db = await createTestDb();
    const u = await insertUser(db);
    const review = {
      agentSlug: "claude-code",
      userId: u.id,
      taskType: "debug" as const,
      rating: 4,
      wouldUseAgain: true,
      body: "본문",
    };
    await expect(db.insert(agentReviews).values({ ...review, rating: 0 })).rejects.toThrow();
    await expect(
      db.insert(agentReviews).values({ ...review, taskType: "nope" as "debug" }),
    ).rejects.toThrow();
    const [row] = await db.insert(agentReviews).values(review).returning();
    await db.insert(agentReviews).values({ ...review, taskType: "docs" });
    await expect(db.insert(agentReviews).values(review)).rejects.toThrow();
    await db.insert(reviewHelpful).values({ userId: u.id, reviewId: row.id });
    await db.delete(agentReviews).where(eq(agentReviews.id, row.id));
    expect(await db.select().from(reviewHelpful)).toHaveLength(0);
  });

  it("stores events with a default timestamp", async () => {
    const db = await createTestDb();
    const [e] = await db.insert(events).values({ kind: "view", articleSlug: "a" }).returning();
    expect(e.createdAt).toBeInstanceOf(Date);
  });
});
