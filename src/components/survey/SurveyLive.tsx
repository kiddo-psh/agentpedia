"use client";

import { useState, type FormEvent } from "react";
import { SurveyCharts } from "@/components/survey/SurveyCharts";
import { Honeypot } from "@/components/survey/Honeypot";
import type { SurveyResults } from "@/survey/aggregate";
import { AGENT_GROUPS, ORCHESTRATOR_OTHER_ID, TENURE_OPTIONS, USE_OPTIONS, type SurveyOption } from "@/survey/choices";
import { MAX_OTHER_LENGTH, OTHER_ID } from "@/survey/limits";
import { SURVEY_STORAGE_KEY } from "@/survey/boot";

const choice = "flex items-start gap-2.5 text-sm leading-6";
const box = "mt-1 size-4 shrink-0 accent-foreground";
const otherField =
  "mt-2 w-full rounded-xl bg-soft px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-foreground/20";

function OptionBox({ name, option }: { name: string; option: SurveyOption }) {
  return (
    <label className={choice}>
      <input className={box} type="checkbox" name={name} value={option.id} />
      <span>{option.label}</span>
    </label>
  );
}

export function SurveyLive({ initial, models }: { initial: SurveyResults; models: readonly SurveyOption[] }) {
  const [results, setResults] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/survey", {
        method: "POST",
        body: new FormData(event.currentTarget),
        headers: { accept: "application/json" },
      });
      const data = (await response.json().catch(() => null)) as { ok?: boolean; error?: string; results?: SurveyResults } | null;
      if (!response.ok || !data?.ok || !data.results) {
        setError(data?.error ?? "답을 다시 확인해 주세요.");
        return;
      }
      setResults(data.results);
      try {
        localStorage.setItem(SURVEY_STORAGE_KEY, "answered");
      } catch {
        // The done cookie still hides the form on the next full load.
      }
      document.documentElement.setAttribute("data-survey", "answered");
      document.documentElement.setAttribute("data-survey-banner", "off");
      document.getElementById("survey-results")?.scrollIntoView({ block: "start" });
    } catch {
      setError("저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <SurveyCharts results={results} />
      <form action="/api/survey" method="post" className="survey-form mt-10" onSubmit={onSubmit}>
        <Honeypot />
        <fieldset>
          <legend className="text-base font-semibold tracking-tight">주로 쓰는 에이전트 앱</legend>
          <p className="mt-1 text-sm text-muted">형태별로 여러 개 고를 수 있습니다.</p>
          {AGENT_GROUPS.filter((group) => group.id !== "other").map((group) => (
            <div key={group.id} className="mt-5">
              <p className="text-sm font-medium">{group.label}</p>
              <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                {group.options.map((option) => (
                  <li key={option.id} className={option.id === ORCHESTRATOR_OTHER_ID ? "sm:col-span-2" : undefined}>
                    <OptionBox name="agents" option={option} />
                    {option.id === ORCHESTRATOR_OTHER_ID && (
                      <input
                        className={otherField}
                        type="text"
                        name="orchestratorOther"
                        maxLength={MAX_OTHER_LENGTH}
                        placeholder="직접 입력"
                        aria-label="기타 오케스트레이터"
                        autoComplete="off"
                      />
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="mt-5">
            <p className="text-sm font-medium">기타</p>
            <ul className="mt-2">
              <li>
                <OptionBox name="agents" option={{ id: OTHER_ID, label: "기타" }} />
                <input
                  className={otherField}
                  type="text"
                  name="agentOther"
                  maxLength={MAX_OTHER_LENGTH}
                  placeholder="직접 입력"
                  aria-label="기타 에이전트"
                  autoComplete="off"
                />
              </li>
            </ul>
          </div>
        </fieldset>

        <fieldset className="mt-8">
          <legend className="text-base font-semibold tracking-tight">선호 모델</legend>
          <p className="mt-1 text-sm text-muted">여러 개 고를 수 있습니다. 비율의 합이 100을 넘을 수 있습니다.</p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {models.map((option) => (
              <li key={option.id}>
                <OptionBox name="model" option={option} />
              </li>
            ))}
            <li className="sm:col-span-2">
              <OptionBox name="model" option={{ id: OTHER_ID, label: "기타" }} />
              <input
                className={otherField}
                type="text"
                name="modelOther"
                maxLength={MAX_OTHER_LENGTH}
                placeholder="직접 입력"
                aria-label="기타 모델"
                autoComplete="off"
              />
            </li>
          </ul>
        </fieldset>

        <fieldset className="mt-8">
          <legend className="text-base font-semibold tracking-tight">주 용도</legend>
          <p className="mt-1 text-sm text-muted">여러 개 고를 수 있습니다.</p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {USE_OPTIONS.map((option) => (
              <li key={option.id}>
                <OptionBox name="uses" option={option} />
              </li>
            ))}
            <li className="sm:col-span-2">
              <OptionBox name="uses" option={{ id: OTHER_ID, label: "기타" }} />
              <input
                className={otherField}
                type="text"
                name="useOther"
                maxLength={MAX_OTHER_LENGTH}
                placeholder="직접 입력"
                aria-label="기타 용도"
                autoComplete="off"
              />
            </li>
          </ul>
        </fieldset>

        <fieldset className="mt-8">
          <legend className="text-base font-semibold tracking-tight">에이전트 사용 기간</legend>
          <ul className="mt-3 grid gap-2 sm:grid-cols-3">
            {TENURE_OPTIONS.map((option, index) => (
              <li key={option.id}>
                <label className={choice}>
                  <input className={box} type="radio" name="tenure" value={option.id} required={index === 0} />
                  <span>{option.label}</span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>

        {error && (
          <p role="alert" className="mt-4 text-sm text-rose-600 dark:text-rose-400">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="mt-8 inline-flex h-10 items-center rounded-full bg-foreground px-5 text-sm font-medium text-background hover:opacity-85 disabled:opacity-50"
        >
          {pending ? "보내는 중…" : "응답 보내기"}
        </button>
      </form>
    </>
  );
}
