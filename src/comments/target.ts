import { getAgent } from "@/content/agents";
import { getArticle } from "@/content/loader";

/** Article slugs stay as they are. Agent discussion uses `agent:<slug>` on the same table. */
export function commentSlugError(slug: string): string | null {
  if (slug.startsWith("agent:")) {
    const agentSlug = slug.slice("agent:".length);
    if (agentSlug && !agentSlug.includes(":") && getAgent(agentSlug)) return null;
    return "에이전트를 찾을 수 없습니다.";
  }
  if (!getArticle(slug)) return "기사를 찾을 수 없습니다.";
  return null;
}
