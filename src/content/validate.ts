import matter from "gray-matter";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkMdx from "remark-mdx";
import { visit } from "unist-util-visit";
import type { Root } from "mdast";
import type { MdxJsxAttribute } from "mdast-util-mdx-jsx";
import {
  ArticleMeta,
  MDX_COMPONENTS,
  REQUIRED_KIT_FILE,
  TIMED_SOURCE_KINDS,
  type Article,
  type KitFile,
} from "./schema";

export type ArticleInput = {
  /** Directory name under content/articles. Must equal frontmatter `slug`. */
  dirName: string;
  /** Raw index.mdx contents. */
  raw: string;
  kit: KitFile[];
};

export type ParseResult =
  | { ok: true; article: Article }
  | { ok: false; issues: string[] };

const TIMESTAMP = /^(?:\d+:)?[0-5]?\d:[0-5]\d$/;

/** Pure: no IO. Collects every problem instead of stopping at the first. */
export function parseArticle({ dirName, raw, kit }: ArticleInput): ParseResult {
  const issues: string[] = [];
  const { data, content } = matter(raw);

  const meta = ArticleMeta.safeParse(data);
  if (!meta.success) {
    for (const i of meta.error.issues) {
      issues.push(`frontmatter.${i.path.join(".") || "(root)"}: ${i.message}`);
    }
  } else if (meta.data.slug !== dirName) {
    issues.push(`frontmatter.slug "${meta.data.slug}" must equal directory name "${dirName}"`);
  }

  if (!kit.some((f) => f.path === REQUIRED_KIT_FILE)) {
    issues.push(`kit/${REQUIRED_KIT_FILE} is missing`);
  }

  let tree: Root | undefined;
  try {
    tree = unified().use(remarkParse).use(remarkMdx).parse(content);
  } catch (e) {
    issues.push(`mdx: ${(e as Error).message}`);
  }

  if (tree && meta.success) {
    const sources = new Map(meta.data.sources.map((s) => [s.id, s]));
    visit(tree, (node) => {
      if (node.type !== "mdxJsxFlowElement" && node.type !== "mdxJsxTextElement") return;
      const line = node.position?.start.line ?? "?";
      if (!node.name || !(MDX_COMPONENTS as readonly string[]).includes(node.name)) {
        issues.push(
          `line ${line}: <${node.name ?? ""}> is not an allowed component (${MDX_COMPONENTS.join(", ")})`,
        );
        return;
      }
      if (node.name !== "Quote") return;
      const attr = (name: string) => {
        const a = node.attributes.find(
          (x): x is MdxJsxAttribute => x.type === "mdxJsxAttribute" && x.name === name,
        );
        return typeof a?.value === "string" ? a.value : undefined;
      };

      const sourceId = attr("source");
      const at = attr("at");
      const source = sourceId ? sources.get(sourceId) : undefined;

      if (!sourceId) {
        issues.push(`line ${line}: <Quote> needs a string "source" attribute`);
        return;
      }
      if (!source) {
        issues.push(`line ${line}: <Quote source="${sourceId}"> does not match any sources[].id`);
        return;
      }
      const timed = (TIMED_SOURCE_KINDS as readonly string[]).includes(source.kind);
      if (timed && !at) {
        issues.push(`line ${line}: <Quote source="${sourceId}"> is a ${source.kind}; "at" timestamp is required`);
      }
      if (at && !TIMESTAMP.test(at)) {
        issues.push(`line ${line}: <Quote at="${at}"> must look like mm:ss or h:mm:ss`);
      }
    });
  }

  if (issues.length > 0 || !meta.success) return { ok: false, issues };
  return { ok: true, article: { ...meta.data, bodyMarkdown: content.trim(), kit } };
}

/** "1:02:03" -> 3723. Used to build `?t=` links. Assumes the input passed validation. */
export function timestampToSeconds(at: string): number {
  return at.split(":").reduce((acc, part) => acc * 60 + Number(part), 0);
}
