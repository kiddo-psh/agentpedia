/**
 * End-to-end check of a running /mcp endpoint over real HTTP.
 * Usage: npm run mcp:smoke -- http://localhost:3000/mcp
 */
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";

const url = new URL(process.argv[2] ?? "http://localhost:3000/mcp");
const client = new Client({ name: "agentpedia-smoke", version: "0.0.0" });

function check(ok: boolean, label: string) {
  console.log(`${ok ? "ok  " : "FAIL"} ${label}`);
  if (!ok) process.exitCode = 1;
}

await client.connect(new StreamableHTTPClientTransport(url));

const { tools } = await client.listTools();
check(tools.length === 3, `tools: ${tools.map((t) => t.name).join(", ")}`);

const search = await client.callTool({ name: "search_articles", arguments: {} });
const text = (search.content as { text: string }[])[0].text;
const slug = text.match(/slug: ([a-z0-9-]+)/)?.[1];
check(Boolean(slug), `search_articles -> first slug: ${slug ?? "(none)"}`);

if (slug) {
  const article = await client.callTool({ name: "get_article", arguments: { slug } });
  check(!article.isError, "get_article");

  const prompt = await client.getPrompt({ name: "apply_article", arguments: { slug } });
  const body = (prompt.messages[0].content as { text: string }).text;
  check(body.includes("### prompt.md"), `apply_article (${body.length} chars)`);
}

const missing = await client.callTool({ name: "get_article", arguments: { slug: "does-not-exist" } });
check(missing.isError === true, "unknown slug -> isError");

await client.close();
