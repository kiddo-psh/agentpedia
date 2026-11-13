import { listArticles } from "@/content/loader";
import { ArticleList } from "./ArticleList";

export default function Home() {
  const articles = listArticles();

  return (
    <div className="mx-auto max-w-3xl">
      <section className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight">읽고, 바로 적용하세요</h1>
        <p className="mt-3 leading-relaxed text-muted">
          에이전트 시대를 이끄는 사람들의 인사이트와 실전 활용법을 정리했습니다. 기사마다 내 프로젝트에
          적용할 수 있는 키트가 함께 있어요.
        </p>
      </section>
      <ArticleList articles={articles} />
    </div>
  );
}
