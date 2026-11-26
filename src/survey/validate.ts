import { MAX_OTHER_LENGTH, OTHER_ID } from "./limits";
import { containsLink } from "./links";
import type { SurveyOption } from "./options";

export type SurveyAnswer = {
  agents: string[];
  agentOther: string | null;
  model: string;
  modelOther: string | null;
  uses: string[];
  useOther: string | null;
  tenure: string;
};

export type SurveyFields = {
  agents: string[];
  agentOther: string;
  model: string;
  modelOther: string;
  uses: string[];
  useOther: string;
  tenure: string;
  company: string;
};

export function honeypotFilled(company: string): boolean {
  return company.trim().length > 0;
}

export function fieldsFromForm(form: FormData): SurveyFields {
  return {
    agents: form.getAll("agents").map(String),
    agentOther: String(form.get("agentOther") ?? ""),
    model: String(form.get("model") ?? ""),
    modelOther: String(form.get("modelOther") ?? ""),
    uses: form.getAll("uses").map(String),
    useOther: String(form.get("useOther") ?? ""),
    tenure: String(form.get("tenure") ?? ""),
    company: String(form.get("survey_hp") ?? ""),
  };
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string" && value) return [value];
  return [];
}

export function fieldsFromJson(value: unknown): SurveyFields | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  return {
    agents: asStringArray(raw.agents),
    agentOther: typeof raw.agentOther === "string" ? raw.agentOther : "",
    model: typeof raw.model === "string" ? raw.model : "",
    modelOther: typeof raw.modelOther === "string" ? raw.modelOther : "",
    uses: asStringArray(raw.uses),
    useOther: typeof raw.useOther === "string" ? raw.useOther : "",
    tenure: typeof raw.tenure === "string" ? raw.tenure : "",
    company: typeof raw.company === "string" ? raw.company : typeof raw.survey_hp === "string" ? raw.survey_hp : "",
  };
}

type Choice =
  | { ok: true; ids: string[]; other: string | null }
  | { ok: false; error: string };

/** Object particle from the last Hangul syllable. */
function objectParticle(noun: string): "을" | "를" {
  const last = noun.charCodeAt(noun.length - 1);
  const batchim = last >= 0xac00 && last <= 0xd7a3 && (last - 0xac00) % 28 !== 0;
  return batchim ? "을" : "를";
}

function chooseMany(
  selected: string[],
  otherText: string,
  known: ReadonlySet<string>,
  noun: string,
): Choice {
  const unknown = selected.filter((id) => id !== OTHER_ID && !known.has(id));
  if (unknown.length > 0) return { ok: false, error: `고를 수 없는 ${noun}입니다.` };
  const obj = objectParticle(noun);

  const ids = [...new Set(selected.filter((id) => known.has(id)))].sort();
  const text = otherText.trim();
  const wantOther = selected.includes(OTHER_ID) || text.length > 0;
  if (wantOther) {
    if (!text) return { ok: false, error: `기타 ${noun}${obj} 적어 주세요.` };
    if (text.length > MAX_OTHER_LENGTH) {
      return { ok: false, error: `기타 항목은 ${MAX_OTHER_LENGTH}자까지 쓸 수 있습니다.` };
    }
    if (containsLink(text)) return { ok: false, error: "링크는 적을 수 없습니다." };
  }
  if (ids.length === 0 && !wantOther) return { ok: false, error: `${noun}${obj} 하나 이상 골라 주세요.` };
  return { ok: true, ids: wantOther ? [...ids, OTHER_ID] : ids, other: wantOther ? text : null };
}

function chooseOne(
  selected: string,
  otherText: string,
  known: ReadonlySet<string>,
  noun: string,
): { ok: true; id: string; other: string | null } | { ok: false; error: string } {
  const text = otherText.trim();
  const obj = objectParticle(noun);
  const wantOther = selected === OTHER_ID || (!selected && text.length > 0);
  if (wantOther) {
    if (!text) return { ok: false, error: `기타 ${noun}${obj} 적어 주세요.` };
    if (text.length > MAX_OTHER_LENGTH) {
      return { ok: false, error: `기타 항목은 ${MAX_OTHER_LENGTH}자까지 쓸 수 있습니다.` };
    }
    if (containsLink(text)) return { ok: false, error: "링크는 적을 수 없습니다." };
    return { ok: true, id: OTHER_ID, other: text };
  }
  if (!known.has(selected)) return { ok: false, error: `${noun}${obj} 골라 주세요.` };
  return { ok: true, id: selected, other: null };
}

export function parseSurveyFields(
  fields: SurveyFields,
  agents: readonly SurveyOption[],
  models: readonly SurveyOption[],
  uses: readonly SurveyOption[],
  tenures: readonly SurveyOption[],
): { ok: true; value: SurveyAnswer } | { ok: false; error: string } {
  const agentChoice = chooseMany(fields.agents, fields.agentOther, new Set(agents.map((o) => o.id)), "에이전트");
  if (!agentChoice.ok) return agentChoice;
  const modelChoice = chooseOne(fields.model, fields.modelOther, new Set(models.map((o) => o.id)), "모델");
  if (!modelChoice.ok) return modelChoice;
  const useChoice = chooseMany(fields.uses, fields.useOther, new Set(uses.map((o) => o.id)), "용도");
  if (!useChoice.ok) return useChoice;

  const tenureIds = new Set(tenures.map((o) => o.id));
  if (!tenureIds.has(fields.tenure)) return { ok: false, error: "사용 기간을 골라 주세요." };

  return {
    ok: true,
    value: {
      agents: agentChoice.ids,
      agentOther: agentChoice.other,
      model: modelChoice.id,
      modelOther: modelChoice.other,
      uses: useChoice.ids,
      useOther: useChoice.other,
      tenure: fields.tenure,
    },
  };
}
