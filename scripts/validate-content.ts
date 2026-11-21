import { loadAllAgents, staleAgentWarnings } from "../src/content/agents";
import { loadAllModels, loadTaskTiming, staleModelWarnings } from "../src/content/models";
import { ContentError, loadAllArticles } from "../src/content/loader";

try {
  const articles = loadAllArticles();
  const agents = loadAllAgents();
  const models = loadAllModels();
  loadTaskTiming();
  const drafts = articles.filter((a) => a.draft).length;
  const articleSlugs = new Set(articles.map((article) => article.slug));
  const agentSlugs = new Set(agents.map((agent) => agent.slug));
  const missingRelated = agents.flatMap((agent) =>
    agent.relatedArticles
      .filter((slug) => !articleSlugs.has(slug))
      .map((slug) => `${agent.slug}: related article "${slug}" is not an article`),
  );
  const missingAgents = models.flatMap((model) =>
    model.relatedAgents
      .filter((slug) => !agentSlugs.has(slug))
      .map((slug) => `${model.slug}: related agent "${slug}" is not an agent`),
  );
  if (missingRelated.length > 0) {
    throw new ContentError(missingRelated.map((issue) => ({ dir: "agents", issues: [issue] })));
  }
  if (missingAgents.length > 0) {
    throw new ContentError(missingAgents.map((issue) => ({ dir: "models", issues: [issue] })));
  }
  for (const warning of staleAgentWarnings(agents, new Date())) {
    console.warn(`stale agent fact: ${warning}`);
  }
  for (const warning of staleModelWarnings(models, new Date())) {
    console.warn(`stale model fact: ${warning}`);
  }
  console.log(
    `content ok: ${articles.length} articles (${drafts} draft), ${agents.length} agents, ${models.length} models`,
  );
} catch (e) {
  if (e instanceof ContentError) {
    console.error(e.message);
    process.exit(1);
  }
  throw e;
}
