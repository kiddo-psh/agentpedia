import { NextResponse, type NextRequest } from "next/server";
import { hitFromEnv, rateLimit } from "@/ratelimit";

const hit = hitFromEnv();

export async function proxy(request: NextRequest) {
  return (hit && (await rateLimit(request, hit))) || NextResponse.next();
}

// Only the public endpoints that run code per request. Auth, metrics, and pages are not limited.
export const config = {
  matcher: ["/mcp", "/api/events"],
};
