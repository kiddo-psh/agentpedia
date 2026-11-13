# AI 학습 플랫폼 MVP 설계

> 상태: 초안 · 2026-11-11
> 핵심 가설: **"기사를 읽은 개발자가 그 방법을 자기 프로젝트에 실제로 적용한다."**
> MVP는 이 가설 하나만 검증한다. 커뮤니티는 가설이 맞았을 때 붙인다.

---

## 1. 사용 흐름 (먼저 쓰고, 타입은 여기서 도출)

### 흐름 A: 웹에서 읽고 바로 적용

1. 사용자가 `/a/karpathy-software-3` 기사를 읽는다.
2. 기사 끝 "적용 키트" 맨 위의 진단 프롬프트(frontmatter `tryIt`, 읽기 전용)를 복사한다. 이때 `apply_event(channel: web_copy)`가 기록된다.
3. 기사 끝의 "적용 키트"에서 `CLAUDE.md` 스니펫과 스킬 파일을 받는다. 이때 `kit_download`가 기록된다.

### 흐름 B: 에이전트에서 적용 (핵심 차별점)

```bash
claude mcp add --transport http ai-learn https://<도메인>/mcp
```

```
> /mcp__ai-learn__apply_article karpathy-software-3
```

1. MCP 프롬프트가 기사 핵심 내용, 적용 키트, 단계별 지시를 에이전트에게 넘긴다.
2. 에이전트는 사용자 레포를 읽고 적용 가능성을 평가한 뒤 계획을 제안한다. 사용자가 승인하면 구현한다.
3. 대화 중 에이전트가 필요하면 `search_articles`나 `get_article`로 관련 기사를 더 찾아본다.

### 흐름 C: 토론

로그인(GitHub OAuth)한 사용자는 기사에 댓글을 달고, 댓글에 1단계까지 답글을 단다.

---

## 2. MVP 범위

### 포함

| 기능 | 설명 |
|---|---|
| 기사 목록 | 카테고리 필터 (인물 / 트렌드 / 창업 사례 / 보안) |
| 인터랙티브 기사 | MDX와 소수의 전용 컴포넌트 (아래 4절) |
| 적용 키트 | 기사마다 프롬프트, 스킬 파일, 설정 스니펫, 체크리스트 |
| MCP 서버 | 원격 HTTP, 읽기 전용, 인증 없음 |
| 댓글 | GitHub 로그인, 답글 1단계 |
| 적용 이벤트 로깅 | 핵심 지표 측정용 |
| `/connect` 페이지 | Claude Code, Cursor 등 클라이언트별 MCP 연결 가이드 |

### 제외 (가설 검증 후)

- 사용자 글쓰기, 기사 인용 글, 프로젝트 쇼케이스 → 초기에는 디스코드로 대체
- 좋아요, 북마크, 알림, 팔로우
- 사용자가 직접 기사를 올리는 기능
- 전문 검색 엔진 (기사 20개 수준에서는 단순 문자열 매칭으로 충분)
- 유료화

### 성공 지표

| 지표 | 정의 |
|---|---|
| **적용률 (북극성)** | 기사 조회 중 적용 이벤트가 1건 이상 발생한 비율 |
| MCP 활성 클라이언트 | 주간 MCP 호출이 발생한 고유 클라이언트 수 (익명 해시) |
| 재방문 | 4주 안에 2회 이상 방문한 사용자 비율 |

---

## 3. 아키텍처

### 검토한 두 가지 구조

| | **A. 콘텐츠는 git, 단일 앱 (채택)** | B. 콘텐츠는 DB/CMS, MCP는 별도 패키지 |
|---|---|---|
| 기사 저장 | 레포의 MDX 파일 | Postgres 또는 헤드리스 CMS |
| MCP 배포 | 같은 Next.js 앱의 `/mcp` 경로 (원격 HTTP) | npm 패키지 (stdio, `npx`로 실행) |
| 사용자 설치 | 명령어 한 줄, 설치 없음 | Node 필요, 버전 관리 필요 |
| 기사 수정 | git 커밋 + PR 리뷰 + 버전 기록 | 관리자 UI 필요 |
| 인터랙티브 컴포넌트 | MDX로 자연스럽게 사용 | 별도 렌더링 규칙 필요 |
| 단점 | 비개발자 필자 참여가 어려움 | 만들 게 두 배 |

