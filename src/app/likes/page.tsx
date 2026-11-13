import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { listArticles } from "@/content/loader";
import { getDb } from "@/db/client";
import { getSession } from "@/lib/auth";
import { listLikedSlugs } from "@/likes/service";
import { ArticleList } from "../ArticleList";

export const metadata: Metadata = { title: "좋아요한 글" };

export default function LikesPage() {
  return (
    <>
      <h1 className="mb-8 text-3xl font-bold tracking-tight">좋아요한 글</h1>
      <Suspense fallback={<p className="text-sm text-muted">불러오는 중…</p>}>
        <LikedArticles />
      </Suspense>
    </>
  );
}

async function LikedArticles() {
  await connection();
  const session = await getSession(await headers());
  if (!session) {
    return (
      <p className="rounded-lg border border-dashed border-foreground/20 px-4 py-3 text-sm text-muted">
        <Link href={`/login?next=${encodeURIComponent("/likes")}`} className="underline">
          로그인
        </Link>
        하면 좋아요한 글을 모아볼 수 있습니다.
      </p>
    );
  }

  const slugs = await getDb().then((db) => listLikedSlugs(db, session.user.id));
  // listArticles drops drafts and deleted articles; keep the most-recently-liked order.
  const bySlug = new Map(listArticles().map((a) => [a.slug, a]));
  const articles = slugs.flatMap((s) => bySlug.get(s) ?? []);

  if (articles.length === 0) {
    return (
      <p className="py-16 text-center text-muted">
        아직 좋아요한 글이 없습니다.{" "}
        <Link href="/" className="underline">
          기사 둘러보기
        </Link>
      </p>
    );
  }
  return <ArticleList articles={articles} />;
}
