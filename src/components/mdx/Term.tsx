import type { ReactNode } from "react";
import type { GlossaryEntry } from "@/content/schema";

export const termAnchor = (id: string) => `term-${id}`;

/**
 * Inline glossary mark. The definition shows on hover and the link jumps to the glossary
 * beside (desktop) or after (mobile) the article. The validator guarantees `id` exists.
 */
export function makeTerm(terms: GlossaryEntry[]) {
  const byId = new Map(terms.map((t) => [t.id, t]));

  return function Term({ id, children }: { id: string; children: ReactNode }) {
    const t = byId.get(id)!;
    return (
      <a
        href={`#${termAnchor(id)}`}
        title={t.definition}
        className="cursor-help underline decoration-accent/60 decoration-dotted underline-offset-4 hover:decoration-accent"
      >
        {children}
      </a>
    );
  };
}
