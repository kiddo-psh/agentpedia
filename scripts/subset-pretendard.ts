/**
 * Content-scanned Pretendard Variable subsets for first paint.
 *
 * Scans published article text + UI chrome, then writes:
 *   - src/fonts/pretendard-critical.woff2  (shell / title / brief / chrome)
 *   - src/fonts/pretendard-content.woff2   (remaining published glyphs)
 *   - src/app/pretendard-subset.css        (critical @font-face — layout first paint)
 *   - src/app/pretendard-content.css      (content @font-face — DeferredContentFont)
 *   - src/fonts/pretendard-subset-meta.json
 *
 * Missing glyphs (UGC, new copy before regen) fall back to the stack in globals.css
 * (Apple SD Gothic Neo / Malgun Gothic / sans-serif). Regenerate after content or
 * chrome string changes: `npm run fonts:subset` (also runs from prebuild).
 */
import fs from "node:fs";
import path from "node:path";
import subsetFont from "subset-font";
import { loadAllArticles } from "../src/content/loader";
import {
  CATEGORY_LABEL,
  DIFFICULTY_LABEL,
  formatDate,
  formatMonth,
  sourceAge,
  sourcePeriod,
} from "../src/content/labels";
import { readerText } from "../src/content/readerText";
import type { Article } from "../src/content/schema";

const ROOT = process.cwd();
const SOURCE_TTF = path.join(ROOT, "node_modules/pretendard/dist/public/variable/PretendardVariable.ttf");
const OUT_DIR = path.join(ROOT, "src/fonts");
const CRITICAL_CSS_OUT = path.join(ROOT, "src/app/pretendard-subset.css");
const CONTENT_CSS_OUT = path.join(ROOT, "src/app/pretendard-content.css");
const META_OUT = path.join(OUT_DIR, "pretendard-subset-meta.json");

/** Layout / shared chrome that never appears in article MDX. */
const CHROME = `
Agentpedia
기사 에이전트 연결
모든 기사는 원문 출처를 밝히고 요약·해석한 글입니다.
AI 에이전트 백과사전
AI 에이전트 시대의 인사이트를 읽고, 내 프로젝트에 바로 적용해 보세요.
독자가 가장 많이 좋아요한 글입니다
좋아요한 글 불러오는 중…
아직 공개된 기사가 없습니다.
초안 정렬 최신순 좋아요순 페이지 전체 분류 시작하기
편 · 최신순 이전 다음
로그인 로그아웃 로그인에 실패했습니다. 개발용 로그인
이름 이메일 비밀번호 (8자 이상) 처리 중… 등록 중… 보내는 중…
토론을 불러오는 중… 아직 댓글이 없습니다. 첫 의견을 남겨 주세요.
삭제된 댓글입니다. 삭제 답글을 입력하세요 댓글을 삭제할까요?
이 글에 대한 생각을 나눠 주세요 답글 달기 댓글 달기
댓글로 토론에 참여하려면 로그인하세요.
로그인하고 좋아요를 누르세요 좋아요 취소 좋아요
30초 요약 무슨 일 왜 중요한가 지금 할 수 있는 일 적용 방법 보기 ↓
내 프로젝트에 적용하기 적용 키트 관련 기사 토론 출처 위치
출처가 나온 시점입니다 난이도 적용 시간 출처 시점
내 레포에 적용 에이전트에서 한 줄로 실행합니다. 이 글
키트는 코딩 에이전트에게 건네는 작업 지시문과 점검표 묶음입니다.
아무 코딩 에이전트에나 붙여 넣으세요
키트 파일 보기 개 복사 복사됨 복사 실패 링크 공유 공유 실패
핵심 아이디어 이전 이제
이 글의 용어 개
에이전트에 연결하기 MCP 서버 터미널에서 한 번만 실행하세요.
그 밖의 에이전트 Streamable HTTP를 지원하는 MCP 클라이언트라면 아래 주소를 등록하면 됩니다.
제공하는 기능 모든 기능은 읽기 전용입니다. 에이전트가 내 레포를 바꾸는 것은 항상 내 승인 아래에서 이뤄집니다.
로그인이 아직 설정되지 않았습니다.
지표 조회 적용 적용률 MCP 호출 MCP 클라이언트
이 글에 반응하기 이 글에 건의하기 건의 내용 건의 고맙습니다. 건의를 받았습니다.
틀린 사실, 빠진 출처, 키트가 동작하지 않은 경험, 다뤄 줬으면 하는 주제를 적어 주세요. 로그인하지 않아도 됩니다.
AI 도구와 모델은 빠르게 바뀌므로 지금과 다를 수 있어요.
날짜 없음 열람 일부 날짜는 원문 밖에서 확인
이번 달 자료 전 자료 년 월 일 개월
`;

