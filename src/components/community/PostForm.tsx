"use client";

import { useActionState, useState } from "react";
import { createCommunityPost, type PostFormState } from "@/community/actions";
import { MAX_POST_BODY_LENGTH, MAX_POST_TITLE_LENGTH } from "@/community/limits";

export type ArticleOption = { slug: string; title: string; hasKit: boolean };

export function PostForm({
  articles,
  initialArticleSlug = "",
}: {
  articles: ArticleOption[];
  initialArticleSlug?: string;
}) {
  const [state, action, pending] = useActionState<PostFormState, FormData>(createCommunityPost, {});
  const [articleSlug, setArticleSlug] = useState(initialArticleSlug);
  const selected = articles.find((a) => a.slug === articleSlug);
  const canLinkKit = Boolean(selected?.hasKit);

  return (
    <form action={action} className="grid gap-5">
      <label className="grid gap-1.5">
        <span className="text-sm font-medium">제목</span>
        <input
          name="title"
          required
          maxLength={MAX_POST_TITLE_LENGTH}
          placeholder="무엇을 공유하나요?"
          className="w-full rounded-xl bg-soft px-4 py-3 text-[0.95rem] outline-none focus:ring-2 focus:ring-foreground/20"
        />
      </label>

      <label className="grid gap-1.5">
        <span className="text-sm font-medium">본문</span>
        <textarea
          name="body"
          required
          maxLength={MAX_POST_BODY_LENGTH}
          rows={10}
          placeholder="에이전트로 만든 것, 적용해 본 이야기, 배운 점을 자유롭게 적어 주세요."
          className="w-full resize-y rounded-xl bg-soft px-4 py-3 text-[0.95rem] leading-relaxed outline-none focus:ring-2 focus:ring-foreground/20"
        />
      </label>

      <label className="grid gap-1.5">
        <span className="text-sm font-medium">외부 링크 <span className="font-normal text-muted">(선택, 줄바꿈으로 여러 개)</span></span>
        <textarea
          name="links"
          rows={2}
          placeholder="https://…"
          className="w-full resize-y rounded-xl bg-soft px-4 py-3 font-mono text-sm outline-none focus:ring-2 focus:ring-foreground/20"
        />
      </label>

      <label className="grid gap-1.5">
        <span className="text-sm font-medium">관련 기사 <span className="font-normal text-muted">(선택)</span></span>
        <select
          name="articleSlug"
          value={articleSlug}
          onChange={(e) => setArticleSlug(e.target.value)}
          className="w-full rounded-xl bg-soft px-4 py-3 text-[0.95rem] outline-none focus:ring-2 focus:ring-foreground/20"
        >
          <option value="">연결하지 않음</option>
          {articles.map((a) => (
            <option key={a.slug} value={a.slug}>
              {a.title}
              {a.hasKit ? " · 키트 있음" : ""}
            </option>
          ))}
        </select>
      </label>

      {canLinkKit && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="linkKit" className="size-4 rounded border-line" />
          이 기사의 적용 키트도 함께 연결
        </label>
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
        <button
          disabled={pending}
          className="inline-flex h-10 shrink-0 items-center rounded-full bg-foreground px-5 text-sm font-medium text-background hover:opacity-85 disabled:opacity-50"
        >
          {pending ? "등록 중…" : "글 올리기"}
        </button>
      </div>
    </form>
  );
}
