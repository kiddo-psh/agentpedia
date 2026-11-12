import type { GlossaryEntry } from "@/content/schema";
import { termAnchor } from "./mdx/Term";

/**
 * Terms the article marks with <Term>. Beside the body on wide screens (sticky in the right
 * margin); after the body otherwise, like footnotes, so the story starts first on a phone.
 * One element, so each anchor id exists once.
 */
export function GlossaryPanel({ terms }: { terms: GlossaryEntry[] }) {
  if (terms.length === 0) return null;
  return (
    <aside
      aria-labelledby="glossary"
      className="mt-10 rounded-xl border border-foreground/10 p-5 xl:absolute xl:inset-y-0 xl:left-full xl:mt-0 xl:ml-8 xl:w-60 xl:rounded-none xl:border-0 xl:border-l xl:p-0 xl:pl-5"
    >
      <div className="xl:sticky xl:top-8">
        <h2 id="glossary" className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">
          이 글의 용어
        </h2>
        <dl className="grid gap-3 text-sm">
          {terms.map((t) => (
            <div
              key={t.id}
              id={termAnchor(t.id)}
              className="scroll-mt-8 rounded-md transition-colors target:bg-accent/10 xl:-mx-2 xl:px-2 xl:py-1"
            >
              <dt className="font-semibold">
                {t.term}
                {t.en && <span className="ml-1.5 font-normal text-muted">{t.en}</span>}
              </dt>
              <dd className="mt-0.5 leading-relaxed text-muted">{t.definition}</dd>
            </div>
          ))}
        </dl>
      </div>
    </aside>
  );
}
