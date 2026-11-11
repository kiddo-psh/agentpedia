import { after } from "next/server";
import { getDb } from "@/db/client";
import { recordEvent, visitorHash, type TrackedEvent } from "./record";

/** Records after the response is sent, so tracking never adds latency. */
export function trackAfterResponse(request: Request, e: Omit<TrackedEvent, "visitorHash">) {
  const hash = visitorHash(request.headers);
  after(async () => recordEvent(await getDb(), { ...e, visitorHash: hash }));
}
