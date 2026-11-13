"use server";

import { refresh } from "next/cache";
import { headers } from "next/headers";
import { getArticle } from "@/content/loader";
import { getDb } from "@/db/client";
import { getSession } from "@/lib/auth";
import { getLikeState, setLike, type LikeState } from "./service";

export async function setArticleLike(articleSlug: string, liked: boolean): Promise<LikeState | { error: string }> {
  const session = await getSession(await headers());
  if (!session) return { error: "로그인이 필요합니다." };
  if (!getArticle(articleSlug)) return { error: "기사를 찾을 수 없습니다." };

  const db = await getDb();
  await setLike(db, { userId: session.user.id, articleSlug, liked });
  refresh();
  return getLikeState(db, articleSlug, session.user.id);
}
