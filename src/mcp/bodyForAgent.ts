import type { Root, RootContent } from "mdast";
import type { MdxJsxAttribute } from "mdast-util-mdx-jsx";
import remarkMdx from "remark-mdx";
import remarkParse from "remark-parse";
import { unified } from "unified";
import type { Article } from "@/content/schema";

/** Soft cap for the cleaned body excerpt in MCP prompts/tools (keeps tokens down). */
export const AGENT_BODY_MAX_CHARS = 3500;

const parse = (md: string): Root => unified().use(remarkParse).use(remarkMdx).parse(md);

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
      return "---";
    case "heading":
      return `${"#".repeat(node.depth)} ${inline(node, article)}`;
    case "list":
      return node.children
        .map((li, i) => `${node.ordered ? `${(node.start ?? 1) + i}.` : "-"} ${blocks(li.children, article).join(" ")}`)
        .join("\n");
    case "code":
      return "```" + (node.lang ?? "") + "\n" + node.value + "\n```";
    case "mdxJsxFlowElement":
      return component(node, blocks(node.children, article).join("\n\n"), article);
    default:
      return inline(node, article);
  }
}

function component(node: Node, inner: string, article: Article): string {
  const name = "name" in node ? node.name : undefined;
  if (name === "KeyIdea") return `**${attr(node, "title") ?? "핵심"}**\n${inner}`.trim();
  if (name === "Pyramid") {
    const layers = "children" in node ? (node.children as Node[]).filter((c) => "name" in c && c.name === "PyramidLayer") : [];
    const rows = layers.map((l, i) => `${i + 1}. ${attr(l, "name") ?? ""}${attr(l, "detail") ? ` — ${attr(l, "detail")}` : ""}`);
    const title = attr(node, "title");
    const caption = attr(node, "caption");
    return [title ? `**${title}**` : null, ...rows, caption].filter(Boolean).join("\n");
  }
  if (name === "Compare") return `이전: ${attr(node, "before") ?? ""}\n이제: ${attr(node, "after") ?? ""}`;
  if (name === "Quote") {
    const s = article.sources.find((x) => x.id === attr(node, "source"));
    const at = attr(node, "at");
    return `> ${inner}\n> — ${s?.author ?? ""}${at ? ` (${at})` : ""}`;
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
    // Prefer the visible children; fall back to the glossary term label (no JSX).
    return children || t?.term || "";
  }
  return component(node, children, article);
}

/** Full body as agent-readable markdown (no MDX JSX). */
export function bodyMarkdownForAgent(article: Article): string {
  return blocks(parse(article.bodyMarkdown).children, article).join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * Cleaned body excerpt for MCP: first two `##` sections (plus lead), capped.
 * Brief/keyIdeas live elsewhere in the prompt — this is nuance only.
 */
export function bodyExcerptForAgent(article: Article, maxChars = AGENT_BODY_MAX_CHARS): string {
  const full = bodyMarkdownForAgent(article);
  const parts = full.split(/(?=^## )/m);
  const lead = parts[0]?.trim() ?? "";
  const sections = parts.slice(1, 3).map((s) => s.trim()).filter(Boolean);
  let out = [lead, ...sections].filter(Boolean).join("\n\n").trim();
  const truncatedByChars = out.length > maxChars;
  if (truncatedByChars) {
    out = out.slice(0, maxChars).replace(/\s+\S*$/, "") + "…";
  }
  const moreSections = parts.length > 3;
  if (moreSections || truncatedByChars || full.length > out.replace(/…$/, "").length) {
    out = out.replace(/\n*\(본문 일부만 포함[^)]*\)\s*$/, "");
    out += "\n\n(본문 일부만 포함. 더 필요하면 get_article을 쓰세요.)";
  }
  return out;
}
