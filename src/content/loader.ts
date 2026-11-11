import fs from "node:fs";
import path from "node:path";
import type { Article, ArticleMeta, Category, KitFile } from "./schema";
import { parseArticle } from "./validate";

/** The single content entry point shared by web pages and the MCP server. */

export class ContentError extends Error {
  constructor(public readonly problems: { dir: string; issues: string[] }[]) {
    super(
      "Invalid content:\n" +
        problems.map((p) => `  ${p.dir}\n${p.issues.map((i) => `    - ${i}`).join("\n")}`).join("\n"),
    );
  }
}

function readKit(kitDir: string): KitFile[] {
  if (!fs.existsSync(kitDir)) return [];
  return fs
    .readdirSync(kitDir, { recursive: true, withFileTypes: true })
    .filter((d) => d.isFile())
    .map((d) => {
      const abs = path.join(d.parentPath, d.name);
      return {
        path: path.relative(kitDir, abs).split(path.sep).join("/"),
        content: fs.readFileSync(abs, "utf8"),
      };
    })
    .sort((a, b) => a.path.localeCompare(b.path));
}

/** Reads and validates every article. Throws ContentError listing all problems. */
// Every fs path is spelled from process.cwd() + "content/articles" literally so the bundler
// can scope output file tracing to that folder instead of the whole project.
export function loadAllArticles(): Article[] {
  if (!fs.existsSync(path.join(process.cwd(), "content", "articles"))) return [];
  const articles: Article[] = [];
  const problems: { dir: string; issues: string[] }[] = [];

  const entries = fs.readdirSync(path.join(process.cwd(), "content", "articles"), { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const indexPath = path.join(process.cwd(), "content", "articles", entry.name, "index.mdx");
    if (!fs.existsSync(indexPath)) {
      problems.push({ dir: entry.name, issues: ["index.mdx is missing"] });
      continue;
    }
    const result = parseArticle({
      dirName: entry.name,
      raw: fs.readFileSync(indexPath, "utf8"),
      kit: readKit(path.join(process.cwd(), "content", "articles", entry.name, "kit")),
    });
    if (result.ok) articles.push(result.article);
    else problems.push({ dir: entry.name, issues: result.issues });
  }

  if (problems.length > 0) throw new ContentError(problems);
  return articles.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
}

let cache: Article[] | undefined;
function all(): Article[] {
  if (process.env.NODE_ENV !== "production") return loadAllArticles();
  return (cache ??= loadAllArticles());
}

/** Drafts show in dev, or in a production build run with SHOW_DRAFTS=1 (preview deploys). */
const includeDraftsByDefault = () =>
  process.env.NODE_ENV !== "production" || process.env.SHOW_DRAFTS === "1";

export function listArticles(filter: {
  category?: Category;
  query?: string;
  includeDrafts?: boolean;
} = {}): ArticleMeta[] {
  const { category, query, includeDrafts = includeDraftsByDefault() } = filter;
  const q = query?.trim().toLowerCase();
  return all()
    .filter((a) => includeDrafts || !a.draft)
    .filter((a) => !category || a.category === category)
    .filter(
      (a) =>
        !q ||
        [a.title, a.summary, ...a.tags, ...a.people, ...a.keyIdeas].some((s) =>
          s.toLowerCase().includes(q),
        ),
    )
    .map(({ bodyMarkdown, kit, ...meta }) => meta);
}

export function getArticle(
  slug: string,
  { includeDrafts = includeDraftsByDefault() }: { includeDrafts?: boolean } = {},
): Article | null {
  const a = all().find((x) => x.slug === slug);
  return a && (includeDrafts || !a.draft) ? a : null;
}
