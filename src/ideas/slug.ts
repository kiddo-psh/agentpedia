import { createHash } from "node:crypto";

/** Lowercase kebab slug; empty segments dropped. */
export function slugify(text: string, max = 60): string {
  const base = text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max)
    .replace(/-+$/g, "");
  return base || "idea";
}

export function shortHash(input: string, len = 6): string {
  return createHash("sha256").update(input).digest("hex").slice(0, len);
}

/** Stable slug for auto-collected rows (title stem + short hash of canonical URL). */
export function ideaSlug(topic: string, dedupeKey: string): string {
  return `${slugify(topic, 48)}-${shortHash(dedupeKey, 4)}`;
}
