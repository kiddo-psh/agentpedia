import Link from "next/link";
import { SourceAge } from "@/components/SourceAge";
import { CATEGORY_LABEL, DIFFICULTY_LABEL, formatMonth, newestPublished } from "@/content/labels";
import type { ArticleMeta } from "@/content/schema";

/** `titleAs` follows the page outline: h3 under a section heading, h2 directly under the page h1. */
export function ArticleList({ articles, titleAs: Title = "h2" }: { articles: ArticleMeta[]; titleAs?: "h2" | "h3" }) {
  if (articles.length === 0) {
    return <p className="py-16 text-center text-muted">아직 공개된 기사가 없습니다.</p>;
  }
  return (
    <ul className="border-b border-line">
      {articles.map((a) => (
        <li key={a.slug} className="border-t border-line">
          <Link href={`/a/${a.slug}`} className="group grid gap-x-8 gap-y-2 py-7 sm:grid-cols-[minmax(0,1fr)_auto]">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-[13px] font-medium text-muted">
                {CATEGORY_LABEL[a.category]}
                {a.draft && (
                  <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-amber-700 dark:text-amber-400">초안</span>
                )}
              </p>
              <Title className="mt-1 text-lg leading-snug font-semibold tracking-tight group-hover:underline group-hover:decoration-1 group-hover:underline-offset-4">
                {a.title}
              </Title>
              <p className="mt-1.5 line-clamp-2 text-[14.5px] leading-relaxed text-muted">{a.summary}</p>
            </div>
            <dl className="flex flex-wrap gap-x-3 text-[13px] text-muted sm:flex-col sm:items-end sm:text-right sm:leading-7">
              <dt className="sr-only">난이도</dt>
              <dd className="font-medium text-foreground">{DIFFICULTY_LABEL[a.difficulty]}</dd>
              <dt className="sr-only">적용 시간</dt>
              <dd>적용 {a.apply.time}</dd>
              <dt className="sr-only">출처 시점</dt>
              <dd className="flex gap-1.5">
                출처 {formatMonth(newestPublished(a.sources))}
                <SourceAge newestIso={newestPublished(a.sources).toISOString()} staleOnly />
              </dd>
            </dl>
          </Link>
        </li>
      ))}
    </ul>
  );
}