**A를 고른 이유:** 처음 기사 15~20개는 운영자 한 명이 직접 쓴다. 그래서 git 기반이 가장 싸고 품질 관리도 쉽다. MCP를 같은 앱에 두면 웹과 MCP가 **같은 콘텐츠 로더**를 쓰게 되어 두 경로의 내용이 어긋날 수 없다. 외부 필자가 생기면 그때 B로 옮긴다.

### 구성도

```
          ┌──────────────── Next.js 앱 (Vercel) ─────────────────┐
브라우저 ──▶ /, /a/[slug], /connect   (SSG)                        │
          │        │                                             │
에이전트 ──▶ /mcp  (Streamable HTTP, stateless)                   │
          │        │                                             │
          │        ▼                                             │
          │   content/loader.ts  ◀── content/articles/**/*.mdx   │
          │        │                 (빌드 시 zod 검증)            │
          │        ▼                                             │
          │   db (Drizzle) ──▶ Postgres (Neon)                   │
          │     user, comments, events                          │
          └──────────────────────────────────────────────────────┘
```

### 기술 스택 (기본값, 바꿔도 구조는 같음)

- **Next.js (App Router) + TypeScript**
- **MDX** (`@next/mdx` 또는 `next-mdx-remote`) + **zod**로 frontmatter 검증
- **Postgres** (Neon, Vercel 통합. 로컬은 PGlite) + **Drizzle ORM**
- **Better Auth** GitHub 로그인 (Auth.js v5는 아직 베타라 교체)
- **MCP**: `@modelcontextprotocol/sdk`, Next.js 어댑터는 `mcp-handler`
- 배포: Vercel (Production 브랜치 `master`), DB는 Vercel Marketplace의 Neon 통합

---

## 4. 콘텐츠 모델

### 디렉터리

```
content/articles/
  karpathy-software-3/
    index.mdx          # 본문 + frontmatter
    kit/
      prompt.md        # 메인 적용 프롬프트 (MCP 프롬프트의 본체)
      CLAUDE.md        # 붙여 넣을 설정 스니펫 (선택)
      skills/…/SKILL.md  (선택)
      checklist.md     # 적용 후 스스로 확인할 항목
```

### Frontmatter 스키마

```ts
// src/content/schema.ts
import { z } from "zod";

export const Category = z.enum(["people", "trends", "startup", "security"]);

export const Source = z.object({
  id: z.string(),                       // 본문 <Quote source="s1">에서 참조
  title: z.string(),
  url: z.string().url(),
  author: z.string(),
  kind: z.enum(["video", "podcast", "talk", "blog", "paper", "thread"]),
  publishedAt: z.coerce.date(),
});

export const ArticleMeta = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string(),
  summary: z.string().max(200),         // 목록과 MCP 검색 결과에 사용
  category: Category,
  people: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  sources: z.array(Source).min(1),      // 출처 없는 기사는 빌드 실패
  keyIdeas: z.array(z.string()).min(1).max(7), // MCP get_article의 핵심
  difficulty: z.enum(["intro", "practical", "deep"]),
  draft: z.boolean().default(false),    // true면 프로덕션 목록과 MCP에서 숨김
  publishedAt: z.coerce.date(),
  updatedAt: z.coerce.date().optional(),
});
export type ArticleMeta = z.infer<typeof ArticleMeta>;
```

### 잘못된 인용을 구조로 막기

유명인 발언을 잘못 옮기는 것이 가장 큰 신뢰 리스크다. 그래서 규칙을 글로 쓰는 대신 빌드에서 강제한다.

- 인용은 `<Quote source="s1" at="12:34">…</Quote>` 컴포넌트로만 쓴다.
- `source`가 frontmatter의 `sources[].id`에 없으면 **빌드가 실패한다.**
- 영상이나 팟캐스트 출처인데 `at`(타임스탬프)이 없으면 빌드가 실패한다.
- 렌더링할 때 원문 링크에 타임스탬프를 붙인다 (`?t=754`).

### 인터랙티브 컴포넌트

