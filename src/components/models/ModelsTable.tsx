"use client";

import { useMemo, useState, type ReactNode } from "react";
import { SourceAge } from "@/components/SourceAge";
import { formatDate } from "@/content/labels";
import { ModelsTableDesktopBody, ModelsTableMobileList } from "./ModelsTableView";
import { compareRows, type ModelsTablePayload, type SortKey } from "./metrics";

const SORT_OPTIONS: { key: SortKey; label: string; defaultDir: "asc" | "desc" }[] = [
  { key: "rank", label: "순위", defaultDir: "asc" },
  { key: "name", label: "모델", defaultDir: "asc" },
  { key: "score", label: "해결률", defaultDir: "desc" },
  { key: "runCost", label: "전체 실행 비용", defaultDir: "asc" },
  { key: "tokens", label: "사용 토큰", defaultDir: "asc" },
  { key: "inputPrice", label: "입력 단가", defaultDir: "asc" },
  { key: "outputPrice", label: "출력 단가", defaultDir: "asc" },
];

function sortChoice(label: string, key: SortKey, dir: "asc" | "desc"): string {
  if (key === "name") return dir === "asc" ? "이름순" : "이름 역순";
  return `${label} ${dir === "asc" ? "낮은 순" : "높은 순"}`;
}

function SortButton({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: "asc" | "desc";
  onClick: () => void;
}) {
  return (
    <button type="button" className={active ? "models-th-btn is-active" : "models-th-btn"} onClick={onClick}>
      {label}
      {active ? <span aria-hidden>{dir === "asc" ? " ↑" : " ↓"}</span> : null}
    </button>
  );
}

