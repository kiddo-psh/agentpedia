import { TASK_TYPES, type TaskType } from "@/db/schema";
import {
  MAX_MODEL_LENGTH,
  MAX_REVIEW_BODY,
  MAX_REVIEW_LINKS,
  MAX_STACK_TAG_LENGTH,
  MAX_STACK_TAGS,
  MIN_REVIEW_BODY,
  seoulDate,
} from "./limits";

export type ReviewDraft = {
  model: string | null;
  taskType: TaskType;
  stack: string[];
  rating: number;
  wouldUseAgain: boolean;
  body: string;
  usedSince: string | null;
};

export type ReviewInput = {
  model?: string | null;
  taskType: string;
  stack?: string | null;
  rating: number;
  wouldUseAgain: boolean;
  body: string;
  usedSince?: string | null;
  now?: Date;
};

const LINK_RE = /https?:\/\/[^\s)]+/gi;

export function isTaskType(value: string): value is TaskType {
  return (TASK_TYPES as readonly string[]).includes(value);
}

export function linkCount(body: string): number {
  return body.match(LINK_RE)?.length ?? 0;
}

function normalizeMultiline(raw: string): string {
  return raw.replace(/\r\n?/g, "\n").trim();
}

export function parseStack(raw: string): { ok: true; stack: string[] } | { ok: false; error: string } {
  const seen = new Set<string>();
  const stack: string[] = [];
  for (const part of raw.split(/[,，]/)) {
    const tag = part.trim().replace(/\s+/g, " ");
    if (!tag) continue;
    if (tag.length > MAX_STACK_TAG_LENGTH) {
      return { ok: false, error: `스택 태그는 ${MAX_STACK_TAG_LENGTH}자까지 쓸 수 있습니다.` };
    }
    const key = tag.toLocaleLowerCase("en");
    if (seen.has(key)) continue;
    seen.add(key);
    stack.push(tag);
  }
  if (stack.length > MAX_STACK_TAGS) {
    return { ok: false, error: `스택 태그는 ${MAX_STACK_TAGS}개까지 적을 수 있습니다.` };
  }
  return { ok: true, stack };
}

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function validateReview(input: ReviewInput): { ok: true; value: ReviewDraft } | { ok: false; error: string } {
  if (!isTaskType(input.taskType)) return { ok: false, error: "작업 유형을 선택하세요." };
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    return { ok: false, error: "별점은 1에서 5 사이여야 합니다." };
  }

  const body = normalizeMultiline(input.body);
  if (body.length < MIN_REVIEW_BODY) {
    return { ok: false, error: `본문은 ${MIN_REVIEW_BODY}자 이상 써야 합니다.` };
  }
  if (body.length > MAX_REVIEW_BODY) {
    return { ok: false, error: `본문은 ${MAX_REVIEW_BODY}자까지 쓸 수 있습니다.` };
  }
  if (linkCount(body) > MAX_REVIEW_LINKS) {
    return { ok: false, error: `링크는 ${MAX_REVIEW_LINKS}개까지 넣을 수 있습니다.` };
  }

  const modelRaw = (input.model ?? "").trim();
  if (modelRaw.length > MAX_MODEL_LENGTH) {
    return { ok: false, error: `모델 이름은 ${MAX_MODEL_LENGTH}자까지 쓸 수 있습니다.` };
  }

  const stacked = parseStack(input.stack ?? "");
  if (!stacked.ok) return stacked;

  const usedRaw = (input.usedSince ?? "").trim();
  let usedSince: string | null = null;
  if (usedRaw) {
    if (!isIsoDate(usedRaw)) return { ok: false, error: "사용 시작일은 YYYY-MM-DD 형식이어야 합니다." };
    if (usedRaw > seoulDate(input.now ?? new Date())) {
      return { ok: false, error: "사용 시작일은 오늘 이전이어야 합니다." };
    }
    usedSince = usedRaw;
  }

  return {
    ok: true,
    value: {
      model: modelRaw || null,
      taskType: input.taskType,
      stack: stacked.stack,
      rating: input.rating,
      wouldUseAgain: input.wouldUseAgain,
      body,
      usedSince,
    },
  };
}
