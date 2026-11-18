import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { getPost, type PostView } from "@/community/service";
import { ArticleNavLink } from "@/components/ArticleNavLink";
import { DeletePostButton } from "@/components/community/DeletePostButton";
import { PostComments } from "@/components/community/PostComments";
import { getArticle } from "@/content/loader";
import { getDb } from "@/db/client";
import { getRenderSession } from "@/lib/auth";

const timeFormat = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Seoul",
});

async function loadPost(id: string) {
  "use cache";
  cacheLife("minutes");
  const post = await getPost(await getDb(), id);
  if (post) cacheTag(`community-post-${post.id}`);
  return post;
}
type PostParams = PageProps<"/community/[id]">["params"];

export async function generateMetadata({
  params,
}: PageProps<"/community/[id]">): Promise<Metadata> {
  const { id } = await params;
  try {
    const post = await loadPost(id);
    if (!post) return { title: "커뮤니티" };
    return { title: `${post.title} · 커뮤니티`, description: post.body.slice(0, 160) };
  } catch {
    return { title: "커뮤니티" };
  }
}

export default function CommunityPostPage({ params }: PageProps<"/community/[id]">) {
  return (
    <div className="mx-auto max-w-3xl">
      <nav className="mb-5 pt-2 text-sm text-muted" aria-label="위치">
        <Link href="/community" className="hover:text-foreground">
          커뮤니티
        </Link>
        <span className="mx-1.5" aria-hidden>
          ›
        </span>
        <span className="text-foreground">글</span>
      </nav>
      <Suspense fallback={<p className="text-sm text-muted">불러오는 중…</p>}>
        <PostDetail params={params} />
      </Suspense>
      <section id="comments" className="mt-14 scroll-mt-24">
        <Suspense fallback={<p className="text-sm text-muted">댓글을 불러오는 중…</p>}>
          <PostCommentsSection params={params} />
        </Suspense>
      </section>
    </div>
  );
}

async function PostCommentsSection({ params }: { params: PostParams }) {
  const { id } = await params;
  return <PostComments postId={id} />;
}

async function OwnerControls({ post }: { post: PostView }) {
  await connection();
  const session = await getRenderSession().catch(() => null);
  return session?.user.id === post.authorId ? (
    <span className="ml-auto">
      <DeletePostButton id={post.id} />
    </span>
  ) : null;
}

async function PostDetail({ params }: { params: PostParams }) {
  const { id } = await params;
  let post: PostView | null;
  try {
    post = await loadPost(id);
  } catch (err) {
    console.error(`[community] failed to load post ${id}`, err);
    return (
      <p className="rounded-xl bg-soft px-5 py-4 text-sm text-muted">
        지금은 글을 불러올 수 없습니다.
      </p>
    );
  }
  if (!post) notFound();

  const article = post.articleSlug ? getArticle(post.articleSlug) : null;

  return (
    <article>
      <header className="mb-8">
        <h1 className="text-3xl leading-tight font-medium tracking-[-0.03em] sm:text-4xl">
          {post.title}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-x-2 text-sm text-muted">
          <span className="font-medium text-foreground">{post.authorName}</span>
          <time dateTime={post.createdAt.toISOString()}>{timeFormat.format(post.createdAt)}</time>
          <Suspense fallback={null}>
            <OwnerControls post={post} />
          </Suspense>
        </div>
      </header>

      <div className="whitespace-pre-wrap break-words text-[1.05rem] leading-relaxed">{post.body}</div>

      {(post.links.length > 0 || article) && (
        <aside className="mt-8 grid gap-2 rounded-xl bg-soft px-5 py-4 text-sm">
          {article && (
            <p>
              관련 기사:{" "}
              <ArticleNavLink
                href={`/a/${article.slug}`}
                className="font-medium text-foreground underline underline-offset-4"
              >
                {article.title}
              </ArticleNavLink>
              {post.linkKit && article.kit.length > 0 && (
                <span className="text-muted"> · 적용 키트 연결</span>
              )}
            </p>
          )}
          {post.links.map((href) => (
            <p key={href}>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all font-medium text-foreground underline underline-offset-4"
              >
                {href}
              </a>
            </p>
          ))}
        </aside>
      )}
    </article>
  );
}
