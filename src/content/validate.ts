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
  type GlossaryEntry,
  type KitFile,
  type Person,
} from "./schema";

export type ArticleInput = {
  /** Directory name under content/articles. Must equal frontmatter `slug`. */
  dirName: string;
  /** Raw index.mdx contents. */
  raw: string;
  kit: KitFile[];
  /** content/people.yaml, keyed by id. */
  people: ReadonlyMap<string, Person>;
  /** content/glossary.yaml, keyed by id. */
  glossary: ReadonlyMap<string, GlossaryEntry>;
};

export type ParseResult =
  | { ok: true; article: Article }
  | { ok: false; issues: string[] };

const TIMESTAMP = /^(?:\d+:)?[0-5]?\d:[0-5]\d$/;

/** Pure: no IO. Collects every problem instead of stopping at the first. */
export function parseArticle({ dirName, raw, kit, people, glossary }: ArticleInput): ParseResult {
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

  const unknownPeople = meta.success ? meta.data.people.filter((id) => !people.has(id)) : [];
  for (const id of unknownPeople) {
    issues.push(`frontmatter.people: "${id}" is not in content/people.yaml`);
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

  // CommonMark will not close `**` right after punctuation when a letter follows, so
  // `**"인용"**이라고` renders literal asterisks. Common in Korean. A parsed text node that
  // still contains "**" is exactly that failure.
  const bodyOffset = raw.split("\n").length - content.split("\n").length;
  if (tree) {
    visit(tree, "text", (node) => {
      if (!node.value.includes("**")) return;
      const line = (node.position?.start.line ?? 0) + bodyOffset;
      issues.push(
        `line ${line}: "**" did not become bold and will show as literal asterisks. Move punctuation outside the markers: "**...**"이라고`,
      );
    });
    // The 30-second brief already outlines the article; body headings repeated it.
    visit(tree, "heading", (node) => {
      const line = (node.position?.start.line ?? 0) + bodyOffset;
      issues.push(`line ${line}: body headings are not allowed. Bridge with a sentence, or use "---" for a scene break`);
    });
  }

  const termIds = new Set<string>();
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
      const attr = (name: string) => {
        const a = node.attributes.find(
          (x): x is MdxJsxAttribute => x.type === "mdxJsxAttribute" && x.name === name,
        );
        return typeof a?.value === "string" ? a.value : undefined;
      };
      if (node.name === "Term") {
        const id = attr("id");
        if (!id) issues.push(`line ${line}: <Term> needs a string "id" attribute`);
        else if (!glossary.has(id)) issues.push(`line ${line}: <Term id="${id}"> is not in content/glossary.yaml`);
        else termIds.add(id);
        return;
      }
      if (node.name !== "Quote") return;

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
  const persons = meta.data.people.map((id) => people.get(id)!);
  const terms = [...termIds].map((id) => glossary.get(id)!);
  return { ok: true, article: { ...meta.data, bodyMarkdown: content.trim(), kit, persons, terms } };
}

/** "1:02:03" -> 3723. Used to build `?t=` links. Assumes the input passed validation. */
export function timestampToSeconds(at: string): number {
  return at.split(":").reduce((acc, part) => acc * 60 + Number(part), 0);
}
