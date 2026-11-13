import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import { likes, user } from "@/db/schema";
import { createTestDb, insertUser } from "@/db/testing";
import { getLikeState, listLikedSlugs, setLike } from "./service";

let db: Db;

beforeEach(async () => {
  db = await createTestDb();
  await insertUser(db, "alice", "앨리스");
  await insertUser(db, "bob", "밥");
});

describe("likes", () => {
  it("counts every user's like and reports whether the viewer liked it", async () => {
    await setLike(db, { userId: "alice", articleSlug: "a", liked: true });
    await setLike(db, { userId: "bob", articleSlug: "a", liked: true });

    expect(await getLikeState(db, "a", "alice")).toEqual({ count: 2, liked: true });
    expect(await getLikeState(db, "a")).toEqual({ count: 2, liked: false });
    expect(await getLikeState(db, "b", "alice")).toEqual({ count: 0, liked: false });
  });

  it("treats a repeated like or unlike as a no-op", async () => {
    await setLike(db, { userId: "alice", articleSlug: "a", liked: true });
    await setLike(db, { userId: "alice", articleSlug: "a", liked: true });
    expect(await getLikeState(db, "a", "alice")).toEqual({ count: 1, liked: true });

    await setLike(db, { userId: "alice", articleSlug: "a", liked: false });
    await setLike(db, { userId: "alice", articleSlug: "a", liked: false });
    expect(await getLikeState(db, "a", "alice")).toEqual({ count: 0, liked: false });
  });

  it("lists only the user's liked articles, newest first", async () => {
    await db.insert(likes).values([
      { userId: "alice", articleSlug: "old", createdAt: new Date("2026-01-01") },
      { userId: "alice", articleSlug: "new", createdAt: new Date("2026-02-01") },
      { userId: "bob", articleSlug: "other", createdAt: new Date("2026-03-01") },
    ]);
    expect(await listLikedSlugs(db, "alice")).toEqual(["new", "old"]);
  });

  it("drops a deleted user's likes from the count", async () => {
    await setLike(db, { userId: "alice", articleSlug: "a", liked: true });
    await db.delete(user).where(eq(user.id, "alice"));
    expect(await getLikeState(db, "a")).toEqual({ count: 0, liked: false });
  });
});
