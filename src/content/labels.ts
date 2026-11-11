import type { ArticleMeta, Category } from "./schema";

export const CATEGORY_LABEL: Record<Category, string> = {
  people: "인물",
  trends: "트렌드",
  startup: "창업 사례",
  security: "보안",
};

export const DIFFICULTY_LABEL: Record<ArticleMeta["difficulty"], string> = {
  intro: "입문",
  practical: "실전",
  deep: "심화",
};

const dateFormat = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "Asia/Seoul",
});

export const formatDate = (d: Date) => dateFormat.format(d);
