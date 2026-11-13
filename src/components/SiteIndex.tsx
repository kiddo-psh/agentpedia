import Link from "next/link";
import type { ReactNode } from "react";
import { CATEGORY_LABEL } from "@/content/labels";
import type { ArticleMeta, Category } from "@/content/schema";

export type CategoryFilter = Category | "all";

export const categoryHref = (c: CategoryFilter) => (c === "all" ? "/" : `/c/${c}`);
export const categoryLabel = (c: CategoryFilter) => (c === "all" ? "전체" : CATEGORY_LABEL[c]);

/** "all" first, then each category that has at least one article, with its count. */
export function categoryCounts(articles: ArticleMeta[]): [CategoryFilter, number][] {
  const present = (Object.keys(CATEGORY_LABEL) as Category[])
    .map((c) => [c, articles.filter((a) => a.category === c).length] as [Category, number])
    .filter(([, n]) => n > 0);
  return [["all", articles.length], ...present];
}

/** Left-hand index for wide screens; narrow screens use the category chips in the page instead. */
export function WithIndex({
  articles,
  active,
  children,
}: {
  articles: ArticleMeta[];
  active: CategoryFilter;
  children: ReactNode;
}) {
  return (
    <div className="lg:grid lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-14">
      <aside className="sticky top-24 self-start pt-2 text-sm max-lg:hidden" aria-label="분류">
        <p className="mb-2 text-xs font-medium text-muted">분류</p>
        <ul>
          {categoryCounts(articles).map(([c, n]) => (
            <li key={c}>
              <Link
                href={categoryHref(c)}
                aria-current={c === active ? "page" : undefined}
                className="-mx-2.5 flex justify-between rounded-lg px-2.5 py-1.5 text-muted hover:text-foreground aria-[current=page]:bg-soft aria-[current=page]:font-medium aria-[current=page]:text-foreground"
              >
                {categoryLabel(c)}
                <span className="text-xs opacity-70">{n}</span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-8 mb-2 text-xs font-medium text-muted">시작하기</p>
        <Link href="/connect" className="-mx-2.5 block rounded-lg px-2.5 py-1.5 text-muted hover:text-foreground">
          에이전트 연결
        </Link>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function CategoryChips({ articles, active }: { articles: ArticleMeta[]; active: CategoryFilter }) {
  return (
    <nav className="flex flex-wrap gap-1.5 lg:hidden" aria-label="분류">
      {categoryCounts(articles).map(([c]) => (
        <Link
          key={c}
          href={categoryHref(c)}
          aria-current={c === active ? "page" : undefined}
          className="inline-flex h-8 items-center rounded-full bg-soft px-3.5 text-[13.5px] text-muted hover:text-foreground aria-[current=page]:bg-foreground aria-[current=page]:text-background"
        >
          {categoryLabel(c)}
        </Link>
      ))}
    </nav>
  );
}