const BASIC_LATIN =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789" +
  " .,;:!?·—–-_/\\|@#$%&*()[]{}<>\"'`~+=^…“”‘’«»•※→←↑↓°%‰±×÷≠≈≤≥";

function add(target: Set<string>, text: string) {
  for (const ch of text) {
    const code = ch.codePointAt(0)!;
    // Skip C0/C1 controls; keep space and visible glyphs only.
    if (code < 0x20 || (code >= 0x7f && code <= 0x9f)) continue;
    target.add(ch);
  }
}

/** Korean (and other non-ASCII) string literals from UI source, so chrome stays covered. */
function scanUiSourceGlyphs(dir: string, target: Set<string>) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true, recursive: true })) {
    if (!entry.isFile()) continue;
    if (!/\.(tsx|ts)$/.test(entry.name)) continue;
    const abs = path.join(entry.parentPath, entry.name);
    const src = fs.readFileSync(abs, "utf8");
    for (const ch of src) {
      const code = ch.codePointAt(0)!;
      // Hangul syllables/jamo, CJK, general punctuation commonly used in copy.
      if (
        (code >= 0xac00 && code <= 0xd7a3) ||
        (code >= 0x1100 && code <= 0x11ff) ||
        (code >= 0x3130 && code <= 0x318f) ||
        (code >= 0x4e00 && code <= 0x9fff) ||
        (code >= 0x3000 && code <= 0x303f) ||
        (code >= 0x2010 && code <= 0x2027)
      ) {
        target.add(ch);
      }
    }
  }
}

function criticalText(article: Article): string {
  const parts = [
    article.title,
    article.summary,
    article.brief.what,
    article.brief.why,
    article.brief.action,
    ...article.keyIdeas,
    ...article.persons.flatMap((p) => [p.name, p.nameKo, p.role]),
    CATEGORY_LABEL[article.category],
    DIFFICULTY_LABEL[article.difficulty],
    sourcePeriod(article.sources),
    formatDate(article.publishedAt),
    formatMonth(article.publishedAt),
    article.apply.time,
  ];
  return parts.join("\n");
}

function contentText(article: Article): string {
  // Full reader-facing page text (body, kit chrome, sources). Kit file bodies are
  // mostly mono/code; still include apply/tryIt via readerText.
  return readerText(article);
}

function dateSamples(): string {
  const out: string[] = [];
  for (let y = 2020; y <= 2027; y++) {
    for (let m = 0; m < 12; m++) {
      out.push(formatMonth(new Date(Date.UTC(y, m, 15))));
      for (let d = 1; d <= 31; d++) out.push(formatDate(new Date(Date.UTC(y, m, d))));
    }
  }
  for (let i = 0; i < 40; i++) out.push(sourceAge(i));
  return out.join("\n");
}

function toUnicodeRanges(codepoints: number[]): string {
  if (codepoints.length === 0) return "U+0";
  const sorted = [...new Set(codepoints)].sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = sorted[0]!;
  let prev = sorted[0]!;
  const flush = () => {
    ranges.push(start === prev ? `U+${start.toString(16)}` : `U+${start.toString(16)}-${prev.toString(16)}`);
  };
  for (let i = 1; i < sorted.length; i++) {
    const n = sorted[i]!;
    if (n === prev + 1) {
      prev = n;
      continue;
    }
    flush();
    start = prev = n;
  }
  flush();
  return ranges.join(", ");
}

function cssBlock(file: string, unicodeRange: string): string {
  return `@font-face {
  font-family: "Pretendard Variable";
  font-style: normal;
  font-display: swap;
  font-weight: 45 920;
  src: url("../fonts/${file}") format("woff2-variations");
  unicode-range: ${unicodeRange};
}`;
}

async function writeSubset(chars: Set<string>, outFile: string): Promise<number> {
  const text = [...chars].join("");
  if (text.length === 0) {
    // Minimal valid empty-ish subset still needs .notdef; keep one space.
    chars.add(" ");
  }
  const source = fs.readFileSync(SOURCE_TTF);
  const woff2 = await subsetFont(source, [...chars].join(""), { targetFormat: "woff2" });
  fs.writeFileSync(outFile, woff2);
  return woff2.byteLength;
}

