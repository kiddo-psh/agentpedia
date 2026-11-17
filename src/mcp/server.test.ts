import { Client } from "@modelcontextprotocol/client";
import { InMemoryTransport } from "@modelcontextprotocol/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { applyPromptText, createAgentpediaServer, SERVER_NAME } from "./server";
import { getArticle } from "@/content/loader";

// Runs against the real content/articles (drafts are visible outside production).
const ORIGIN = "https://agentpedia.test";
const SLUG = "boris-cherny-claude-code-workflow";

/** One representative slug per kit genre slot (action / audit / hybrid). */
const APPLY_SLOTS = [
  "steinberger-shipping-at-inference-speed",
  "openai-isolation-failure",
  "lauren-tan-anti-slop-trust-pyramid",
] as const;

let client: Client;
let recorded: [string, string][];

beforeEach(async () => {
  recorded = [];
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await createAgentpediaServer(ORIGIN, (kind, slug) => recorded.push([kind, slug])).connect(serverSide);
  client = new Client({ name: "test", version: "0.0.0" });
  await client.connect(clientSide);
});

afterEach(() => client.close());

const textOf = (r: { content: unknown }) =>
  (r.content as { type: string; text: string }[]).map((c) => c.text).join("\n");

describe(`${SERVER_NAME} MCP server`, () => {
  it("exposes three read-only tools and the apply_article prompt", async () => {
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(["get_apply_kit", "get_article", "search_articles"]);
    expect(tools.every((t) => t.annotations?.readOnlyHint)).toBe(true);

    const { prompts } = await client.listPrompts();
    expect(prompts.map((p) => p.name)).toEqual(["apply_article"]);
    expect(prompts[0].arguments?.map((a) => a.name)).toEqual(["slug"]);
  });

  it("search_articles finds by person and filters by category", async () => {
    const hit = await client.callTool({ name: "search_articles", arguments: { query: "Boris" } });
    expect(textOf(hit)).toContain(`slug: ${SLUG}`);

    // Boris's article is in another category, so the filter must drop it.
    const none = await client.callTool({ name: "search_articles", arguments: { query: "Boris", category: "security" } });
    expect(textOf(none)).toContain("기사가 없습니다");
  });

  it("get_article returns key ideas, sources, the diagnosis prompt and an absolute URL", async () => {
    const r = await client.callTool({ name: "get_article", arguments: { slug: SLUG } });
    const t = textOf(r);
    expect(r.isError).toBeFalsy();
    expect(t).toContain(`URL: ${ORIGIN}/a/${SLUG}`);
    expect(t).toContain("## 핵심 아이디어");
    expect(t).toContain("https://x.com/bcherny/status/2007179832300581177");
    expect(t).toContain("먼저 진단 (파일 수정 없음): ");
    expect(t).not.toMatch(/<Term\b|<Pyramid\b|<Quote\b|<KeyIdea\b/);
  });

  it("unknown slug is a tool error that suggests close matches", async () => {
    const r = await client.callTool({ name: "get_article", arguments: { slug: "boris-claude" } });
    expect(r.isError).toBe(true);
    expect(textOf(r)).toContain(`slug: ${SLUG}`);
  });

  it("get_apply_kit puts prompt.md first", async () => {
    const t = textOf(await client.callTool({ name: "get_apply_kit", arguments: { slug: SLUG } }));
    expect(t.indexOf("### prompt.md")).toBeGreaterThan(-1);
    expect(t.indexOf("### prompt.md")).toBeLessThan(t.indexOf("### checklist.md"));
  });

  it("reports an apply event per successful article call, none for misses or search", async () => {
    await client.callTool({ name: "search_articles", arguments: {} });
    await client.callTool({ name: "get_article", arguments: { slug: SLUG } });
    await client.callTool({ name: "get_apply_kit", arguments: { slug: SLUG } });
    await client.getPrompt({ name: "apply_article", arguments: { slug: SLUG } });
    await client.callTool({ name: "get_article", arguments: { slug: "nope" } });
    expect(recorded).toEqual([
      ["mcp_get_article", SLUG],
      ["mcp_get_kit", SLUG],
      ["mcp_prompt", SLUG],
    ]);
  });

  it("apply_article embeds tryIt, cleaned body, kit, and a short progress block", async () => {
    const { messages } = await client.getPrompt({ name: "apply_article", arguments: { slug: SLUG } });
    const t = (messages[0].content as { text: string }).text;
    expect(messages[0].role).toBe("user");
    expect(t).toContain("맞지 않으면");
    expect(t).toContain("## 이 키트가 하는 일");
    expect(t).toContain("하지 않는 것:");
    expect(t).toContain("### prompt.md");
    expect(t).toContain(`${ORIGIN}/a/${SLUG}`);
    expect(t).toContain("## 먼저 진단 (파일 수정 없음)");
    expect(t).toContain("키트의 맞는지-판단");
    expect(t).not.toMatch(/1\.\s*현재 레포 구조와 설정을 먼저 읽고[\s\S]*4\.\s/);
    expect(t).not.toMatch(/<Term\b|<Pyramid\b|<Quote\b|<KeyIdea\b/);
  });

  it.each(APPLY_SLOTS)("applyPromptText contract for %s", (slug) => {
    const a = getArticle(slug);
    expect(a).toBeTruthy();
    const t = applyPromptText(a!, ORIGIN);
    expect(t.length).toBeGreaterThan(500);
    expect(t).toContain(`## 기사: ${a!.title}`);
    expect(t).toContain(`${ORIGIN}/a/${slug}`);
    expect(t).toContain("핵심 아이디어:");
    for (const idea of a!.keyIdeas) expect(t).toContain(idea);
    expect(t).toContain(a!.tryIt);
    expect(t).toContain("## 이 키트가 하는 일");
    expect(t).toContain(a!.apply.goal);
    expect(t).toContain("## 본문 요약");
    expect(t).toContain("### prompt.md");
    expect(t.indexOf(a!.tryIt)).toBeLessThan(t.indexOf("### prompt.md"));
    expect(t.indexOf("### prompt.md")).toBeLessThan(t.indexOf("## 진행 방식"));
    expect(t).toContain("## 출처");
    expect(t).not.toMatch(/<Term\b|<Pyramid\b|<Quote\b|<KeyIdea\b/);
    expect(t).not.toMatch(/1\.\s*현재 레포 구조와 설정을 먼저 읽고[\s\S]*4\.\s/);
  });
});
