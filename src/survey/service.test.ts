import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import { surveyResponses } from "@/db/schema";
import { createTestDb, insertUser } from "@/db/testing";
import { aggregateSurvey } from "./aggregate";
import { TENURE_OPTIONS, USE_OPTIONS, withOther } from "./options";
import { listSurveyAnswers, saveSurveyResponse, type SaveSurveyInput } from "./service";

let db: Db;
const visitorA = "3f2c8a1e-4b5d-4c6e-9f70-123456789abc";
const visitorB = "11111111-1111-4111-8111-111111111111";

function input(partial: Partial<SaveSurveyInput> = {}): SaveSurveyInput {
  return {
    visitorId: visitorA,
    agents: ["claude-code"],
    agentOther: null,
    model: "opus-5-5",
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
    expect(await saveSurveyResponse(db, input({ agents: ["cursor"], userId: null }))).toEqual({
      ok: true,
      already: true,
    });
    expect(await saveSurveyResponse(db, input({ visitorId: visitorB }))).toEqual({ ok: true, already: false });

    const rows = await db.select().from(surveyResponses);
    expect(rows).toHaveLength(2);
    expect(rows.find((row) => row.visitorId === visitorA)?.agents).toEqual(["claude-code"]);
  });

  it("links a signed-in user when one is present", async () => {
    await insertUser(db, "alice", "앨리스");
    await saveSurveyResponse(db, input({ userId: "alice" }));
    const [row] = await db.select().from(surveyResponses);
    expect(row?.userId).toBe("alice");
  });

  it("aggregates only stored rows", async () => {
    await saveSurveyResponse(db, input());
    const results = aggregateSurvey(await listSurveyAnswers(db), {
      agents: withOther([{ id: "claude-code", label: "Claude Code" }]),
      models: withOther([{ id: "opus-5-5", label: "Claude Opus 5.5" }]),
      uses: withOther(USE_OPTIONS),
      tenures: TENURE_OPTIONS,
    });
    expect(results).toMatchObject({ n: 1, published: false, agents: [] });
  });
});