export function ModelsTable({
  payload,
  desktopBody,
  mobileList,
}: {
  payload: ModelsTablePayload;
  desktopBody: ReactNode;
  mobileList: ReactNode;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [harness, setHarness] = useState<string>("all");
  const isDefault = sortKey === "rank" && sortDir === "asc" && harness === "all";

  const rows = useMemo(() => {
    if (isDefault) return null;
    const filtered =
      harness === "all" ? payload.rows : payload.rows.filter((row) => row.harness === harness);
    return [...filtered].sort((a, b) => compareRows(a, b, sortKey, sortDir));
  }, [isDefault, payload.rows, harness, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    const opt = SORT_OPTIONS.find((o) => o.key === key);
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(opt?.defaultDir ?? "asc");
    }
  };

  return (
    <div className="models-table-wrap">
      <div className="models-table-controls flex flex-wrap items-end gap-3">
        <label className="text-sm text-muted">
          <span className="mb-1 block" title="모델을 돌린 에이전트 프로그램">
            하네스
          </span>
          <select
            className="models-select"
            value={harness}
            onChange={(e) => setHarness(e.target.value)}
            aria-label="하네스 필터"
          >
            <option value="all">전체</option>
            {payload.harnesses.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-muted md:hidden">
          <span className="mb-1 block">정렬</span>
          <select
            className="models-select"
            value={`${sortKey}:${sortDir}`}
            onChange={(e) => {
              const [key, dir] = e.target.value.split(":") as [SortKey, "asc" | "desc"];
              setSortKey(key);
              setSortDir(dir);
            }}
            aria-label="정렬"
          >
            {SORT_OPTIONS.flatMap((opt) => [
              <option key={`${opt.key}:asc`} value={`${opt.key}:asc`}>
                {sortChoice(opt.label, opt.key, "asc")}
              </option>,
              <option key={`${opt.key}:desc`} value={`${opt.key}:desc`}>
                {sortChoice(opt.label, opt.key, "desc")}
              </option>,
            ])}
          </select>
        </label>
      </div>

      <div className="models-table-desktop mt-4 hidden md:block">
        <div className="overflow-x-auto">
          <table className="models-table w-full min-w-[960px] border-b border-line text-left text-sm">
            <thead>
              <tr className="text-muted">
                <th className="py-2 pr-3 font-medium">
                  <SortButton label="#" active={sortKey === "rank"} dir={sortDir} onClick={() => toggleSort("rank")} />
                </th>
                <th className="py-2 pr-3 font-medium">
                  <SortButton label="모델" active={sortKey === "name"} dir={sortDir} onClick={() => toggleSort("name")} />
                </th>
                <th className="py-2 pr-3 font-medium">
                  <SortButton
                    label="개발사"
                    active={sortKey === "vendor"}
                    dir={sortDir}
                    onClick={() => toggleSort("vendor")}
                  />
                </th>
                <th className="py-2 pr-3 font-medium" title="모델을 돌린 에이전트 프로그램">
                  <SortButton
                    label="하네스"
                    active={sortKey === "harness"}
                    dir={sortDir}
                    onClick={() => toggleSort("harness")}
                  />
                </th>
                <th className="py-2 pr-3 font-medium">
                  <SortButton
                    label="해결률"
                    active={sortKey === "score"}
                    dir={sortDir}
                    onClick={() => toggleSort("score")}
                  />
                </th>
                <th className="py-2 pr-3 font-medium">
                  <SortButton
                    label="전체 실행 비용"
                    active={sortKey === "runCost"}
                    dir={sortDir}
                    onClick={() => toggleSort("runCost")}
                  />
                </th>
                <th className="py-2 pr-3 font-medium">
                  <SortButton
                    label="사용 토큰"
                    active={sortKey === "tokens"}
                    dir={sortDir}
                    onClick={() => toggleSort("tokens")}
                  />
                </th>
                <th className="py-2 pr-3 font-medium" title="100만 토큰당 달러">
                  <SortButton
                    label="입력 단가"
                    active={sortKey === "inputPrice"}
                    dir={sortDir}
                    onClick={() => toggleSort("inputPrice")}
                  />
                </th>
                <th className="py-2 font-medium" title="100만 토큰당 달러">
                  <SortButton
                    label="출력 단가"
                    active={sortKey === "outputPrice"}
                    dir={sortDir}
                    onClick={() => toggleSort("outputPrice")}
                  />
                </th>
              </tr>
            </thead>
            {isDefault || !rows ? desktopBody : <ModelsTableDesktopBody rows={rows} />}
          </table>
        </div>
      </div>

      {isDefault || !rows ? mobileList : <ModelsTableMobileList rows={rows} />}

      <footer className="models-source-foot mt-4 space-y-1 text-sm text-muted">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span>Terminal-Bench 4.1</span>
          {payload.terminalBench.url ? (
            <a href={payload.terminalBench.url} className="underline underline-offset-2" target="_blank" rel="noreferrer">
              {payload.terminalBench.label}
            </a>
          ) : (
            <span>{payload.terminalBench.label}</span>
          )}
          {payload.terminalBench.asOfIso ? (
            <>
              <span aria-hidden>·</span>
              <span>기준일 {formatDate(new Date(payload.terminalBench.asOfIso))}</span>
              <SourceAge newestIso={payload.terminalBench.asOfIso} />
            </>
          ) : null}
        </p>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span>토큰 단가</span>
          {payload.openRouter.url ? (
            <a href={payload.openRouter.url} className="underline underline-offset-2" target="_blank" rel="noreferrer">
              {payload.openRouter.label}
            </a>
          ) : (
            <span>{payload.openRouter.label}</span>
          )}
          {payload.openRouter.asOfIso ? (
            <>
              <span aria-hidden>·</span>
              <span>기준일 {formatDate(new Date(payload.openRouter.asOfIso))}</span>
              <SourceAge newestIso={payload.openRouter.asOfIso} />
            </>
          ) : null}
        </p>
        <p className="text-[12px]">
          실행 비용은 작업 하나의 비용이 아니라, 리더보드가 벤치마크 전체를 돌리며 기록한 금액입니다. 입력 단가와 출력
          단가는 100만 토큰당 달러입니다.
        </p>
        <p className="text-[12px]">— 확인하지 못한 값</p>
      </footer>
    </div>
  );
}