| 컴포넌트 | 역할 |
|---|---|
| `<KeyIdea>` | 핵심 주장 하나를 카드로 강조 |
| `<Quote source at>` | 출처가 검증된 인용 |
| `<Compare>` | 이전 방식과 새 방식 비교 표 |
| `<Term id>` | 용어를 누르면 정의가 팝오버로 뜸 |

`<TryIt>`과 `<Steps>`는 2026-11-12에 없앴다. Steps는 키트 `prompt.md`와 중복이었고, 진단 프롬프트는 frontmatter `tryIt`으로 옮겨 키트 섹션 맨 위에 둔다. 적용은 한 곳에서만 한다.

---

## 5. 데이터베이스 모델

콘텐츠는 DB에 넣지 않는다. DB에는 사용자가 만드는 데이터만 저장한다.

> 4주차 구현 기준으로 갱신했다. 실제 정의는 `src/db/schema.ts`.

```ts
// Better Auth가 관리: user, session, account, verification (src/db/auth-schema.ts, CLI로 생성)

comments {
  id            uuid pk
  articleSlug   text not null           -- 콘텐츠 slug 참조 (FK 아님)
  userId        text fk -> user.id (cascade)
  parentId      uuid fk -> comments.id null (cascade)  -- 답글은 1단계만 (앱에서 검사)
  body          text not null           -- 일반 텍스트, 2000자 제한
  createdAt     timestamptz default now()
  deletedAt     timestamptz null        -- soft delete, 답글 스레드 유지
  index (articleSlug, createdAt)
}

events {
  id            bigserial pk
  kind          text not null  -- 'view' | 'web_copy' | 'kit_download'
                               -- | 'mcp_get_article' | 'mcp_get_kit' | 'mcp_prompt'
  articleSlug   text not null
  visitorHash   text null      -- IP + user-agent의 일 단위 솔트 해시. 원문 저장 안 함
  userId        text null fk -> user.id (set null)
  createdAt     timestamptz default now()
  index (articleSlug, createdAt)
}
```

**설계 메모**

- `articleSlug`에 FK를 걸지 않는다. 콘텐츠의 원천은 git이고, slug는 빌드 시 존재 여부를 검증한다.
- 적용률을 구하려면 분모(조회)가 필요해서, 처음 설계의 `apply_events`를 `events`로 바꾸고 `view`를 추가했다.
  적용률 = 같은 날 웹에서 적용(복사·다운로드)한 방문자 수 / 조회한 방문자 수. `GET /api/metrics`로 본다.
- `events`는 append-only다. 기록은 응답을 보낸 뒤(`after()`) 하며, 실패해도 요청을 막지 않는다.
- 방문자 해시는 날마다 바뀌어 날짜를 넘어 이어 붙일 수 없다.
- 로컬 개발은 `DATABASE_URL` 없이 임베디드 PGlite(`.data/`)를 쓰고, 프로덕션은 Neon Postgres를 쓴다. 앱은 풀러 URL(`DATABASE_URL`), 마이그레이션은 직접 URL(`DATABASE_URL_UNPOOLED`)로 붙는다.

---

## 6. MCP 서버 설계

### 원칙

- **읽기 전용, 인증 없음.** 공개 콘텐츠만 제공하므로 연결 장벽을 0으로 만든다.
- **도구는 적게, 응답은 에이전트가 쓰기 좋게.** 사람이 읽을 HTML이 아니라 구조화된 마크다운을 반환한다.
- **웹과 같은 로더를 쓴다.** `src/content/loader.ts`가 유일한 진입점이다.

### 노출 목록

| 종류 | 이름 | 입력 | 반환 |
|---|---|---|---|
| tool | `search_articles` | `query?`, `category?`, `limit=10` | slug, 제목, 요약, 카테고리, 키트 유무 목록 |
| tool | `get_article` | `slug` | 핵심 아이디어, 출처 링크, 본문 요약(마크다운), 키트 파일 목록 |
| tool | `get_apply_kit` | `slug` | 키트 파일 전체 (`path`, `content`) |
| prompt | `apply_article` | `slug` | 레포에 적용하는 작업 지시 (아래) |

`apply_article`은 MCP **prompt**로 만든다. Claude Code에서는 `/mcp__ai-learn__apply_article`이라는 슬래시 명령으로 바로 나타나기 때문에, 사용자가 도구 이름을 몰라도 시작할 수 있다.

