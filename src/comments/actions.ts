"use server";

import { refresh } from "next/cache";
import { headers } from "next/headers";
import { getDb } from "@/db/client";
import { getSession } from "@/lib/auth";
import { createComment, deleteComment } from "./service";
import { commentSlugError } from "./target";

export type FormState = { error?: string; savedAt?: number };

export async function postComment(_prev: FormState, form: FormData): Promise<FormState> {
  const session = await getSession(await headers());
  if (!session) return { error: "로그인이 필요합니다." };

  const articleSlug = String(form.get("slug") ?? "");
  const slugError = commentSlugError(articleSlug);
  if (slugError) return { error: slugError };

  const result = await createComment(await getDb(), {
    articleSlug,
    userId: session.user.id,
    body: String(form.get("body") ?? ""),
    parentId: (form.get("parentId") as string | null) || null,
    citationQuote: String(form.get("citationQuote") ?? "") || null,
  });
  if (!result.ok) return { error: result.error };

  refresh();
  return { savedAt: Date.now() };
}

export async function removeComment(form: FormData): Promise<void> {
  const session = await getSession(await headers());
  if (!session) return;
  await deleteComment(await getDb(), { id: String(form.get("id") ?? ""), userId: session.user.id });
  refresh();
}
