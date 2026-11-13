import type { Article } from "@/content/schema";

const ROWS = [
  ["what", "무슨 일"],
  ["why", "왜 중요한가"],
  ["action", "지금 할 수 있는 일"],
] as const;

/** The one summary above the story: three facts open, the key ideas folded beneath them. */
export function ArticleBrief({ article }: { article: Article }) {
  const { brief, keyIdeas } = article;
  return (
    <section className="mb-12 rounded-xl bg-foreground/[.03] p-6" aria-labelledby="brief">
      <h2 id="brief" className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">
        30초 요약
      </h2>
      <dl className="grid gap-3 sm:grid-cols-[8.5rem_1fr] sm:gap-x-4">
        {ROWS.map(([key, label]) => (
          <div key={key} className="contents">
            <dt className="text-sm font-semibold text-accent sm:pt-0.5">{label}</dt>
            <dd className="mb-2 leading-relaxed sm:mb-0">{brief[key]}</dd>
          </div>
        ))}
      </dl>
      <details className="group mt-5 border-t border-foreground/10 pt-4">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-muted hover:text-foreground">
          <span className="inline-block transition-transform group-open:rotate-90">▸</span>
          핵심 {keyIdeas.length}가지 더 보기
        </summary>
        <ol className="mt-3 grid gap-3">
          {keyIdeas.map((idea, i) => (
            <li key={i} className="flex gap-3 leading-relaxed">
              <span className="font-mono text-sm font-semibold text-accent">{String(i + 1).padStart(2, "0")}</span>
              <span>{idea}</span>
            </li>
          ))}
        </ol>
      </details>
    </section>
  );
}
