import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { orderedKit } from "@/content/kit";
import { CATEGORY_LABEL } from "@/content/labels";
import { getArticle, listArticles } from "@/content/loader";
import { Category, REQUIRED_KIT_FILE, type Article, type ArticleMeta, type KitFile } from "@/content/schema";

export const SERVER_NAME = "agentpedia";

const Slug = z.string().describe("기사 slug (search_articles 결과의 slug 값)");

/** Up to 3 articles whose slug/title/tags share words with a slug that did not resolve. */
export function suggestFor(slug: string): ArticleMeta[] {
  const words = slug.toLowerCase().split(/[^a-z0-9가-힣]+/).filter((w) => w.length > 1);
  return listArticles()
    .map((a) => {
      const hay = [a.slug, a.title, ...a.tags, ...a.people].join(" ").toLowerCase();
      return { a, score: words.filter((w) => hay.includes(w)).length };
    })
    .filter((x) => x.score > 0)
    .sort((x, y) => y.score - x.score)
    .slice(0, 3)
    .map((x) => x.a);
}

function notFoundText(slug: string): string {
  const s = suggestFor(slug);
  return [
    `"${slug}" 기사를 찾지 못했습니다.`,
    s.length > 0
      ? `혹시 이 기사인가요?\n${s.map(line).join("\n")}`
      : "search_articles로 기사를 검색해 보세요.",
  ].join("\n");
}

function line(a: ArticleMeta): string {
  return `- ${a.title} (slug: ${a.slug}, ${CATEGORY_LABEL[a.category]}) — ${a.summary}`;
}

/** Longest backtick run + 1, so file contents can never close the fence early. */
function fence(content: string, lang = ""): string {
  const longest = Math.max(2, ...(content.match(/`+/g) ?? []).map((m) => m.length));
  const ticks = "`".repeat(longest + 1);
  return `${ticks}${lang}\n${content.trimEnd()}\n${ticks}`;
}

function kitText(kit: KitFile[]): string {
  return orderedKit(kit)
    .map((f) => `### ${f.path}\n\n${fence(f.content, f.path.endsWith(".md") ? "markdown" : "")}`)
    .join("\n\n");
}

function sourcesText(a: Article): string {
  return a.sources.map((s) => `- ${s.title} — ${s.author}: ${s.url}`).join("\n");
}

export function articleText(a: Article, origin: string): string {
  return [
    `# ${a.title}`,
    "",
    `URL: ${origin}/a/${a.slug}`,
    `카테고리: ${CATEGORY_LABEL[a.category]}${a.draft ? " · 초안(검수 전)" : ""}`,
    "",
    a.summary,
    "",
    "## 핵심 아이디어",
    ...a.keyIdeas.map((k, i) => `${i + 1}. ${k}`),
    "",
    "## 본문 (MDX)",
    "",
    a.bodyMarkdown,
    "",
    "## 출처",
    sourcesText(a),
    "",
    "## 적용 키트",
    `파일: ${orderedKit(a.kit).map((f) => f.path).join(", ")}`,
    "전체 내용은 get_apply_kit으로, 단계별 적용 지시는 apply_article 프롬프트로 받을 수 있습니다.",
  ].join("\n");
}

export function applyPromptText(a: Article, origin: string): string {
  return [
    "당신은 사용자의 현재 프로젝트에 아래 기사의 방법을 적용하려 합니다.",
    "",
    `## 기사: ${a.title}`,
    `${origin}/a/${a.slug}`,
    "",
    "핵심 아이디어:",
    ...a.keyIdeas.map((k) => `- ${k}`),
    "",
    "## 적용 키트",
    "",
    kitText(a.kit),
    "",
    "## 진행 방식",
    "",
    "1. 현재 레포 구조와 설정을 먼저 읽고, 이 방법이 이 프로젝트에 맞는지 판단하세요.",
    "   맞지 않으면 이유를 설명하고 멈추세요.",
    "2. 바꿀 파일과 이유를 담은 적용 계획을 제시하고 사용자 승인을 받으세요.",
    "3. 승인된 범위만 구현하세요.",
    `4. ${a.kit.some((f) => f.path === "checklist.md") ? "checklist.md" : REQUIRED_KIT_FILE}의 기준으로 결과를 점검하고 보고하세요.`,
    "",
    "## 출처",
    sourcesText(a),
  ].join("\n");
}

const text = (t: string) => ({ content: [{ type: "text" as const, text: t }] });
const error = (t: string) => ({ ...text(t), isError: true });

export function createAgentpediaServer(origin: string): McpServer {
  const server = new McpServer(
    { name: SERVER_NAME, version: "0.1.0" },
    {
      instructions:
        "Agentpedia는 AI 에이전트 활용법을 정리한 기사와, 각 기사를 프로젝트에 적용하는 키트를 제공합니다. " +
        "search_articles로 찾고, get_article로 읽고, apply_article 프롬프트나 get_apply_kit으로 적용하세요.",
    },
  );

  server.registerTool(
    "search_articles",
    {
      title: "기사 검색",
      description:
        "Agentpedia 기사를 검색합니다. 제목, 요약, 태그, 인물, 핵심 아이디어에서 찾습니다. query를 비우면 최신 기사 목록을 줍니다.",
      inputSchema: z.object({
        query: z.string().optional().describe("검색어 (예: 'claude code', '카파시', 'verification')"),
        category: Category.optional().describe("people | trends | startup | security"),
        limit: z.number().int().min(1).max(50).default(10),
      }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ query, category, limit }) => {
      const found = listArticles({ query, category }).slice(0, limit);
      if (found.length === 0) return text("조건에 맞는 기사가 없습니다. 검색어를 바꿔 보세요.");
      return text(`${found.length}개 기사:\n${found.map(line).join("\n")}`);
    },
  );

  server.registerTool(
    "get_article",
    {
      title: "기사 읽기",
      description: "기사의 핵심 아이디어, 본문, 출처, 키트 파일 목록을 반환합니다.",
      inputSchema: z.object({ slug: Slug }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ slug }) => {
      const a = getArticle(slug);
      return a ? text(articleText(a, origin)) : error(notFoundText(slug));
    },
  );

  server.registerTool(
    "get_apply_kit",
    {
      title: "적용 키트 받기",
      description: `기사의 적용 키트 파일 전체를 반환합니다. ${REQUIRED_KIT_FILE}가 진입점입니다.`,
      inputSchema: z.object({ slug: Slug }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ slug }) => {
      const a = getArticle(slug);
      return a ? text(`# ${a.title} — 적용 키트\n\n${kitText(a.kit)}`) : error(notFoundText(slug));
    },
  );

  server.registerPrompt(
    "apply_article",
    {
      title: "기사를 내 프로젝트에 적용",
      description: "기사의 방법을 현재 레포에 적용하는 작업 지시를 만듭니다. 맞지 않으면 에이전트가 멈추고 이유를 말합니다.",
      argsSchema: z.object({ slug: Slug }),
    },
    async ({ slug }) => {
      const a = getArticle(slug);
      return {
        messages: [{ role: "user", content: { type: "text", text: a ? applyPromptText(a, origin) : notFoundText(slug) } }],
      };
    },
  );

  return server;
}
