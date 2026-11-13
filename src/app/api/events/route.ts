import { z } from "zod";
import { getArticle } from "@/content/loader";
import { trackAfterResponse } from "@/events/track";

// Browsers may only report these; downloads and MCP calls are recorded server-side.
const Body = z.object({
  slug: z.string().max(200),
  kind: z.enum(["view", "web_copy", "share"]),
});

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !getArticle(parsed.data.slug)) {
    return new Response(null, { status: 400 });
  }
  trackAfterResponse(request, { kind: parsed.data.kind, articleSlug: parsed.data.slug });
  return new Response(null, { status: 204 });
}
