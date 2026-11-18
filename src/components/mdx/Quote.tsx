import type { ComponentProps, ReactNode } from "react";
import { sourceUrlAt } from "@/content/links";
import type { Source } from "@/content/schema";

export function EditorialQuote({ children, ...props }: ComponentProps<"blockquote">) {
  return (
    <blockquote {...props} className="editorial-quote">
      <span aria-hidden="true" className="mb-1 block h-8 select-none font-[Georgia,serif] text-[3.5rem] leading-none">“</span>
      {children}
    </blockquote>
  );
}

/**
 * The validator guarantees `source` names a declared source, so the lookup
 * cannot miss for content that passed the build.
 */
export function makeQuote(sources: Source[]) {
  const byId = new Map(sources.map((s) => [s.id, s]));

  return function Quote({ source, at, children }: { source: string; at?: string; children: ReactNode }) {
    const s = byId.get(source)!;
    return (
      <figure className="not-prose my-10 text-center">
        <EditorialQuote>{children}</EditorialQuote>
        <figcaption className="mt-3 text-xs leading-relaxed text-muted">
          {s.author} ·{" "}
          <a href={sourceUrlAt(s, at)} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-foreground">
            {s.title}
            {at && ` (${at})`}
          </a>
        </figcaption>
      </figure>
    );
  };
}
