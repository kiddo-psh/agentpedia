import type { Root, RootContent } from "mdast";
import type { MdxJsxAttribute } from "mdast-util-mdx-jsx";
import remarkMdx from "remark-mdx";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { orderedKit } from "./kit";
import { applyCommand } from "../mcp/name";
import { CATEGORY_LABEL, DIFFICULTY_LABEL, formatDate, sourcePeriod } from "./labels";
import type { Article } from "./schema";

/**
 * The article as a first-time reader meets it on the page, top to bottom, as plain text.
 * A reviewer with no project context reads this instead of the MDX, so it must follow the
 * page order in src/app/a/[slug]/page.tsx. Hidden content is marked, not left out.
 */
export function readerText(article: Article): string {
  const out: string[] = [];
  const meta = [CATEGORY_LABEL[article.category], DIFFICULTY_LABEL[article.difficulty], sourcePeriod(article.sources)];
  out.push(meta.join(" · "), "", `# ${article.title}`, "");
  for (const p of article.persons) out.push(`${p.nameKo} (${p.name}) — ${p.role}`);
  if (article.persons.length > 0) out.push("");

  const { brief } = article;
  out.push("## 30초 요약", `무슨 일: ${brief.what}`, `왜 중요한가: ${brief.why}`, `지금 할 수 있는 일: ${brief.action} [링크: 적용 방법 보기 ↓]`, "");

  out.push(blocks(parse(article.bodyMarkdown).children, article).join("\n\n"), "");

  if (article.terms.length > 0) {
    out.push(folded(`이 글의 용어 ${article.terms.length}개 · ${article.terms.map((t) => t.term).join(", ")}`,
      article.terms.map((t) => `${t.term}${t.en ? ` (${t.en})` : ""}: ${t.definition}`).join("\n")), "");
  }

  const { apply } = article;
  out.push(
    "## 내 프로젝트에 적용하기",
    "키트는 코딩 에이전트에게 건네는 작업 지시문(prompt.md)과 점검표(checklist.md) 묶음입니다. 이 글의 키트는 다음 일을 합니다.",
    apply.goal,
    `${apply.time} · ${apply.fitsWhen}`,
    "",
    "1 내 레포에 맞는지 진단하기 · 파일을 바꾸지 않습니다",
    `[복사용 프롬프트] ${article.tryIt}`,
    "",
    "2 적용하기 · 바꾸기 전에 계획을 보여 주고 승인을 받습니다",
    `[복사용 명령] ${applyCommand(article.slug)}`,
    "MCP를 쓰지 않는다면 키트(.zip)를 받아 에이전트에게 prompt.md를 건네세요. 처음이라면 에이전트 연결 방법을 보세요.",
    "",
    folded("키트가 바꾸는 것과 하지 않는 것", [...apply.changes.map((c) => `+ ${c}`), ...apply.doesNotDo.map((c) => `− ${c}`)].join("\n")),
    folded(`키트 파일 보기 (${article.kit.length}개)`, orderedKit(article.kit).map((f) => `--- ${f.path}\n${f.content}`).join("\n")),
    "",
    "## 출처",
    ...article.sources.map((s) => `• ${s.title} · ${s.author} · ${s.publishedAt ? formatDate(s.publishedAt) : `날짜 없음 (${formatDate(s.accessedAt!)} 열람)`}`),
  );
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

const parse = (md: string): Root => unified().use(remarkParse).use(remarkMdx).parse(md);

const folded = (title: string, body: string) => `[접힌 영역: ${title}]\n[펼치면 보이는 내용:\n${body}\n]`;

type Node = RootContent | Root;

function attr(node: Node, name: string): string | undefined {
  if (!("attributes" in node)) return undefined;
  const a = node.attributes.find((x): x is MdxJsxAttribute => x.type === "mdxJsxAttribute" && x.name === name);
  return typeof a?.value === "string" ? a.value : undefined;
}

function blocks(nodes: RootContent[], article: Article): string[] {
  return nodes.map((n) => block(n, article)).filter((s) => s.length > 0);
}

function block(node: RootContent, article: Article): string {
  switch (node.type) {
    case "thematicBreak":
      return "———";
    case "heading":
      return `## ${inline(node, article)}`;
    case "list":
      return node.children.map((li, i) => `${node.ordered ? `${(node.start ?? 1) + i}.` : "•"} ${blocks(li.children, article).join(" ")}`).join("\n");
    case "code":
      return node.value;
    case "mdxJsxFlowElement":
      return component(node, blocks(node.children, article).join("\n\n"), article);
    default:
      return inline(node, article);
  }
}

/** Block components; MDX parses one written on a single line as inline, so both paths land here. */
function component(node: Node, inner: string, article: Article): string {
  const name = "name" in node ? node.name : undefined;
  if (name === "KeyIdea") return `[핵심 아이디어 상자] ${attr(node, "title") ?? ""}\n${inner}`.trim();
  if (name === "Compare") return `[비교 상자]\n이전: ${attr(node, "before") ?? ""}\n이제: ${attr(node, "after") ?? ""}`;
  if (name === "Quote") {
    const s = article.sources.find((x) => x.id === attr(node, "source"));
    const at = attr(node, "at");
    return `[인용] ${inner}\n— ${s?.author ?? ""}, ${s?.title ?? ""}${at ? ` (${at})` : ""}`;
  }
  return inner;
}

function inline(node: Node, article: Article): string {
  if (node.type === "text") return node.value;
  if (node.type === "inlineCode") return `\`${node.value}\``;
  if (node.type === "break") return "\n";
  const children = "children" in node ? (node.children as Node[]).map((c) => inline(c, article)).join("") : "";
  if (node.type !== "mdxJsxTextElement") return children;
  if (node.name === "Term") {
    const t = article.terms.find((x) => x.id === attr(node, "id"));
    return t ? `${children} [용어 팝오버(클릭 시 표시): ${t.term} — ${t.definition}]` : children;
  }
  return component(node, children, article);
}
