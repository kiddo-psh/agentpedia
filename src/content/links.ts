import type { Source } from "./schema";
import { timestampToSeconds } from "./validate";

const SEEKABLE_HOSTS = ["youtube.com", "www.youtube.com", "youtu.be", "m.youtube.com"];

/** Link to a source, jumping to `at` when the host supports `?t=`. */
export function sourceUrlAt(source: Source, at?: string): string {
  if (!at) return source.url;
  const url = new URL(source.url);
  if (!SEEKABLE_HOSTS.includes(url.hostname)) return source.url;
  url.searchParams.set("t", String(timestampToSeconds(at)));
  return url.toString();
}
