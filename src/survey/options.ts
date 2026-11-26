import { listAgents } from "@/content/agents";
import { listModels } from "@/content/models";
import { OTHER_ID } from "./limits";

export type SurveyOption = { id: string; label: string };

/**
 * Catalog names are the labels, except where the survey asks for the app people
 * launch (Codex the CLI) rather than the product family name in facts.yaml.
 */
const AGENT_LABEL: Record<string, string> = {
  codex: "Codex CLI",
};

/** Apps the question asks about that are not in content/agents yet. */
const EXTRA_AGENT_APPS: readonly SurveyOption[] = [
  { id: "orca", label: "Orca" },
  { id: "gemini-cli", label: "Gemini CLI" },
  { id: "github-copilot", label: "GitHub Copilot" },
];

const AGENT_ORDER = ["claude-code", "codex", "cursor", "orca", "gemini-cli", "github-copilot"];

export const USE_OPTIONS: readonly SurveyOption[] = [
  { id: "web", label: "웹 프론트" },
  { id: "backend", label: "백엔드" },
  { id: "data-ai", label: "데이터/AI" },
  { id: "study", label: "학습/과제" },
];

export const TENURE_OPTIONS: readonly SurveyOption[] = [
  { id: "lt-1m", label: "1개월 미만" },
  { id: "1-6m", label: "1-6개월" },
  { id: "6m-plus", label: "6개월+" },
];

export function agentAppOptions(
  agents: readonly { slug: string; name: string }[] = listAgents(),
): SurveyOption[] {
  const byId = new Map<string, SurveyOption>();
  for (const agent of agents) {
    byId.set(agent.slug, { id: agent.slug, label: AGENT_LABEL[agent.slug] ?? agent.name });
  }
  for (const extra of EXTRA_AGENT_APPS) {
    if (!byId.has(extra.id)) byId.set(extra.id, extra);
  }
  const ordered: SurveyOption[] = [];
  for (const id of AGENT_ORDER) {
    const option = byId.get(id);
    if (!option) continue;
    ordered.push(option);
    byId.delete(id);
  }
  const rest = [...byId.values()].sort((a, b) => a.label.localeCompare(b.label, "ko"));
  return [...ordered, ...rest];
}

export function modelOptions(
  models: readonly { slug: string; name: string }[] = listModels(),
): SurveyOption[] {
  return models.map((model) => ({ id: model.slug, label: model.name }));
}

export function withOther(options: readonly SurveyOption[]): SurveyOption[] {
  if (options.some((option) => option.id === OTHER_ID)) return [...options];
  return [...options, { id: OTHER_ID, label: "기타" }];
}
