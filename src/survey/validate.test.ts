import { describe, expect, it } from "vitest";
import { listModels } from "@/content/models";
import { SURVEY_BOOT_JS } from "./boot";
import { containsLink } from "./links";
import { publicOrigin, rejectsCrossSite } from "./http";
import { MAX_OTHER_LENGTH } from "./limits";
import { listAgents } from "@/content/agents";
import { AGENT_GROUPS, agentAppOptions } from "./choices";
import { modelOptions, TENURE_OPTIONS, USE_OPTIONS } from "./options";
import { parseSurveyFields, type SurveyFields } from "./validate";

const agents = agentAppOptions();
const models = [{ id: "opus-5-5", label: "Claude Opus 5.5" }, { id: "grok-4-7", label: "Grok 4.7" }];

function fields(partial: Partial<SurveyFields> = {}): SurveyFields {
  return {
    agents: ["claude-code-cli"],
    orchestratorOther: "",
    agentOther: "",
    models: ["opus-5-5"],
    modelOther: "",
    uses: ["web"],
    useOther: "",
    tenure: "lt-1m",
    company: "",
    ...partial,
  };
}

describe("survey options", () => {
  it("groups apps by form factor", () => {
    expect(AGENT_GROUPS.map((group) => [group.label, group.options.map((option) => option.label)])).toEqual([
      ["터미널 CLI", ["Claude Code CLI", "Codex CLI", "Gemini CLI"]],
      ["데스크톱·웹 에이전트 앱", ["Claude Code 앱", "Codex 앱"]],
      ["IDE·에디터", ["Cursor", "GitHub Copilot"]],
      ["오케스트레이터", ["Orca", "기타 오케스트레이터"]],
      ["개인 비서형 에이전트", ["Grok Bot"]],
      ["기타", ["기타"]],
    ]);
    expect(agentAppOptions().find((option) => option.id === "cursor")?.label).toBe(
      listAgents().find((agent) => agent.slug === "cursor")?.name,
    );
  });

  it("uses model names from content", () => {
    expect(modelOptions().map((option) => option.id)).toEqual(listModels().map((model) => model.slug));
    expect(modelOptions().map((option) => option.label)).toEqual(listModels().map((model) => model.name));
  });
});

describe("containsLink", () => {
  it("blocks urls and bare hosts, and allows ordinary sentences", () => {
    expect(containsLink("좋은 에이전트입니다")).toBe(false);
    expect(containsLink("node.js로 돌립니다")).toBe(false);
    expect(containsLink("Claude 4.5")).toBe(false);
    expect(containsLink("https://evil.test/x")).toBe(true);
    expect(containsLink("www.evil.test")).toBe(true);
    expect(containsLink("보러 가세요 evil.dev")).toBe(true);
    expect(containsLink("[클릭](http://x.com)")).toBe(true);
    expect(containsLink("hxxps://x.com")).toBe(true);
  });
});

describe("parseSurveyFields", () => {
  const parse = (partial: Partial<SurveyFields> = {}) =>
    parseSurveyFields(fields(partial), agents, models, USE_OPTIONS, TENURE_OPTIONS);

  it("accepts several agents and models, and stores both free-text boxes", () => {
    expect(parse()).toMatchObject({
      ok: true,
      value: { agents: ["claude-code-cli"], agentOther: null, models: ["opus-5-5"], tenure: "lt-1m" },
    });
    expect(
      parse({
        agents: ["orca", "orchestrator-other"],
        orchestratorOther: "  내 오케스트레이터  ",
        agentOther: "직접 입력",
        models: ["grok-4-7", "opus-5-5", "opus-5-5"],
      }),
    ).toMatchObject({
      ok: true,
      value: {
        agents: ["orca", "orchestrator-other", "other"],
        agentOther: JSON.stringify({ orchestrator: "내 오케스트레이터", other: "직접 입력" }),
        models: ["grok-4-7", "opus-5-5"],
      },
    });
  });

  it("rejects an unknown app and an empty or linked other box", () => {
    expect(parse({ agents: ["nope"] })).toMatchObject({ ok: false, error: "고를 수 없는 에이전트입니다." });
    expect(parse({ agents: [] })).toMatchObject({ ok: false, error: "에이전트를 하나 이상 골라 주세요." });
    expect(parse({ agents: ["other"], agentOther: "  " })).toMatchObject({ ok: false });
    expect(parse({ agentOther: "https://x.test" })).toMatchObject({ ok: false, error: "링크는 적을 수 없습니다." });
    expect(parse({ orchestratorOther: "가".repeat(MAX_OTHER_LENGTH + 1) })).toMatchObject({ ok: false });
    expect(parse({ models: [], modelOther: "" })).toMatchObject({ ok: false, error: "모델을 하나 이상 골라 주세요." });
    expect(parse({ models: ["opus-5-5", "grok-4-7"], modelOther: "로컬 모델" })).toMatchObject({
      ok: true,
      value: { models: ["grok-4-7", "opus-5-5", "other"], modelOther: "로컬 모델" },
    });
    expect(parse({ uses: [], useOther: "" })).toMatchObject({ ok: false, error: "용도를 하나 이상 골라 주세요." });
    expect(parse({ tenure: "forever" })).toMatchObject({ ok: false, error: "사용 기간을 골라 주세요." });
  });
});

describe("survey boot script", () => {
  it("parses as a script and keeps the dismiss listener on document", () => {
    expect(() => new Function(SURVEY_BOOT_JS)).not.toThrow();
    expect(SURVEY_BOOT_JS).toContain('closest("[data-survey-dismiss]")');
  });
});

describe("rejectsCrossSite", () => {
  const request = (url: string, headers: Record<string, string>) =>
    new Request(url, { method: "POST", headers });

  it("blocks another site and allows the page's own form", () => {
    const url = "http://localhost:3101/api/survey";
    expect(rejectsCrossSite(request(url, { "sec-fetch-site": "cross-site", origin: "https://evil.test" }))).toBe(true);
    expect(rejectsCrossSite(request(url, { origin: "https://evil.test", host: "127.0.0.1:3101" }))).toBe(true);
    expect(rejectsCrossSite(request(url, { origin: "http://127.0.0.1:3101", host: "127.0.0.1:3101" }))).toBe(false);
    expect(
      rejectsCrossSite(request(url, { origin: "http://127.0.0.1:3101", "sec-fetch-site": "same-origin" })),
    ).toBe(false);
    expect(rejectsCrossSite(request(url, {}))).toBe(false);
  });

  it("builds redirects on the host the browser sent", () => {
    const req = new Request("http://localhost:3101/api/survey", { headers: { host: "127.0.0.1:3101" } });
    expect(publicOrigin(req)).toBe("http://127.0.0.1:3101");
    const forwarded = new Request("http://localhost:3101/api/survey", {
      headers: { "x-forwarded-host": "agentpedia.test", "x-forwarded-proto": "https" },
    });
    expect(publicOrigin(forwarded)).toBe("https://agentpedia.test");
  });
});
