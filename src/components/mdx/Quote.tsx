import type { ReactNode } from "react";
import { sourceUrlAt } from "@/content/links";
import type { Source } from "@/content/schema";

/**
 * The validator guarantees `source` names a declared source, so the lookup
 * cannot miss for content that passed the build.
 */
export function makeQuote(sources: Source[]) {
  const byId = new Map(sources.map((s) => [s.id, s]));

  return function Quote({ source, at, children }: { source: string; at?: string; children: ReactNode }) {
    const s = byId.get(source)!;
    return (
      <figure className="not-prose my-12">
        <blockquote className="text-2xl leading-snug font-medium tracking-[-0.02em] sm:text-[28px] [&_p]:m-0">{children}</blockquote>
        <figcaption className="mt-4 text-sm text-muted">
          — {s.author},{" "}
          <a href={sourceUrlAt(s, at)} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-foreground">
            {s.title}
            {at && ` (${at})`}
          </a>
        </figcaption>
      </figure>
    );
  };
}
