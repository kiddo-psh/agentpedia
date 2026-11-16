"use server";

import { headers } from "next/headers";
import { getArticle } from "@/content/loader";
import { getDb } from "@/db/client";
import { visitorHash } from "@/events/record";
import { getSession } from "@/lib/auth";
import { createSuggestion } from "./service";

export type SuggestState = { error?: string; sentAt?: number };

/** No sign-in needed: anonymous readers are rate-limited by their daily visitor hash. */
export async function sendSuggestion(_prev: SuggestState, form: FormData): Promise<SuggestState> {
  const articleSlug = String(form.get("slug") ?? "");
  if (!getArticle(articleSlug)) return { error: "기사를 찾을 수 없습니다." };

  const requestHeaders = await headers();
  const session = await getSession(requestHeaders).catch(() => null);
  try {
    const result = await createSuggestion(await getDb(), {
      articleSlug,
      body: String(form.get("body") ?? ""),
      userId: session?.user.id ?? null,
      visitorHash: visitorHash(requestHeaders),
    });
    return result.ok ? { sentAt: Date.now() } : { error: result.error };
  } catch (err) {
    console.error(`[suggestions] failed to save for ${articleSlug}`, err);
    return { error: "보내지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }
}
