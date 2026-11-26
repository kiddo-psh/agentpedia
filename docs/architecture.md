# Agentpedia 구조

코드가 기준이다. 2026-11-11 MVP 설계는 [보관](archive/2026-11-11-mvp-design.md)에 있다.

코딩 에이전트 정보 사이트다. 에이전트와 모델의 수치는 git의 `facts.yaml`에 두고, 기사는 그 맥락을 정리한다. 사용자가 만드는 데이터만 데이터베이스에 있다.

## 라우트

| 경로 | 내용 |
|---|---|
| `/`, `/c/[category]`, `/a/[slug]` | 기사 목록, 카테고리, 본문 |
| `/a/[slug]/kit` | 키트 zip |
| `/agents`, `/agents/[slug]` | 에이전트. `content/agents/<slug>/facts.yaml`과 `index.mdx` |
| `/models`, `/models/[slug]` | 모델 비교. `content/models/<slug>/facts.yaml`과 `index.mdx` |
| `/community`, `/community/new`, `/community/[id]` | 커뮤니티 글. 글쓰기는 로그인 |
| `/community/agent-survey` | 에이전트 사용 설문. 익명 응답, 집계, 익명 댓글 |
| `/connect` | MCP 연결 안내 |
| `/login`, `/likes` | GitHub 로그인(로컬은 개발용 이메일 로그인), 좋아요한 글 |
| `/admin/metrics` | 운영 지표. `METRICS_ADMINS`에 없는 사용자는 `src/proxy.ts`가 404 |
| `/mcp` | MCP (Streamable HTTP) |
| `/api/auth/[...all]`, `/api/events`, `/api/metrics`, `/api/suggestions` | 인증, 이벤트, 지표 JSON, 건의 |
| `/api/survey`, `/api/survey/comments` | 설문 응답, 익명 댓글·신고·관리자 숨김 |

기사 작성 기준은 [writing-guide.md](writing-guide.md)와 [review-rubric.md](review-rubric.md)다. 페이지가 그리는 기사 골격은 30초 요약(`brief`), 본문, 적용 키트다.

## 숫자

에이전트·모델 페이지에 적는 수와 짧은 문장은 `value`, `sourceUrl`, `asOf`가 한 세트로 있어야 한다 (`SourcedValue`, `src/content/schema.ts`). 없는 칸은 비운다. `asOf`가 90일을 넘으면 빌드가 경고만 한다 (`STALE_AFTER_DAYS`, `src/content/agents.ts`). 빌드를 실패시키지는 않는다.

`.github/workflows/collect-ideas.yml`이 월요일 00:00 UTC에 `npm run ideas:collect`와 `npm run agents:refresh`를 돌린다. refresh는 각 `facts.yaml`의 npm 주간 다운로드, GitHub stars, 최신 릴리스만 고친다. 모델 수치는 이 잡이 갱신하지 않는다.

## 콘텐츠

```
content/articles/<slug>/index.mdx
content/articles/<slug>/kit/prompt.md
content/articles/<slug>/kit/checklist.md
content/agents/<slug>/{facts.yaml,index.mdx}
content/models/<slug>/{facts.yaml,index.mdx}
content/people.yaml
content/glossary.yaml
content/ideas.yaml
content/ideas-sources.yaml
```

키트 두 파일은 스키마가 요구한다. 같은 일을 하는 외부 스킬이 있으면 절차를 복제하지 말고 그 스킬을 가리킨다. 기준은 writing-guide §8.

글감 수집은 [idea-pipeline.md](idea-pipeline.md). 기사 초안 워크플로는 `.claude/workflows/write-article.js`.

## 데이터베이스

테이블 정의는 `src/db/schema.ts`와 `src/db/auth-schema.ts`, 마이그레이션은 `drizzle/`. 콘텐츠 slug에는 외래 키를 걸지 않는다.

앱 테이블: `comments`(`citation_quote` 포함), `community_posts`, `community_comments`, `likes`, `suggestions`, `events`, `survey_responses`, `survey_comments`, `survey_comment_reports`.

`survey_responses`는 방문자 쿠키(`ap_vid`)당 한 줄이다. 세션이 있으면 `user_id`를 같이 남긴다. `model`은 모델 id의 JSON 배열 문자열이고 `agent_other`는 기타 문장의 JSON이다. 응답하지 않은 방문자의 HTML에는 집계를 넣지 않는다. 응답한 방문자에게는 막대를 서버에서 그리고, 그 전에도 응답 보기로 집계를 받을 수 있다. `survey_comments`는 설문 글의 익명 댓글이다. 서로 다른 방문자 3명이 신고하면 숨기고, `METRICS_ADMINS` 관리자는 숨기거나 지울 수 있다. 댓글 본문은 평문으로만 그린다.

Better Auth 테이블: `user`, `session`, `account`, `verification`.

`events.kind`: `view`, `web_copy`, `share`, `kit_download`, `mcp_get_article`, `mcp_get_kit`, `mcp_prompt`.

`DATABASE_URL`이 없으면 로컬 PGlite다. `next dev`는 `.data/pglite`, `next start`(preview 포함)는 `.data/pglite-prod`. 프로덕션 마이그레이션은 `DATABASE_URL_UNPOOLED`(`npm run db:migrate`, `.env.migrate`).

## MCP

`src/mcp/server.ts`. 읽기 전용이고 인증이 없다.

| 종류 | 이름 |
|---|---|
| tool | `search_articles`, `get_article`, `get_apply_kit` |
| prompt | `apply_article` |

에이전트·모델 페이지는 이 서버에 없다. `/mcp`, `/api/events`, `/api/survey`는 IP당 분당 60회다 (`src/ratelimit.ts`). Upstash 환경 변수가 없으면 제한하지 않는다.

## 환경 변수

이름과 의미는 `.env.example`과 README의 Deploy가 적는다.
