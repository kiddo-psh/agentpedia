/** MCP server name. Clients prefix commands with it, e.g. `/mcp__agentpedia__apply_article`. */
export const SERVER_NAME = "agentpedia";

/** The slash command that runs an article's kit in Claude Code. */
export const applyCommand = (slug: string) => `/mcp__${SERVER_NAME}__apply_article ${slug}`;
