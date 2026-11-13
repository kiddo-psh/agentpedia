import type { GlossaryEntry } from "@/content/schema";

/**
 * Terms the article marks with <Term>, folded after the body. Each term already opens its
 * definition in place, so the list stays closed until a reader wants the whole set.
 */
export function GlossaryList({ terms }: { terms: GlossaryEntry[] }) {
  if (terms.length === 0) return null;
  return (
    <details className="group mt-10 rounded-xl border border-foreground/10 text-sm">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-muted hover:text-foreground">
        <span className="inline-block transition-transform group-open:rotate-90">▸</span>
        <span className="font-semibold">이 글의 용어 {terms.length}개</span>
        <span className="truncate">· {terms.map((t) => t.term).join(", ")}</span>
      </summary>
      <dl className="grid gap-3 border-t border-foreground/10 px-4 py-4">
        {terms.map((t) => (
          <div key={t.id}>
            <dt className="font-semibold">
              {t.term}
              {t.en && <span className="ml-1.5 font-normal text-muted">{t.en}</span>}
            </dt>
            <dd className="mt-0.5 leading-relaxed text-muted">{t.definition}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
