import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { PostForm } from "@/components/community/PostForm";
import { listArticleOptions } from "@/content/loader";
import { getRenderSession } from "@/lib/auth";

export const metadata: Metadata = { title: "글쓰기 · 커뮤니티" };

export default function NewCommunityPostPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <nav className="mb-5 pt-2 text-sm text-muted" aria-label="위치">
        <Link href="/community" className="hover:text-foreground">
          커뮤니티
        </Link>
        <span className="mx-1.5" aria-hidden>
          ›
        </span>
        <span className="text-foreground">글쓰기</span>
      </nav>
      <h1 className="mb-8 text-4xl font-medium tracking-[-0.03em]">글쓰기</h1>
      <Suspense fallback={<p className="text-sm text-muted">불러오는 중…</p>}>
        <NewPostGate />
      </Suspense>
    </div>
  );
}

async function NewPostGate() {
  await connection();
  let session: Awaited<ReturnType<typeof getRenderSession>> = null;
  try {
    session = await getRenderSession();
  } catch (err) {
    console.error("[community] session failed on new", err);
  }

  if (!session) {
    return (
      <p className="rounded-xl bg-soft px-5 py-4 text-sm text-muted">
        <Link
          href={`/login?next=${encodeURIComponent("/community/new")}`}
          className="font-medium text-foreground underline underline-offset-4"
        >
          로그인
        </Link>
        하면 커뮤니티에 글을 올릴 수 있습니다.
      </p>
    );
  }

  return <PostForm articles={listArticleOptions()} />;
}
