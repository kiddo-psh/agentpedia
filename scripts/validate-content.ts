import { ContentError, loadAllArticles } from "../src/content/loader";

try {
  const articles = loadAllArticles();
  const drafts = articles.filter((a) => a.draft).length;
  console.log(`content ok: ${articles.length} articles (${drafts} draft)`);
} catch (e) {
  if (e instanceof ContentError) {
    console.error(e.message);
    process.exit(1);
  }
  throw e;
}