function hangulCount(chars: Set<string>) {
  return [...chars].filter((c) => {
    const code = c.codePointAt(0)!;
    return code >= 0xac00 && code <= 0xd7a3;
  }).length;
}

async function main() {
  if (!fs.existsSync(SOURCE_TTF)) {
    throw new Error(`Pretendard source missing: ${SOURCE_TTF} (npm ci first)`);
  }

  const critical = new Set<string>();
  const content = new Set<string>();
  add(critical, BASIC_LATIN);
  add(critical, CHROME);
  add(critical, Object.values(CATEGORY_LABEL).join(""));
  add(critical, Object.values(DIFFICULTY_LABEL).join(""));
  add(critical, dateSamples());
  scanUiSourceGlyphs(path.join(ROOT, "src/app"), critical);
  scanUiSourceGlyphs(path.join(ROOT, "src/components"), critical);
  scanUiSourceGlyphs(path.join(ROOT, "src/content"), critical);

  // Content starts as a copy of critical, then gains body/glossary glyphs.
  for (const ch of critical) content.add(ch);

  const glossaryPath = path.join(ROOT, "content/glossary.yaml");
  const peoplePath = path.join(ROOT, "content/people.yaml");
  if (fs.existsSync(glossaryPath)) add(content, fs.readFileSync(glossaryPath, "utf8"));
  if (fs.existsSync(peoplePath)) add(content, fs.readFileSync(peoplePath, "utf8"));

  const articles = loadAllArticles().filter((a) => !a.draft);
  for (const article of articles) {
    add(critical, criticalText(article));
    add(content, criticalText(article));
    add(content, contentText(article));
  }

  // Content file holds only glyphs not already in the critical face, so first paint
  // downloads critical alone when the shell's characters are covered.
  const contentOnly = new Set([...content].filter((ch) => !critical.has(ch)));
  // Always keep space/.notdef companions in both files for safety.
  add(contentOnly, " ");

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const criticalPath = path.join(OUT_DIR, "pretendard-critical.woff2");
  const contentPath = path.join(OUT_DIR, "pretendard-content.woff2");

  const criticalBytes = await writeSubset(critical, criticalPath);
  const contentBytes = await writeSubset(contentOnly, contentPath);

  const criticalRange = toUnicodeRanges([...critical].map((c) => c.codePointAt(0)!));
  const contentRange = toUnicodeRanges([...contentOnly].map((c) => c.codePointAt(0)!));

  const header = `/*
 * Generated by scripts/subset-pretendard.ts — do not edit by hand.
 * Copyright (c) 2021 Kil Hyung-jin, with Reserved Font Name Pretendard (SIL OFL 1.1).
 *
 * critical = UI chrome + titles + briefs (first-paint; layout imports pretendard-subset.css).
 * content  = remaining published-site glyphs (DeferredContentFont loads pretendard-content.css).
 * Glyphs outside both faces fall back to Apple SD Gothic Neo / Malgun Gothic / sans-serif
 * (see --font-sans in globals.css). Regenerate: npm run fonts:subset
 */`;

  fs.writeFileSync(
    CRITICAL_CSS_OUT,
    `${header}
${cssBlock("pretendard-critical.woff2", criticalRange)}
`,
  );
  fs.writeFileSync(
    CONTENT_CSS_OUT,
    `${header}
${cssBlock("pretendard-content.woff2", contentRange)}
`,
  );

  const meta = {
    generatedAt: new Date().toISOString(),
    articles: articles.length,
    critical: {
      glyphs: critical.size,
      hangul: hangulCount(critical),
      bytes: criticalBytes,
      file: "src/fonts/pretendard-critical.woff2",
    },
    content: {
      glyphs: contentOnly.size,
      hangul: hangulCount(contentOnly),
      bytes: contentBytes,
      file: "src/fonts/pretendard-content.woff2",
    },
    totalBytes: criticalBytes + contentBytes,
    note: "Missing glyphs fall back to system Korean fonts in --font-sans.",
  };
  fs.writeFileSync(META_OUT, JSON.stringify(meta, null, 2) + "\n");

  console.log(
    `pretendard subset: critical ${criticalBytes} B (${critical.size} glyphs, ${hangulCount(critical)} hangul), ` +
      `content-delta ${contentBytes} B (${contentOnly.size} glyphs), articles=${articles.length}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
