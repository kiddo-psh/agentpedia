import Link from "next/link";
import { articleListHref, type ArticleSort } from "@/content/articleList";

const SORT_OPTIONS: { value: ArticleSort; label: string }[] = [
  { value: "newest", label: "최신순" },
  { value: "likes", label: "좋아요순" },
];

/** Sort chips for the 전체 list. Changing sort returns to page 1. */
export function ArticleSortControls({
  basePath,
  sort,
}: {
  basePath: string;
  sort: ArticleSort;
}) {
  return (
    <nav aria-label="정렬" className="flex flex-wrap gap-1.5 text-[13.5px]">
      {SORT_OPTIONS.map((o) => (
        <Link
          key={o.value}
          href={articleListHref(basePath, { sort: o.value })}
          aria-current={o.value === sort ? "page" : undefined}
          className="inline-flex h-8 items-center rounded-full px-3.5 text-muted ring-1 ring-line ring-inset hover:text-foreground aria-[current=page]:bg-foreground aria-[current=page]:text-background aria-[current=page]:ring-0"
        >
          {o.label}
        </Link>
      ))}
    </nav>
  );
}

export function ArticlePagination({
  basePath,
  sort,
  page,
  pageCount,
}: {
  basePath: string;
  sort?: ArticleSort;
  page: number;
  pageCount: number;
}) {
  if (pageCount <= 1) return null;

  const prev = page > 1 ? articleListHref(basePath, { sort, page: page - 1 }) : null;
  const next = page < pageCount ? articleListHref(basePath, { sort, page: page + 1 }) : null;

  return (
    <nav
      aria-label="페이지"
      className="mt-10 flex items-center justify-between gap-4 border-t border-line pt-5 text-sm text-muted"
    >
      {prev ? (
        <Link href={prev} className="font-medium text-foreground hover:underline hover:underline-offset-4">
          이전
        </Link>
      ) : (
        <span aria-hidden className="opacity-40">
          이전
        </span>
      )}
      <p>
        <span className="font-medium text-foreground">{page}</span>
        <span aria-hidden> / </span>
        <span className="sr-only">중 </span>
        {pageCount}
      </p>
      {next ? (
        <Link href={next} className="font-medium text-foreground hover:underline hover:underline-offset-4">
          다음
        </Link>
      ) : (
        <span aria-hidden className="opacity-40">
          다음
        </span>
      )}
    </nav>
  );
}
