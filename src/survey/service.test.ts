import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import { surveyResponses } from "@/db/schema";
import { createTestDb, insertUser } from "@/db/testing";
import { aggregateSurvey } from "./aggregate";
import { encodeModelIds } from "./codec";
import { surveyCatalog } from "./options";
import { hasSurveyResponse, listSurveyAnswers, saveSurveyResponse, type SaveSurveyInput } from "./service";

let db: Db;
const visitorA = "3f2c8a1e-4b5d-4c6e-9f70-123456789abc";
const visitorB = "11111111-1111-4111-8111-111111111111";

function input(partial: Partial<SaveSurveyInput> = {}): SaveSurveyInput {
  return {
    visitorId: visitorA,
    agents: ["claude-code-cli"],
    agentOther: null,
    models: ["opus-5-5", "grok-4-7"],
    modelOther: null,
    uses: ["web"],
    useOther: null,
    tenure: "6m-plus",
    ...partial,
  };
}

beforeEach(async () => {
  db = await createTestDb();
});

describe("survey responses", () => {
  it("stores one row per visitor and keeps the first answer", async () => {
    expect(await saveSurveyResponse(db, input())).toEqual({ ok: true, already: false });
    expect(await saveSurveyResponse(db, input({ agents: ["cursor"] }))).toEqual({ ok: true, already: true });
    expect(await saveSurveyResponse(db, input({ visitorId: visitorB, models: ["opus-5-5"] }))).toEqual({
      ok: true,
      already: false,
    });

    const rows = await db.select().from(surveyResponses);
    expect(rows).toHaveLength(2);
    const first = rows.find((row) => row.visitorId === visitorA);
    expect(first?.agents).toEqual(["claude-code-cli"]);
    expect(first?.model).toBe(encodeModelIds(["opus-5-5", "grok-4-7"]));
    expect((await listSurveyAnswers(db)).find((row) => row.models.length === 2)?.models).toEqual([
      "grok-4-7",
      "opus-5-5",
    ]);
  });

  it("links a signed-in user when one is present", async () => {
    await insertUser(db, "alice", "앨리스");
    await saveSurveyResponse(db, input({ userId: "alice" }));
    const [row] = await db.select().from(surveyResponses);
    expect(row?.userId).toBe("alice");
  });

  it("knows whether this visitor cookie already answered", async () => {
    expect(await hasSurveyResponse(db, visitorA)).toBe(false);
    await saveSurveyResponse(db, input());
    expect(await hasSurveyResponse(db, visitorA)).toBe(true);
    expect(await hasSurveyResponse(db, visitorB)).toBe(false);
  });

  it("aggregates stored rows into groups without hiding the counts", async () => {
    await saveSurveyResponse(db, input({ models: ["opus-5-5"] }));
    const results = aggregateSurvey(await listSurveyAnswers(db), surveyCatalog([{ id: "opus-5-5", label: "Opus" }]));
    expect(results.n).toBe(1);
    expect(results.agentGroups.find((group) => group.id === "cli")?.count).toBe(1);
    expect(results.models.find((bucket) => bucket.id === "opus-5-5")?.count).toBe(1);
  });
});
