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
    <section className="mb-14 scroll-mt-24 rounded-2xl bg-soft px-6 pt-5 pb-2" aria-labelledby="brief">
      <h2 id="brief" className="text-[13px] font-medium text-muted">
        30초 요약
      </h2>
      <dl className="mt-1">
        {ROWS.map(([key, label]) => (
          <div key={key} className="grid gap-1 border-t border-line py-3.5 first:border-t-0 sm:grid-cols-[8.5rem_1fr] sm:gap-4">
            <dt className="text-[13px] font-medium text-muted sm:pt-0.5">{label}</dt>
            <dd className="leading-relaxed">
              {brief[key]}
              {key === "action" && (
                <a href="#kit" className="ml-2 text-sm font-medium whitespace-nowrap underline underline-offset-4">
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
