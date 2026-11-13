// Prints an article as a first-time reader meets it on the page, for blind readability review.
// Usage: npm run render:article -- <slug>
import { ContentError, loadAllArticles } from "../src/content/loader";
import { readerText } from "../src/content/readerText";

const slug = process.argv[2];
if (!slug) {
  console.error("usage: npm run render:article -- <slug>");
  process.exit(1);
}

try {
  const article = loadAllArticles().find((a) => a.slug === slug);
  if (!article) {
    console.error(`no article with slug "${slug}"`);
    process.exit(1);
  }
  process.stdout.write(readerText(article));
} catch (e) {
  if (e instanceof ContentError) {
    console.error(e.message);
    process.exit(1);
  }
  throw e;
}
