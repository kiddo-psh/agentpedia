import { after } from "next/server";
import { getDb } from "@/db/client";
import { recordEvent, visitorHash, visitorId, type TrackedEvent } from "./record";

type Tracked = Omit<TrackedEvent, "visitorHash" | "visitorId">;

/** Records after the response is sent, so tracking never adds latency. */
export function trackAfterResponse(request: Request, e: Tracked) {
  const hash = visitorHash(request.headers);
  after(async () => recordEvent(await getDb(), { ...e, visitorHash: hash }));
}

/**
 * Like `trackAfterResponse`, for requests a browser makes: also records the anonymous visitor
 * ID and returns `response` with the cookie set when the browser had none.
 */
export function trackBrowserAfterResponse(request: Request, e: Tracked, response: Response): Response {
  const hash = visitorHash(request.headers);
  const visitor = visitorId(request);
  after(async () => recordEvent(await getDb(), { ...e, visitorHash: hash, visitorId: visitor.id }));
  if (visitor.setCookie) response.headers.append("set-cookie", visitor.setCookie);
  return response;
}
