import type { Article } from "@/content/schema";

const ROWS = [
  ["what", "무슨 일"],
  ["why", "왜 중요한가"],
  ["action", "지금 할 수 있는 일"],
] as const;

/**
 * The one summary above the story. `keyIdeas` stay in MCP responses only: on the page
 * they repeated this brief and the body's <KeyIdea> box.
 */
export function ArticleBrief({ article }: { article: Article }) {
  const { brief } = article;
  return (
    <section className="mb-12 rounded-xl bg-foreground/[.03] p-6" aria-labelledby="brief">
      <h2 id="brief" className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">
        30초 요약
      </h2>
      <dl className="grid gap-3 sm:grid-cols-[8.5rem_1fr] sm:gap-x-4">
        {ROWS.map(([key, label]) => (
          <div key={key} className="contents">
            <dt className="text-sm font-semibold text-accent sm:pt-0.5">{label}</dt>
            <dd className="mb-2 leading-relaxed sm:mb-0">
              {brief[key]}
              {key === "action" && (
                <a href="#kit" className="ml-2 whitespace-nowrap text-sm text-accent underline underline-offset-2">
                  적용 방법 보기 ↓
                </a>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
