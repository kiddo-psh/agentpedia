import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { comments, events } from "./schema";
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

  it("stores events with a default timestamp", async () => {
    const db = await createTestDb();
    const [e] = await db.insert(events).values({ kind: "view", articleSlug: "a" }).returning();
    expect(e.createdAt).toBeInstanceOf(Date);
  });
});
