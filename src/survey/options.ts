import { listModels } from "@/content/models";
import { AGENT_GROUPS, USE_OPTIONS, TENURE_OPTIONS, type SurveyOption } from "./choices";
import { OTHER_ID } from "./limits";

export type { AgentGroup, SurveyOption } from "./choices";
export { AGENT_GROUPS, ORCHESTRATOR_OTHER_ID, TENURE_OPTIONS, USE_OPTIONS, agentAppOptions } from "./choices";

export function modelOptions(
  models: readonly { slug: string; name: string }[] = listModels(),
): SurveyOption[] {
  return models.map((model) => ({ id: model.slug, label: model.name }));
}

export function withOther(options: readonly SurveyOption[]): SurveyOption[] {
  if (options.some((option) => option.id === OTHER_ID)) return [...options];
  return [...options, { id: OTHER_ID, label: "기타" }];
}

export function surveyCatalog(models: readonly SurveyOption[] = modelOptions()) {
  return {
    agentGroups: AGENT_GROUPS,
    models: withOther(models),
    uses: withOther(USE_OPTIONS),
    tenures: TENURE_OPTIONS,
  };
}
