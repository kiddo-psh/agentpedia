import { encodeAgentOther } from "./codec";
import { ORCHESTRATOR_OTHER_ID } from "./choices";
import { MAX_OTHER_LENGTH, OTHER_ID } from "./limits";
import { containsLink } from "./links";
import type { SurveyOption } from "./choices";

export type SurveyAnswer = {
  agents: string[];
  /** JSON from encodeAgentOther, or null. Not shown on the public chart. */
  agentOther: string | null;
  models: string[];
  modelOther: string | null;
  uses: string[];
  useOther: string | null;
  tenure: string;
};

export type SurveyFields = {
  agents: string[];
  orchestratorOther: string;
  agentOther: string;
  models: string[];
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
    orchestratorOther: String(form.get("orchestratorOther") ?? ""),
    agentOther: String(form.get("agentOther") ?? ""),
    models: form.getAll("model").map(String),
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
    orchestratorOther: typeof raw.orchestratorOther === "string" ? raw.orchestratorOther : "",
    agentOther: typeof raw.agentOther === "string" ? raw.agentOther : "",
    models: asStringArray(raw.models ?? raw.model),
    modelOther: typeof raw.modelOther === "string" ? raw.modelOther : "",
    uses: asStringArray(raw.uses),
    useOther: typeof raw.useOther === "string" ? raw.useOther : "",
    tenure: typeof raw.tenure === "string" ? raw.tenure : "",
    company: typeof raw.company === "string" ? raw.company : typeof raw.survey_hp === "string" ? raw.survey_hp : "",
  };
}

type Choice = { ok: true; ids: string[]; other: string | null } | { ok: false; error: string };

function objectParticle(noun: string): "을" | "를" {
  const last = noun.charCodeAt(noun.length - 1);
  const batchim = last >= 0xac00 && last <= 0xd7a3 && (last - 0xac00) % 28 !== 0;
  return batchim ? "을" : "를";
}

function readOther(selected: boolean, text: string, noun: string): { ok: true; text: string | null } | { ok: false; error: string } {
  const trimmed = text.trim();
  if (!selected && !trimmed) return { ok: true, text: null };
  if (!trimmed) return { ok: false, error: `기타 ${noun}${objectParticle(noun)} 적어 주세요.` };
  if (trimmed.length > MAX_OTHER_LENGTH) {
    return { ok: false, error: `기타 항목은 ${MAX_OTHER_LENGTH}자까지 쓸 수 있습니다.` };
  }
  if (containsLink(trimmed)) return { ok: false, error: "링크는 적을 수 없습니다." };
  return { ok: true, text: trimmed };
}

function chooseMany(selected: string[], otherText: string, known: ReadonlySet<string>, noun: string): Choice {
  const unknown = selected.filter((id) => id !== OTHER_ID && !known.has(id));
  if (unknown.length > 0) return { ok: false, error: `고를 수 없는 ${noun}입니다.` };
  const ids = [...new Set(selected.filter((id) => known.has(id)))].sort();
  const other = readOther(selected.includes(OTHER_ID), otherText, noun);
  if (!other.ok) return other;
  const chosen = other.text ? [...ids.filter((id) => id !== OTHER_ID), OTHER_ID] : ids;
  if (chosen.length === 0) return { ok: false, error: `${noun}${objectParticle(noun)} 하나 이상 골라 주세요.` };
  return { ok: true, ids: chosen, other: other.text };
}

export function parseSurveyFields(
  fields: SurveyFields,
  agents: readonly SurveyOption[],
  models: readonly SurveyOption[],
  uses: readonly SurveyOption[],
  tenures: readonly SurveyOption[],
): { ok: true; value: SurveyAnswer } | { ok: false; error: string } {
  const agentIds = new Set(agents.map((option) => option.id));
  const plain = fields.agents.filter((id) => id !== OTHER_ID && id !== ORCHESTRATOR_OTHER_ID);
  const unknown = plain.filter((id) => !agentIds.has(id));
  if (unknown.length > 0) return { ok: false, error: "고를 수 없는 에이전트입니다." };
  const orchestrator = readOther(
    fields.agents.includes(ORCHESTRATOR_OTHER_ID),
    fields.orchestratorOther,
    "오케스트레이터",
  );
  if (!orchestrator.ok) return orchestrator;
  const general = readOther(fields.agents.includes(OTHER_ID), fields.agentOther, "에이전트");
  if (!general.ok) return general;
  const ids = [...new Set(plain.filter((id) => agentIds.has(id)))].sort();
  if (orchestrator.text) ids.push(ORCHESTRATOR_OTHER_ID);
  if (general.text) ids.push(OTHER_ID);
  if (ids.length === 0) return { ok: false, error: "에이전트를 하나 이상 골라 주세요." };

  const modelChoice = chooseMany(fields.models, fields.modelOther, new Set(models.map((option) => option.id)), "모델");
  if (!modelChoice.ok) return modelChoice;
  const useChoice = chooseMany(fields.uses, fields.useOther, new Set(uses.map((option) => option.id)), "용도");
  if (!useChoice.ok) return useChoice;
  if (!tenures.some((option) => option.id === fields.tenure)) {
    return { ok: false, error: "사용 기간을 골라 주세요." };
  }

  return {
    ok: true,
    value: {
      agents: ids,
      agentOther: encodeAgentOther({ orchestrator: orchestrator.text, other: general.text }),
      models: modelChoice.ids,
      modelOther: modelChoice.other,
      uses: useChoice.ids,
      useOther: useChoice.other,
      tenure: fields.tenure,
    },
  };
}
