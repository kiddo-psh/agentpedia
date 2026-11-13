import Link from "next/link";
import { CategoryChips, WithIndex } from "@/components/SiteIndex";
import { CATEGORY_LABEL, DIFFICULTY_LABEL } from "@/content/labels";
import { listArticles } from "@/content/loader";
import type { ArticleMeta, Category } from "@/content/schema";
import { ArticleList } from "./ArticleList";

/** A quiet wash per category stands in for cover art until articles have images of their own. */
const COVER: Record<Category, string> = {
  people: "from-[#d7e3ff] to-[#f1e6ff] dark:from-[#1b2335] dark:to-[#271d33]",
  trends: "from-[#ffe2d2] to-[#fff1c2] dark:from-[#33231b] dark:to-[#2f2a17]",
  startup: "from-[#d3f3e6] to-[#dcefff] dark:from-[#16291f] dark:to-[#172533]",
  security: "from-[#e9e9e9] to-[#fde0e0] dark:from-[#202020] dark:to-[#331c1c]",
};

export default function Home() {
  const articles = listArticles();

  return (
    <WithIndex articles={articles} active="all">
      <section className="pt-2">
        <p className="text-[13px] font-medium text-muted">AI 에이전트 백과사전</p>
        <h1 className="mt-3 max-w-[14em] text-4xl leading-[1.12] font-medium tracking-[-0.035em] sm:text-6xl">
          읽고, 내 프로젝트에 바로 적용하세요
        </h1>
        <p className="mt-5 max-w-[34em] text-lg leading-relaxed text-muted">
          에이전트 시대를 이끄는 사람과 사례를 정리했습니다. 기사마다 진단 프롬프트와 적용 키트가 있어, 에이전트가
          MCP로 바로 가져다 씁니다.
        </p>
        <div className="mt-7 flex flex-wrap gap-2.5">
          <Link
            href="/connect"
            className="inline-flex h-10 items-center rounded-full bg-foreground px-5 text-sm font-medium text-background hover:opacity-85"
          >
            에이전트 연결하기
          </Link>
          <a
            href="#articles"
            className="inline-flex h-10 items-center rounded-full px-5 text-sm font-medium ring-1 ring-line ring-inset hover:bg-soft"
          >
            모든 기사 보기
          </a>
        </div>
      </section>

      {articles.length > 0 && <Featured articles={articles.slice(0, 3)} />}

      <section id="articles" className="scroll-mt-24" aria-labelledby="articles-title">
        <div className="mt-20 mb-5 flex flex-wrap items-baseline justify-between gap-4">
          <h2 id="articles-title" className="text-2xl font-semibold tracking-tight">
            모든 기사
          </h2>
          <CategoryChips articles={articles} active="all" />
        </div>
        <ArticleList articles={articles} />
      </section>
    </WithIndex>
  );
}

function Featured({ articles }: { articles: ArticleMeta[] }) {
  return (
    <section aria-labelledby="featured-title">
      <h2 id="featured-title" className="mt-20 mb-5 text-2xl font-semibold tracking-tight">
        새로 올라온 기사
      </h2>
      <ul className="grid gap-5 sm:grid-cols-3">
        {articles.map((a) => (
          <li key={a.slug}>
            <Link href={`/a/${a.slug}`} className="group block">
              <div
                className={`flex aspect-[16/7] items-end rounded-2xl bg-linear-135 p-4 text-[13px] font-medium text-foreground/70 sm:aspect-[16/10] ${COVER[a.category]}`}
              >
                {CATEGORY_LABEL[a.category]}
              </div>
              <p className="mt-4 text-[13px] font-medium text-muted">
                {DIFFICULTY_LABEL[a.difficulty]} · 적용 {a.apply.time}
              </p>
              <h3 className="mt-1.5 text-[19px] leading-snug font-semibold tracking-tight group-hover:underline group-hover:decoration-1 group-hover:underline-offset-4">
                {a.title}
              </h3>
              <p className="mt-1.5 line-clamp-2 text-[14.5px] leading-relaxed text-muted">{a.summary}</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
