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
  REQUIRED_CHECKLIST_FILE,
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

  // People are named in English everywhere; the Korean transliteration exists only for search.
  const { sources: _sources, ...readerFields } = data as Record<string, unknown>;
  const frontmatterText = JSON.stringify(readerFields);
  const bodyLines = content.split("\n");
  const bodyStart = raw.split("\n").length - bodyLines.length;
  for (const person of people.values()) {
    const pattern = koreanNamePattern(person.nameKo);
    const match = frontmatterText.match(pattern);
    if (match) issues.push(`frontmatter: write "${person.name}" instead of "${match[0]}"`);
    bodyLines.forEach((text, i) => {
      const m = text.match(pattern);
      if (m) issues.push(`line ${bodyStart + i + 1}: write "${person.name}" instead of "${m[0]}"`);
    });
    for (const file of kit) {
      const m = file.content.match(pattern);
      if (m) issues.push(`kit/${file.path}: write "${person.name}" instead of "${m[0]}"`);
    }
  }

  if (!kit.some((f) => f.path === REQUIRED_KIT_FILE)) {
    issues.push(`kit/${REQUIRED_KIT_FILE} is missing`);
  }
  if (!kit.some((f) => f.path === REQUIRED_CHECKLIST_FILE)) {
    issues.push(`kit/${REQUIRED_CHECKLIST_FILE} is missing`);
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
    // The page title is the only h1, and deeper than h3 is a sign the article needs splitting.
    visit(tree, "heading", (node) => {
      if (node.depth === 2 || node.depth === 3) return;
      const line = (node.position?.start.line ?? 0) + bodyOffset;
      issues.push(`line ${line}: body headings must be "##" or "###" (the title is the only "#")`);
    });
  }

  const termIds = new Set<string>();
  if (tree && meta.success) {
    const sources = new Map(meta.data.sources.map((s) => [s.id, s]));
    visit(tree, (node, _index, parent) => {
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
      if (node.name === "Pyramid") {
        const shape = attr("shape");
        if (shape !== "inverted" && shape !== "upright") {
          issues.push(`line ${line}: <Pyramid> needs shape="inverted" or shape="upright"`);
        }
        const layers = node.children.filter((c) => "name" in c && c.name === "PyramidLayer");
        if (layers.length < 2) issues.push(`line ${line}: <Pyramid> needs at least two <PyramidLayer> children`);
        return;
      }
      if (node.name === "PyramidLayer") {
        if (!attr("name")) issues.push(`line ${line}: <PyramidLayer> needs a string "name" attribute`);
        if (!(parent && "name" in parent && parent.name === "Pyramid")) {
          issues.push(`line ${line}: <PyramidLayer> must sit directly inside <Pyramid>`);
        }
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

  // A popover definition is page text too.
  for (const id of termIds) {
    const { definition } = glossary.get(id)!;
    for (const person of people.values()) {
      const m = definition.match(koreanNamePattern(person.nameKo));
      if (m) issues.push(`content/glossary.yaml "${id}": write "${person.name}" instead of "${m[0]}"`);
    }
  }

  if (issues.length > 0 || !meta.success) return { ok: false, issues };
  const persons = meta.data.people.map((id) => people.get(id)!);
  const terms = [...termIds].map((id) => glossary.get(id)!);
  return { ok: true, article: { ...meta.data, bodyMarkdown: content.trim(), kit, persons, terms } };
}

/**
 * The full transliteration, or any one part of it standing as a word: "로렌 탄", "탄은", "카파시의".
 * A part counts only when it stands alone, optionally followed by a particle and then no more
 * Hangul, so "존재", "마틴게일" and "에이다이어트" do not match "존", "마틴" or "에이다".
 */
function koreanNamePattern(nameKo: string): RegExp {
  const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = [nameKo, ...nameKo.split(/\s+/)].map(escape).join("|");
  const particles = "은|는|이|가|의|을|를|도|와|과|에게|에서|에|께|로|으로|이라는|라는|이라고|라고|처럼|보다|만|까지|부터|조차";
  return new RegExp(`(?<![가-힣])(?:${parts})(?=(?:${particles})?(?![가-힣]))`);
}

/** "1:02:03" -> 3723. Used to build `?t=` links. Assumes the input passed validation. */
export function timestampToSeconds(at: string): number {
  return at.split(":").reduce((acc, part) => acc * 60 + Number(part), 0);
}
