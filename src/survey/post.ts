/** Seeded community post. The row is content, not a database insert, and it has no fake responses. */
export const SURVEY_POST = {
  slug: "agent-survey",
  title: "1분 설문: 어떤 에이전트 쓰세요?",
  authorName: "Agentpedia",
  summary: "주로 쓰는 에이전트, 모델, 용도, 사용 기간을 묻습니다. 응답 비율은 바로 이 글에 나옵니다.",
} as const;

/** Publication date of the post itself. Asia/Seoul midnight, the day the post shipped. */
export const SURVEY_POST_PUBLISHED_AT = new Date("2026-11-26T00:00:00+09:00");

export const SURVEY_POST_PATH = `/community/${SURVEY_POST.slug}` as const;
