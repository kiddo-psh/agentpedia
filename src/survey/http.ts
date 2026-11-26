import { NextResponse } from "next/server";
import { VISITOR_COOKIE, VISITOR_COOKIE_MAX_AGE, visitorId } from "@/events/record";
import { SURVEY_DONE_COOKIE } from "./boot";
import { SURVEY_POST_PATH } from "./post";

export type VisitorCookie = ReturnType<typeof visitorId>;

/**
 * Cross-site form posts must not mint a new visitor cookie over someone else's browser.
 * `request.url` can be the server's internal host, so compare Origin to the Host header.
 * Browsers that send `Sec-Fetch-Site: same-origin` are the page's own form.
 */
export function rejectsCrossSite(request: Request): boolean {
  const site = request.headers.get("sec-fetch-site");
  if (site === "cross-site") return true;
  if (site === "same-origin" || site === "same-site" || site === "none") return false;
  const origin = request.headers.get("origin");
  if (!origin) return false;
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return true;
  }
  const host = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() || request.headers.get("host");
  if (!host) return false;
  return originHost !== host;
}

/** Host the browser used. `request.url` can be the server's internal host, which would drop the cookie on redirect. */
export function publicOrigin(request: Request): string {
  const host = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() || request.headers.get("host");
  const proto =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || new URL(request.url).protocol.replace(":", "");
  if (!host) return new URL(request.url).origin;
  return `${proto}://${host}`;
}

function stamp(response: NextResponse, request: Request, visitor: VisitorCookie, done: boolean) {
  const secure = publicOrigin(request).startsWith("https:");
  if (visitor.setCookie) {
    response.cookies.set(VISITOR_COOKIE, visitor.id, {
      path: "/",
      maxAge: VISITOR_COOKIE_MAX_AGE,
      httpOnly: true,
      sameSite: "lax",
      secure,
    });
  }
  if (done) {
    response.cookies.set(SURVEY_DONE_COOKIE, "1", {
      path: "/",
      maxAge: VISITOR_COOKIE_MAX_AGE,
      httpOnly: false,
      sameSite: "lax",
      secure,
    });
  }
}

export function surveyRedirect(request: Request, search: string, visitor: VisitorCookie, done: boolean, hash?: string) {
  const url = new URL(SURVEY_POST_PATH, publicOrigin(request));
  if (search) url.search = search.startsWith("?") ? search : `?${search}`;
  if (hash) url.hash = hash;
  const response = NextResponse.redirect(url, 303);
  stamp(response, request, visitor, done);
  return response;
}

export function surveyJson(
  request: Request,
  body: unknown,
  status: number,
  visitor: VisitorCookie,
  done: boolean,
) {
  const response = NextResponse.json(body, { status });
  stamp(response, request, visitor, done);
  return response;
}
