import { Client } from "@modelcontextprotocol/client";
import { InMemoryTransport } from "@modelcontextprotocol/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createAgentpediaServer, SERVER_NAME } from "./server";

// Runs against the real content/articles (drafts are visible outside production).
const ORIGIN = "https://agentpedia.test";
const SLUG = "boris-cherny-claude-code-workflow";

let client: Client;

beforeEach(async () => {
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await createAgentpediaServer(ORIGIN).connect(serverSide);
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

    const none = await client.callTool({ name: "search_articles", arguments: { category: "security" } });
    expect(textOf(none)).toContain("기사가 없습니다");
  });

  it("get_article returns key ideas, sources and an absolute URL", async () => {
    const r = await client.callTool({ name: "get_article", arguments: { slug: SLUG } });
    const t = textOf(r);
    expect(r.isError).toBeFalsy();
    expect(t).toContain(`URL: ${ORIGIN}/a/${SLUG}`);
    expect(t).toContain("## 핵심 아이디어");
    expect(t).toContain("https://x.com/bcherny/status/2007179832300581177");
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

  it("apply_article embeds the kit and the stop-if-unfit instruction", async () => {
    const { messages } = await client.getPrompt({ name: "apply_article", arguments: { slug: SLUG } });
    const t = (messages[0].content as { text: string }).text;
    expect(messages[0].role).toBe("user");
    expect(t).toContain("맞지 않으면 이유를 설명하고 멈추세요");
    expect(t).toContain("### prompt.md");
    expect(t).toContain(`${ORIGIN}/a/${SLUG}`);
  });
});
