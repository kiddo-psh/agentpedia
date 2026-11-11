import { createMcpHandler } from "@modelcontextprotocol/server";
import { trackAfterResponse } from "@/events/track";
import { createAgentpediaServer } from "@/mcp/server";

// Stateless: a fresh server per request. Public, read-only, unauthenticated.
const handler = createMcpHandler(({ requestInfo }) =>
  createAgentpediaServer(requestInfo ? new URL(requestInfo.url).origin : "", (kind, articleSlug) => {
    if (requestInfo) trackAfterResponse(requestInfo, { kind, articleSlug });
  }),
);

const serve = (request: Request) => handler.fetch(request);

export { serve as GET, serve as POST, serve as DELETE };
