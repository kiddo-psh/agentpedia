import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import { account } from "@/db/schema";
import { createTestDb, insertUser } from "@/db/testing";
import { DAILY_REVIEW_LIMIT, MIN_REVIEW_BODY } from "./limits";
import { listOperatorUserIds, operatorAccountIds } from "./operators";
import { createReview, deleteReview, listAgentReviews, setReviewHelpful } from "./service";

let db: Db;
const body = "이 에이전트로 버그를 고쳤고, 테스트도 같이 돌려 확인했습니다.";
const now = new Date("2026-11-21T03:00:00Z");

beforeEach(async () => {
  db = await createTestDb();
  await insertUser(db, "alice", "앨리스");
  await insertUser(db, "bob", "밥");
});

function draft(over: Partial<Parameters<typeof createReview>[1]> = {}) {
  return {
    agentSlug: "claude-code",
    userId: "alice",
    taskType: "debug",
    rating: 4,
    wouldUseAgain: true,
    body,
    now,
    ...over,
  };
}

describe("createReview", () => {
  it("stores one review and keeps it out of another agent", async () => {
    const created = await createReview(db, draft({ stack: "TypeScript, Next.js", model: "Opus", usedSince: "2026-01-02" }));
    expect(created.ok).toBe(true);
    const page = await listAgentReviews(db, "claude-code", "bob");
    expect(page.reviews).toHaveLength(1);
    expect(page.reviews[0]).toMatchObject({
      authorName: "앨리스",
      model: "Opus",
      stack: ["TypeScript", "Next.js"],
      usedSince: "2026-01-02",
      body,
    });
    expect(await listAgentReviews(db, "codex")).toMatchObject({ reviews: [] });
  });

  it("rejects a short body, a third link, and a bad rating", async () => {
    expect(await createReview(db, draft({ body: "짧음" }))).toMatchObject({ ok: false });
    expect(body.length).toBeGreaterThanOrEqual(MIN_REVIEW_BODY);
    const links = `${body}\nhttps://a.example https://b.example https://c.example`;
    expect(await createReview(db, draft({ body: links }))).toMatchObject({
      ok: false,
      error: "링크는 2개까지 넣을 수 있습니다.",
    });
    expect(await createReview(db, draft({ rating: 6 }))).toMatchObject({ ok: false });
  });

  it("allows one review per user, agent, and task, even after a soft delete", async () => {
    const first = await createReview(db, draft());
    if (!first.ok) throw new Error(first.error);
    expect(await createReview(db, draft({ body: body + " 다시" }))).toMatchObject({
      ok: false,
      error: "이 작업에 대한 리뷰를 이미 남겼습니다.",
    });
    expect(await createReview(db, draft({ userId: "bob" }))).toMatchObject({ ok: true });
    expect(await deleteReview(db, { id: first.id, userId: "bob" })).toMatchObject({ ok: false });
    expect(await deleteReview(db, { id: first.id, userId: "alice" })).toMatchObject({ ok: true });
    expect((await listAgentReviews(db, "claude-code")).reviews.map((row) => row.authorId)).toEqual(["bob"]);
    expect(await createReview(db, draft())).toMatchObject({
      ok: false,
      error: "이 작업에 대한 리뷰를 이미 남겼습니다.",
    });
  });

  it("caps a user at five reviews per Seoul day and accepts one the next day", async () => {
    const tasks = ["debug", "docs", "tests", "design", "refactor"] as const;
    for (const taskType of tasks) {
      expect(await createReview(db, draft({ taskType }))).toMatchObject({ ok: true });
    }
    expect(tasks).toHaveLength(DAILY_REVIEW_LIMIT);
    expect(await createReview(db, draft({ taskType: "incident" }))).toMatchObject({
      ok: false,
      error: "리뷰는 하루에 5건까지 남길 수 있습니다.",
    });
    expect(await createReview(db, draft({ userId: "bob", taskType: "incident" }))).toMatchObject({ ok: true });
    const nextDay = new Date("2026-11-22T03:00:00Z");
    expect(await createReview(db, draft({ taskType: "incident", now: nextDay }))).toMatchObject({ ok: true });
  });

  it("keeps concurrent submissions inside the daily limit", async () => {
    const tasks = ["debug", "docs", "tests", "design", "refactor", "incident", "write_code"] as const;
    const results = await Promise.all(tasks.map((taskType) => createReview(db, draft({ taskType }))));
    const errors = results.flatMap((result) => (result.ok ? [] : [result.error]));
    expect(results.filter((result) => result.ok)).toHaveLength(DAILY_REVIEW_LIMIT);
    expect(errors).toHaveLength(tasks.length - DAILY_REVIEW_LIMIT);
    expect(new Set(errors)).toEqual(new Set(["리뷰는 하루에 5건까지 남길 수 있습니다."]));
    expect((await listAgentReviews(db, "claude-code")).reviews).toHaveLength(DAILY_REVIEW_LIMIT);
  });

  it("hides a deleted review from the average and greys a task under five reviews", async () => {
    const ratings = [5, 5, 5, 3, 2];
    for (const [i, rating] of ratings.entries()) {
      await insertUser(db, `u${i}`, `사용자${i}`);
      const created = await createReview(
        db,
        draft({
          userId: `u${i}`,
          rating,
          wouldUseAgain: rating >= 3,
          stack: i < 3 ? "TypeScript, React" : "Go",
          taskType: "debug",
        }),
      );
      if (!created.ok) throw new Error(created.error);
      if (i === 0) await deleteReview(db, { id: created.id, userId: `u${i}` });
    }
    await createReview(db, draft({ taskType: "docs", rating: 1, wouldUseAgain: false, stack: "TypeScript" }));

    const { summary } = await listAgentReviews(db, "claude-code");
    expect(summary.count).toBe(5);
    expect(summary.averageRating).toBe(3.2);
    expect(summary.wouldUseAgain).toBe(0.6);
    const debug = summary.tasks.find((cell) => cell.taskType === "debug");
    const docs = summary.tasks.find((cell) => cell.taskType === "docs");
    expect(debug).toMatchObject({ count: 4, enough: false });
    expect(docs).toMatchObject({ count: 1, enough: false });
    expect(summary.topStacks).toEqual([
      { tag: "TypeScript", count: 3 },
      { tag: "Go", count: 2 },
      { tag: "React", count: 2 },
    ]);
  });

  it("shows an average once a task has five live reviews", async () => {
    for (let i = 0; i < 5; i++) {
      await insertUser(db, `r${i}`);
      expect(
        await createReview(db, draft({ userId: `r${i}`, rating: i === 4 ? 1 : 5, taskType: "tests" })),
      ).toMatchObject({ ok: true });
    }
    const tests = (await listAgentReviews(db, "claude-code")).summary.tasks.find((cell) => cell.taskType === "tests");
    expect(tests).toMatchObject({ count: 5, enough: true, averageRating: 4.2 });
  });

  it("toggles a helpful vote and ignores a deleted review", async () => {
    const created = await createReview(db, draft());
    if (!created.ok) throw new Error(created.error);
    expect(await setReviewHelpful(db, { userId: "bob", reviewId: created.id, helpful: true })).toMatchObject({
      ok: true,
    });
    expect(await setReviewHelpful(db, { userId: "bob", reviewId: created.id, helpful: true })).toMatchObject({
      ok: true,
    });
    let page = await listAgentReviews(db, "claude-code", "bob");
    expect(page.reviews[0]).toMatchObject({ helpfulCount: 1, helpfulByMe: true });
    await setReviewHelpful(db, { userId: "bob", reviewId: created.id, helpful: false });
    page = await listAgentReviews(db, "claude-code", "bob");
    expect(page.reviews[0]).toMatchObject({ helpfulCount: 0, helpfulByMe: false });
    await deleteReview(db, { id: created.id, userId: "alice" });
    expect(await setReviewHelpful(db, { userId: "bob", reviewId: created.id, helpful: true })).toMatchObject({
      ok: false,
    });
  });
});

describe("operator badge ids", () => {
  it("uses AGENT_OPERATORS when set and otherwise METRICS_ADMINS", () => {
    expect(operatorAccountIds({ AGENT_OPERATORS: " 7, 8 " })).toEqual(["7", "8"]);
    expect(operatorAccountIds({ AGENT_OPERATORS: "" })).toEqual([]);
    expect(operatorAccountIds({ METRICS_ADMINS: "9" })).toEqual(["9"]);
  });

  it("maps GitHub account ids to the signed-in user", async () => {
    await db.insert(account).values({
      id: "acc",
      accountId: "111",
      providerId: "github",
      userId: "alice",
      updatedAt: new Date(),
    });
    expect(await listOperatorUserIds(db, ["111"])).toEqual(new Set(["alice"]));
    expect(await listOperatorUserIds(db, ["222"])).toEqual(new Set());
  });
});
