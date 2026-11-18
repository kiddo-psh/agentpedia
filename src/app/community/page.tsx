import type { Metadata } from "next";
import Link from "next/link";
import { cacheLife, cacheTag, prefetch } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { listPostPreviews } from "@/community/service";
import { listArticleOptions } from "@/content/loader";
import { getDb } from "@/db/client";
import { getRenderSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "커뮤니티",
  description: "에이전트로 만든 것, 적용해 본 이야기를 공유하세요.",
};

const timeFormat = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "medium",
  timeZone: "Asia/Seoul",
});

export default function CommunityPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4 pt-2">
        <div>
          <h1 className="text-4xl font-medium tracking-[-0.03em]">커뮤니티</h1>
          <p className="mt-2 text-sm text-muted">
            에이전트 작업, 키트 적용 후기, 배운 점을 한곳에서 나눕니다.
          </p>
        </div>
        <Suspense fallback={<span className="inline-block h-10 w-24" aria-hidden />}>
          <NewPostLink />
        </Suspense>
      </header>
      <Suspense fallback={<p className="text-sm text-muted">불러오는 중…</p>}>
        <PostList />
      </Suspense>
    </div>
  );
}

async function NewPostLink() {
  await connection();
  let session: Awaited<ReturnType<typeof getRenderSession>> = null;
  try {
    session = await getRenderSession();
  } catch (err) {
    console.error("[community] session failed on list", err);
  }
  if (!session) {
    return (
      <Link
        href={`/login?next=${encodeURIComponent("/community/new")}`}
        className="inline-flex h-10 items-center rounded-full bg-foreground px-4 text-sm font-medium text-background hover:opacity-85"
      >
        로그인하고 글쓰기
      </Link>
    );
  }
  return (
    <Link
      href="/community/new"
      className="inline-flex h-10 items-center rounded-full bg-foreground px-4 text-sm font-medium text-background hover:opacity-85"
    >
      글쓰기
    </Link>
  );
}

async function loadPostPreviews() {
  "use cache";
  cacheLife("seconds");
  cacheTag("community-post-list");
  const posts = await listPostPreviews(await getDb());
  const titles = posts.some((post) => post.articleSlug)
    ? new Map(listArticleOptions().map((article) => [article.slug, article.title]))
    : null;
  return posts.map((post) => ({
    ...post,
    articleTitle: post.articleSlug && (titles?.get(post.articleSlug) ?? post.articleSlug),
  }));
}

async function PostList() {
  await prefetch();
  let posts: Awaited<ReturnType<typeof loadPostPreviews>>;
  try {
    posts = await loadPostPreviews();
  } catch (err) {
    unstable_rethrow(err);
    console.error("[community] failed to list posts", err);
    return (
      <p className="rounded-xl bg-soft px-5 py-4 text-sm text-muted">
        지금은 글을 불러올 수 없습니다. 잠시 후 다시 시도해 주세요.
      </p>
    );
  }

  if (posts.length === 0) {
    return (
      <p className="py-16 text-center text-muted">
        아직 글이 없습니다. 첫 이야기를 남겨 보세요.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-line border-t border-line">
      {posts.map((p) => (
        <li key={p.id}>
          <Link href={`/community/${p.id}`} prefetch={true} className="block py-5 hover:bg-soft/60">
            <h2 className="text-lg font-medium tracking-tight">{p.title}</h2>
            <p className="mt-1 line-clamp-2 text-sm text-muted">{p.preview}</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-2 text-xs text-muted">
              <span className="font-medium text-foreground">{p.authorName}</span>
              <time dateTime={p.createdAt.toISOString()}>{timeFormat.format(p.createdAt)}</time>
              {p.articleTitle && (
                <>
                  <span aria-hidden>·</span>
                  <span>{p.articleTitle}</span>
                  {p.linkKit && <span>· 키트</span>}
                </>
              )}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
