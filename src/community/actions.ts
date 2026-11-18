"use server";

import { refresh, updateTag } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getArticle } from "@/content/loader";
import { getDb } from "@/db/client";
import { getSession } from "@/lib/auth";
import {
  createPost,
  createPostComment,
  deletePost,
  deletePostComment,
} from "./service";

export type PostFormState = { error?: string };
export type CommentFormState = { error?: string; savedAt?: number };

function parseLinksField(raw: string): string[] {
  return raw
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function createCommunityPost(
  _prev: PostFormState,
  form: FormData,
): Promise<PostFormState> {
  const session = await getSession(await headers());
  if (!session) return { error: "로그인이 필요합니다." };

  const articleSlug = String(form.get("articleSlug") ?? "").trim() || null;
  const linkKit = form.get("linkKit") === "on" || form.get("linkKit") === "true";
  let articleHasKit = false;
  if (articleSlug) {
    const article = getArticle(articleSlug);
    if (!article) return { error: "기사를 찾을 수 없습니다." };
    articleHasKit = article.kit.length > 0;
  }

  const result = await createPost(await getDb(), {
    userId: session.user.id,
    title: String(form.get("title") ?? ""),
    body: String(form.get("body") ?? ""),
    links: parseLinksField(String(form.get("links") ?? "")),
    articleSlug,
    linkKit,
    articleHasKit,
  });
  if (!result.ok) return { error: result.error };

  updateTag("community-post-list");
  redirect(`/community/${result.id}`);
}

export async function removeCommunityPost(form: FormData): Promise<void> {
  const session = await getSession(await headers());
  if (!session) return;
  const result = await deletePost(await getDb(), { id: String(form.get("id") ?? ""), userId: session.user.id });
  if (result.ok) updateTag("community-post-list");
  redirect("/community");
}

export async function postCommunityComment(
  _prev: CommentFormState,
  form: FormData,
): Promise<CommentFormState> {
  const session = await getSession(await headers());
  if (!session) return { error: "로그인이 필요합니다." };

  const postId = String(form.get("postId") ?? "");
  const result = await createPostComment(await getDb(), {
    postId,
    userId: session.user.id,
    body: String(form.get("body") ?? ""),
    parentId: (form.get("parentId") as string | null) || null,
  });
  if (!result.ok) return { error: result.error };

  refresh();
  return { savedAt: Date.now() };
}

export async function removeCommunityComment(form: FormData): Promise<void> {
  const session = await getSession(await headers());
  if (!session) return;
  await deletePostComment(await getDb(), {
    id: String(form.get("id") ?? ""),
    userId: session.user.id,
  });
  refresh();
}
