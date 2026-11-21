import { getAgent } from "@/content/agents";
import { getArticle } from "@/content/loader";
import { getModel } from "@/content/models";

/**
 * Article slugs stay as they are. Agent and model discussion reuse the comments
 * table with `agent:<slug>` / `model:<slug>` namespaces.
 */
export function commentSlugError(slug: string): string | null {
  if (slug.startsWith("model:")) {
    const modelSlug = slug.slice("model:".length);
    if (modelSlug && !modelSlug.includes(":") && getModel(modelSlug)) return null;
    return "모델을 찾을 수 없습니다.";
  }
  if (slug.startsWith("agent:")) {
    const agentSlug = slug.slice("agent:".length);
    if (agentSlug && !agentSlug.includes(":") && getAgent(agentSlug)) return null;
    return "에이전트를 찾을 수 없습니다.";
  }
  if (!getArticle(slug)) return "기사를 찾을 수 없습니다.";
  return null;
}
