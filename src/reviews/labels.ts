export const TASK_OPTIONS = [
  ["write_code", "코드 작성"],
  ["debug", "디버그"],
  ["tests", "테스트"],
  ["docs", "문서"],
  ["review", "코드 리뷰"],
  ["design", "설계"],
  ["incident", "장애"],
  ["refactor", "리팩터링"],
] as const;

export type TaskOption = (typeof TASK_OPTIONS)[number][0];

export const TASK_LABEL: Record<TaskOption, string> = Object.fromEntries(TASK_OPTIONS) as Record<
  TaskOption,
  string
>;
