"use server";

import { refresh } from "next/cache";
import { headers } from "next/headers";
import { getAgent } from "@/content/agents";
import { getDb } from "@/db/client";
import { getSession } from "@/lib/auth";
import { reviewHit, reviewRateLimitError } from "./guard";
import { createReview, deleteReview, setReviewHelpful } from "./service";

export type FormState = { error?: string; savedAt?: number };

async function requireUser(): Promise<{ userId: string } | { error: string }> {
  const requestHeaders = await headers();
  const session = await getSession(requestHeaders);
  if (!session) return { error: "로그인이 필요합니다." };
  const limited = await reviewRateLimitError(requestHeaders, reviewHit());
  if (limited) return { error: limited };
  return { userId: session.user.id };
}

export async function postReview(_prev: FormState, form: FormData): Promise<FormState> {
  const actor = await requireUser();
  if ("error" in actor) return { error: actor.error };

  const agentSlug = String(form.get("agentSlug") ?? "");
  if (!getAgent(agentSlug)) return { error: "에이전트를 찾을 수 없습니다." };

  const again = form.get("wouldUseAgain");
  if (again !== "1" && again !== "0") return { error: "다시 쓸 의향을 선택하세요." };

  const result = await createReview(await getDb(), {
    agentSlug,
    userId: actor.userId,
    model: String(form.get("model") ?? ""),
    taskType: String(form.get("taskType") ?? ""),
    stack: String(form.get("stack") ?? ""),
    rating: Number(form.get("rating")),
    wouldUseAgain: again === "1",
    body: String(form.get("body") ?? ""),
    usedSince: String(form.get("usedSince") ?? ""),
  });
  if (!result.ok) return { error: result.error };

  refresh();
  return { savedAt: Date.now() };
}

export async function removeReview(form: FormData): Promise<void> {
  const actor = await requireUser();
  if ("error" in actor) return;
  const result = await deleteReview(await getDb(), { id: String(form.get("id") ?? ""), userId: actor.userId });
  if (result.ok) refresh();
}

export async function voteReviewHelpful(form: FormData): Promise<void> {
  const actor = await requireUser();
  if ("error" in actor) return;
  const result = await setReviewHelpful(await getDb(), {
    userId: actor.userId,
    reviewId: String(form.get("reviewId") ?? ""),
    helpful: form.get("helpful") === "1",
  });
  if (result.ok) refresh();
}
