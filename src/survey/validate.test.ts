import { describe, expect, it } from "vitest";
import { listModels } from "@/content/models";
import { SURVEY_BOOT_JS, SURVEY_DISMISS_JS } from "./boot";
import { containsLink } from "./links";
import { publicOrigin, rejectsCrossSite } from "./http";
import { MAX_OTHER_LENGTH } from "./limits";
import { agentAppOptions, modelOptions, TENURE_OPTIONS, USE_OPTIONS } from "./options";
import { parseSurveyFields, type SurveyFields } from "./validate";

const agents = [
  { id: "claude-code", label: "Claude Code" },
  { id: "cursor", label: "Cursor" },
];
const models = [{ id: "opus-5-5", label: "Claude Opus 5.5" }];

function fields(partial: Partial<SurveyFields> = {}): SurveyFields {
  return {
    agents: ["claude-code"],
    agentOther: "",
    model: "opus-5-5",
    modelOther: "",
    uses: ["web"],
    useOther: "",
    tenure: "lt-1m",
    company: "",
    ...partial,
  };
}

describe("survey options", () => {
  it("starts from catalog agents, then adds apps that are not in content", () => {
    const options = agentAppOptions();
    expect(options.map((option) => option.id).slice(0, 6)).toEqual([
      "claude-code",
      "codex",
      "cursor",
      "orca",
      "gemini-cli",
      "github-copilot",
    ]);
    expect(options.find((option) => option.id === "claude-code")?.label).toBe("Claude Code");
    expect(options.find((option) => option.id === "cursor")?.label).toBe("Cursor");
    expect(options.find((option) => option.id === "codex")?.label).toBe("Codex CLI");
  });

  it("does not duplicate an extra app that content already lists", () => {
    const options = agentAppOptions([
      { slug: "orca", name: "Orca" },
      { slug: "claude-code", name: "Claude Code" },
    ]);
    expect(options.filter((option) => option.id === "orca")).toHaveLength(1);
    expect(options[0]?.id).toBe("claude-code");
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

  it("accepts a complete answer, and filled other text counts as 기타", () => {
    expect(parse()).toMatchObject({
      ok: true,
      value: { agents: ["claude-code"], agentOther: null, model: "opus-5-5", tenure: "lt-1m" },
    });
    expect(parse({ agentOther: "  직접 입력  " })).toMatchObject({
      ok: true,
      value: { agents: ["claude-code", "other"], agentOther: "직접 입력" },
    });
  });

  it("dedupes agents and keeps other text when the box is filled", () => {
    const result = parse({
      agents: ["cursor", "claude-code", "cursor", "nope"],
      agentOther: "",
    });
    expect(result).toMatchObject({ ok: false, error: "고를 수 없는 에이전트입니다." });

    expect(
      parse({ agents: ["cursor", "claude-code", "cursor"], agentOther: "  Orca  " }),
    ).toMatchObject({
      ok: true,
      value: { agents: ["claude-code", "cursor", "other"], agentOther: "Orca" },
    });
  });

  it("requires a choice, a period, and other text without a link", () => {
    expect(parse({ agents: [] })).toMatchObject({ ok: false, error: "에이전트를 하나 이상 골라 주세요." });
    expect(parse({ agents: ["other"], agentOther: "  " })).toMatchObject({
      ok: false,
      error: "기타 에이전트를 적어 주세요.",
    });
    expect(parse({ agentOther: "https://x.test" })).toMatchObject({ ok: false, error: "링크는 적을 수 없습니다." });
    expect(parse({ agentOther: "가".repeat(MAX_OTHER_LENGTH + 1) })).toMatchObject({ ok: false });
    expect(parse({ model: "", modelOther: "" })).toMatchObject({ ok: false, error: "모델을 골라 주세요." });
    expect(parse({ model: "other", modelOther: "로컬 모델" })).toMatchObject({
      ok: true,
      value: { model: "other", modelOther: "로컬 모델" },
    });
    expect(parse({ uses: [], useOther: "" })).toMatchObject({ ok: false, error: "용도를 하나 이상 골라 주세요." });
    expect(parse({ tenure: "forever" })).toMatchObject({ ok: false, error: "사용 기간을 골라 주세요." });
  });
});

describe("survey boot script", () => {
  it("parses as a script", () => {
    expect(() => new Function(SURVEY_BOOT_JS)).not.toThrow();
    expect(() => new Function(SURVEY_DISMISS_JS)).not.toThrow();
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
