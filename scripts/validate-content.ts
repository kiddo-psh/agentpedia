import { loadAllAgents, staleAgentWarnings } from "../src/content/agents";
import { ContentError, loadAllArticles } from "../src/content/loader";

try {
  const articles = loadAllArticles();
  const agents = loadAllAgents();
  const drafts = articles.filter((a) => a.draft).length;
  const slugs = new Set(articles.map((article) => article.slug));
  const missingRelated = agents.flatMap((agent) =>
    agent.relatedArticles
      .filter((slug) => !slugs.has(slug))
      .map((slug) => `${agent.slug}: related article "${slug}" is not an article`),
  );
  if (missingRelated.length > 0) {
    throw new ContentError(missingRelated.map((issue) => ({ dir: "agents", issues: [issue] })));
  }
  for (const warning of staleAgentWarnings(agents, new Date())) {
    console.warn(`stale agent fact: ${warning}`);
  }
  console.log(`content ok: ${articles.length} articles (${drafts} draft), ${agents.length} agents`);
} catch (e) {
  if (e instanceof ContentError) {
    console.error(e.message);
    process.exit(1);
  }
  throw e;
}