### `apply_article` 프롬프트 골격

```
당신은 사용자의 현재 프로젝트에 아래 기사의 방법을 적용하려 합니다.

## 기사: {title}
핵심 아이디어:
{keyIdeas}

## 적용 키트
{kit/prompt.md}
{kit 파일 목록과 내용}

## 진행 방식
1. 현재 레포 구조와 설정을 먼저 읽고, 이 방법이 맞는지 판단하세요.
   맞지 않으면 이유를 말하고 멈추세요.
2. 바꿀 파일과 이유를 담은 적용 계획을 제시하고 사용자 승인을 받으세요.
3. 승인된 범위만 구현하세요.
4. kit/checklist.md로 결과를 점검하세요.

출처: {sources}
```

1단계에 "맞지 않으면 멈춰라"를 넣은 것이 중요하다. 모든 방법이 모든 프로젝트에 맞지는 않는다. 억지 적용은 사용자 신뢰를 잃게 만든다.

### 타입 스케치

```ts
// src/content/loader.ts — 웹과 MCP가 함께 쓰는 유일한 콘텐츠 진입점
export type KitFile = { path: string; content: string };
export type Article = ArticleMeta & { bodyMarkdown: string; kit: KitFile[] };

export function listArticles(filter?: { category?: Category; query?: string }): ArticleMeta[];
export function getArticle(slug: string): Article | null;

// src/mcp/server.ts
export function registerTools(server: McpServer): void;   // 도구 3개 + 프롬프트 1개
// src/app/mcp/route.ts
export { handler as GET, handler as POST };                // mcp-handler 래핑

// src/events/record.ts
export function recordEvent(db: Db, e: TrackedEvent): Promise<void>;  // 실패해도 throw하지 않는다
// src/events/track.ts
export function trackAfterResponse(request: Request, e: Omit<TrackedEvent, "visitorHash">): void;
// MCP 서버는 이벤트 콜백을 받는다: createAgentpediaServer(origin, onEvent)
```

### 오류 처리

- 없는 slug: 오류를 내지 않고 `search_articles` 결과 상위 3개를 "이것을 찾으셨나요?"로 반환한다. 에이전트가 스스로 복구할 수 있게 하기 위해서다.
- 레이트 리밋: IP 기준으로 분당 60회. Vercel 미들웨어로 처리한다.

---

## 7. 프로젝트 구조

```
side-pjt/
  content/articles/<slug>/{index.mdx, kit/}
  src/
    app/
      page.tsx                 # 목록
      a/[slug]/page.tsx        # 기사 (SSG)
      a/[slug]/kit/route.ts    # 키트 zip 다운로드
      connect/page.tsx         # MCP 연결 가이드
      mcp/route.ts             # MCP 엔드포인트
      api/comments/route.ts
      api/events/route.ts
    content/{schema.ts, loader.ts, validate.ts}
    components/mdx/{KeyIdea,Quote,Compare,Term}.tsx
    mcp/server.ts
    db/{schema.ts, client.ts}
    events.ts
  docs/design.md
```

---

## 8. 일정 (주 10~15시간 기준)

| 주차 | 목표 | 완료 기준 |
|---|---|---|
| 1 | 콘텐츠 파이프라인 | 스키마 검증, 인용 검증 빌드 실패 테스트, 기사 3개 |
| 2 | 기사 페이지 + 컴포넌트 + 키트 | 웹에서 읽고 키트를 받을 수 있음 |
| 3 | MCP 서버 | Claude Code에서 `apply_article`로 실제 레포 적용 성공 |
| 4 | 로그인, 댓글, 이벤트 로깅 + 기사 15개 | 지표 뷰에서 적용률 확인 |
| 5 | 비공개 베타 (지인 개발자 20~30명) | 피드백 수집, 적용률 측정 |

---

## 9. 열린 질문

1. **기사 작성 방식:** AI 초안을 사람이 검수할지, 직접 쓸지. 둘 다 출처 검증 규칙은 같다.
2. **언어:** 한국어 전용으로 시작할지, 처음부터 영어도 함께 할지. (권장: 한국어 전용)
3. **도메인과 서비스 이름**
4. **저작권 기준:** 직접 인용 분량 한도 (권장: 인용 하나에 2~3문장, 기사당 5개 이하)
