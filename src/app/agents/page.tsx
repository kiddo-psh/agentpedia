import type { Metadata } from "next";
import Link from "next/link";
import { cacheLife } from "next/cache";
import { FORM_LABEL, listAgents } from "@/content/agents";

export const metadata: Metadata = {
  title: "에이전트",
  description: "코딩 에이전트의 채택 수치와 벤치마크를 출처와 함께 모읍니다.",
};

export default async function AgentsPage() {
  return <AgentsIndex />;
}

async function AgentsIndex() {
  "use cache";
  cacheLife("days");
  const agents = listAgents();

  return (
    <div className="mx-auto max-w-[720px] pt-2">
      <p className="text-[13px] font-medium text-muted">도구</p>
      <h1 className="mt-2 text-4xl font-medium tracking-[-0.03em]">에이전트</h1>
      <p className="mt-4 max-w-[38em] text-lg leading-relaxed text-muted">
        채택 수치와 벤치마크를 출처, 기준일과 함께 적습니다. 확인하지 못한 칸은 비워 둡니다.
      </p>
      <ul className="mt-10 border-b border-line">
        {agents.map((agent) => (
          <li key={agent.slug} className="border-t border-line">
            <Link
              href={`/agents/${agent.slug}`}
              prefetch={true}
              className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-4 hover:text-foreground"
            >
              <span>
                <span className="text-lg font-medium">{agent.name}</span>
                <span className="mt-1 block text-sm text-muted">
                  {agent.vendor} · {agent.form.map((form) => FORM_LABEL[form]).join(" · ")}
                </span>
              </span>
              {agent.surveyUsage ? (
                <span className="text-sm text-muted tabular-nums">설문 {agent.surveyUsage.value}%</span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
