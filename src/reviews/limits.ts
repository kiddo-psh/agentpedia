/** Shared by the server validator and the review form. */
export const MIN_REVIEW_BODY = 30;
export const MAX_REVIEW_BODY = 2000;
export const MAX_REVIEW_LINKS = 2;
export const MAX_MODEL_LENGTH = 80;
export const MAX_STACK_TAGS = 8;
export const MAX_STACK_TAG_LENGTH = 32;
export const DAILY_REVIEW_LIMIT = 5;
/** Task-type averages below this sample stay grey. */
export const MIN_TASK_REVIEWS = 5;
export const TOP_STACKS = 5;

const SEOUL_OFFSET_MS = 9 * 60 * 60 * 1000;

/** Start of the calendar day in Asia/Seoul, as a UTC instant. */
export function seoulDayStart(now: Date): Date {
  const seoul = new Date(now.getTime() + SEOUL_OFFSET_MS);
  return new Date(Date.UTC(seoul.getUTCFullYear(), seoul.getUTCMonth(), seoul.getUTCDate()) - SEOUL_OFFSET_MS);
}

/** `YYYY-MM-DD` in Asia/Seoul. */
export function seoulDate(now: Date): string {
  const seoul = new Date(now.getTime() + SEOUL_OFFSET_MS);
  const month = String(seoul.getUTCMonth() + 1).padStart(2, "0");
  const day = String(seoul.getUTCDate()).padStart(2, "0");
  return `${seoul.getUTCFullYear()}-${month}-${day}`;
}
