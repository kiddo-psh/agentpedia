import type { GlossaryEntry } from "@/content/schema";
import { termAnchor } from "./mdx/termAnchor";

/** Terms the article marks with <Term>, listed after the body like footnotes. Popovers link here. */
export function GlossaryList({ terms }: { terms: GlossaryEntry[] }) {
  if (terms.length === 0) return null;
  return (
    <aside aria-labelledby="glossary" className="mt-10 rounded-xl border border-foreground/10 p-5">
      <h2 id="glossary" className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">
        이 글의 용어
      </h2>
      <dl className="grid gap-3 text-sm">
        {terms.map((t) => (
          <div
            key={t.id}
            id={termAnchor(t.id)}
            className="-mx-2 scroll-mt-8 rounded-md px-2 py-1 transition-colors target:bg-accent/10"
          >
            <dt className="font-semibold">
              {t.term}
              {t.en && <span className="ml-1.5 font-normal text-muted">{t.en}</span>}
            </dt>
            <dd className="mt-0.5 leading-relaxed text-muted">{t.definition}</dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}
