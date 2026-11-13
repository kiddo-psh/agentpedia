import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { ApplyRail } from "@/components/ApplyRail";
import { ArticleBrief } from "@/components/ArticleBrief";
import { ArticleTracking } from "@/components/ArticleTracking";
import { GlossaryList } from "@/components/GlossaryList";
import { KitSection } from "@/components/KitSection";
import { PersonCard } from "@/components/PersonCard";
import { RelatedArticles } from "@/components/RelatedArticles";
import { ShareButton } from "@/components/ShareButton";
import { SourceAge } from "@/components/SourceAge";
import { Comments } from "@/components/comments/Comments";
import { LikeButton, LikeButtonSkeleton } from "@/components/likes/LikeButton";
import { ArticleBody } from "@/components/mdx/ArticleBody";
import { CATEGORY_LABEL, DIFFICULTY_LABEL, formatDate, newestPublished, sourcePeriod } from "@/content/labels";
import { getArticle, getRelatedGraph, listArticles } from "@/content/loader";
import type { Article } from "@/content/schema";

// Cache Components requires at least one param; a placeholder 404s when nothing is published.
const PLACEHOLDER = "__none__";

export function generateStaticParams() {
  const slugs = listArticles().map((a) => ({ slug: a.slug }));
  return slugs.length > 0 ? slugs : [{ slug: PLACEHOLDER }];
}

export async function generateMetadata({ params }: PageProps<"/a/[slug]">): Promise<Metadata> {
  const article = getArticle((await params).slug);
  if (!article) return {};
  return {
    title: article.title,
    description: article.summary,
    openGraph: {
      type: "article",
      siteName: "Agentpedia",
      locale: "ko_KR",
      title: article.title,
      description: article.summary,
      url: `/a/${article.slug}`,
    },
    twitter: { card: "summary", title: article.title, description: article.summary },
  };
}

// params is URL data: keep it behind Suspense so client navigation can show the shell instantly.
export default function ArticlePage({ params }: PageProps<"/a/[slug]">) {
  return (
    <Suspense fallback={<ArticleSkeleton />}>
      {params.then(({ slug }) => {
        if (!getArticle(slug)) notFound();
        return (
          <ArticleView
            slug={slug}
            likes={
              // The like count is request-time; a fixed-size placeholder keeps the row from shifting.
              <Suspense fallback={<LikeButtonSkeleton />}>
                <LikeButton slug={slug} />
              </Suspense>
            }
            comments={
              <Suspense fallback={<p className="text-sm text-muted">토론을 불러오는 중…</p>}>
                <Comments slug={slug} />
              </Suspense>
            }
          />
        );
      })}
    </Suspense>
  );
}

function ArticleSkeleton() {
  return (
    <div className="mx-auto max-w-[720px] animate-pulse" aria-busy="true" aria-label="기사를 불러오는 중">
      <div className="mb-5 h-4 w-40 rounded bg-soft" />
      <div className="mb-3 h-11 w-full rounded bg-soft" />
      <div className="mb-10 h-11 w-2/3 rounded bg-soft" />
      <div className="h-48 rounded-2xl bg-soft" />
    </div>
  );
}

/** Up to two people get cards; a study with many authors gets one line so the brief stays in view. */
function People({ persons }: { persons: Article["persons"] }) {
  if (persons.length <= 2) {
    return (
      <div className="mt-6 flex flex-wrap gap-x-8 gap-y-4">
        {persons.map((p) => (
          <PersonCard key={p.id} person={p} />
        ))}
      </div>
    );
  }
  return (
    <p className="mt-5 text-sm text-muted">
      {persons.map((p, i) => (
        <span key={p.id}>
          {i > 0 && " · "}
          <span className="font-medium text-foreground" title={p.role}>
            {p.nameKo}
          </span>
        </span>
      ))}
    </p>
  );
}

/**
 * Cached so the article, MDX compile included, lands in the prerendered page instead of
 * rendering per request. Request-time parts arrive as `likes` and `comments` pass-through slots.
 */
async function ArticleView({ slug, likes, comments }: { slug: string; likes: ReactNode; comments: ReactNode }) {
  "use cache";
  const article = getArticle(slug)!;
  const related = getRelatedGraph(article);
  const sections: [string, string][] = [
    ["brief", "30초 요약"],
    ["kit", "적용 키트"],
    ...(related.related.length > 0 ? [["related", "관련 기사"] as [string, string]] : []),
    ["comments", "토론"],
    ["sources", "출처"],
  ];

  return (
    <ArticleTracking slug={article.slug}>
    <div className="mx-auto max-w-[720px] xl:grid xl:max-w-none xl:grid-cols-[minmax(0,720px)_260px] xl:justify-center xl:gap-20">
    <article className="min-w-0">
      <header className="mb-10">
        <nav className="mb-5 text-sm text-muted" aria-label="위치">
          <Link href="/" className="hover:text-foreground">
            기사
          </Link>
          <span className="mx-1.5" aria-hidden>
            ›
          </span>
          <Link href={`/c/${article.category}`} className="hover:text-foreground">
            {CATEGORY_LABEL[article.category]}
          </Link>
        </nav>
        <h1 className="text-3xl leading-[1.22] font-medium tracking-[-0.035em] sm:text-[44px]">{article.title}</h1>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-muted">
          <span className="font-medium text-foreground">{DIFFICULTY_LABEL[article.difficulty]}</span>
          <span>·</span>
          <span title="출처가 나온 시점입니다">{sourcePeriod(article.sources)}</span>
          <SourceAge newestIso={newestPublished(article.sources).toISOString()} />
          {article.draft && (
            <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
              초안 · 검수 전
            </span>
          )}
        </div>
        {/* `summary` feeds the list and metadata; here the 30-second brief below says the same thing. */}
        {article.persons.length > 0 && <People persons={article.persons} />}
      </header>

      <ArticleBrief article={article} />

      <ArticleBody article={article} />
      <GlossaryList terms={article.terms} />

      {/* Reactions come once the reader has finished the article. */}
      <div className="mt-14 flex items-center justify-center gap-2">
        {likes}
        <ShareButton slug={article.slug} title={article.title} text={article.summary} />
      </div>

      <KitSection article={article} />

      <RelatedArticles graph={related} />

      <section id="comments" className="mt-24 scroll-mt-24" aria-labelledby="comments-title">
        {comments}
      </section>

      <section className="mt-24 scroll-mt-24" id="sources" aria-labelledby="sources-title">
        <h2 id="sources-title" className="mb-4 text-[22px] font-semibold tracking-tight">
          출처
        </h2>
        <ul className="border-b border-line text-sm">
          {article.sources.map((s) => (
            <li key={s.id} className="border-t border-line py-3 leading-relaxed">
              <a href={s.url} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                {s.title}
              </a>
              <span className="text-muted">
                {" "}
                · {s.author} ·{" "}
                {s.publishedAt ? formatDate(s.publishedAt) : `날짜 없음 (${formatDate(s.accessedAt!)} 열람)`}
                {s.publishedAt && s.dateNote && <span title={s.dateNote}> (날짜는 원문 밖에서 확인)</span>}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </article>
    <ApplyRail article={article} sections={sections} />
    </div>
    </ArticleTracking>
  );
}
