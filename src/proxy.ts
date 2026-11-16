import { NextResponse, type NextRequest } from "next/server";
import { canViewMetrics } from "@/admin/metrics";
import { hitFromEnv, rateLimit } from "@/ratelimit";

const hit = hitFromEnv();

export async function proxy(request: NextRequest) {
  // Pages stream a 200 before a request-time notFound() runs, so the 404 status comes from here.
  if (request.nextUrl.pathname.startsWith("/admin")) {
    return (await canViewMetrics(request.headers)) ? NextResponse.next() : new NextResponse(null, { status: 404 });
  }
  return (hit && (await rateLimit(request, hit))) || NextResponse.next();
}

// Only the public endpoints that run code per request, plus the admin gate.
// Auth, metrics API, and other pages are not limited.
export const config = {
  matcher: ["/mcp", "/api/events", "/admin/:path*"],
};
