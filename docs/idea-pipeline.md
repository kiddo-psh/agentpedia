# 글감(idea) 수집 파이프라인

1차 출처 메타데이터만 모아 `content/ideas.yaml` 백로그에 쌓습니다. **자동 발행하지 않습니다.** 사람이 shortlist한 뒤 [write-article](../.claude/workflows/write-article.js)로 넘깁니다.

원문 전문은 저장하지 않습니다(저작권). 링크·제목·짧은 `tension`/`kitIdea`만 둡니다.

## 백로그 형식 (`content/ideas.yaml`)

이미 레포에 있는 글감 파일 형식을 그대로 씁니다. **write-article 스킬 인자 이름과 맞춥니다.**

| 필드 | write-article | 설명 |
|---|---|---|
| `slug` | ✓ | 기사 디렉터리 후보 |
| `topic` | ✓ | 한 줄 주제 |
| `category` | ✓ | `people` \| `trends` \| `startup` \| `security` |
| `people` | ✓ | 자유 형식 인물 힌트(아직 people.yaml id 아님) |
| `sources` | ✓ | URL 문자열 배열 |
| `publishedAt` | | 출처 날짜(확인된 경우) |
| `sourceKind` | | `blog` \| `paper` \| `video` \| … |
| `tension` | | 기사가 뒤집을 통념 |
| `kitIdea` | | 키트가 할 일 |
| `primaryVerified` | | 조사자가 1차 출처를 열었는지 |
| `confidence` | | `high` \| `medium` \| `low` |
| `status` | | `idea` \| `picked` \| `dropped` |
| `note` | | 선택 |
| `score` | | 수집기 휴리스틱(선택) |
| `collectedAt` | | 자동 수집일(선택) |

기사가 `content/articles/<slug>/`에 올라가면 해당 항목을 파일에서 **삭제**합니다(`dropped`는 재수집 방지용으로 남겨도 됩니다).

## 실행

```bash
# 소스 설정: content/ideas-sources.yaml
npm run ideas:collect                 # HN + 공식 블로그 + YouTube → ideas.yaml append
npm run ideas:collect -- --dry-run    # 쓰기 없이 후보만 출력
npm run ideas:collect -- --source hn --limit 10 --verbose
```

수집기는 기존 `ideas.yaml`의 slug·URL과 `content/articles/*/index.mdx`의 slug·`sources[].url`을 보고 중복을 건너뜁니다.

자동 수집 행은 `primaryVerified: false`, `confidence: low`입니다. `kitIdea`는 자리표시자이므로 shortlist 때 고칩니다.

## Shortlist → 작성

1. `content/ideas.yaml`에서 후보를 고른다.
2. `status: picked`로 바꾸고 `tension` / `kitIdea` / `people`을 다듬는다.
3. write-article에 넘긴다:

```json
[
  {
    "slug": "persistent-agents-trusted-control-plane",
    "topic": "…ideas.yaml의 topic…",
    "category": "security",
    "people": ["…"],
    "sources": ["https://…"]
  }
]
```

4. 초안이 랜딩하면 ideas.yaml에서 해당 항목을 지운다.

## 소스 (v1)

| 소스 | 방식 | 비밀키 |
|---|---|---|
| Hacker News | Algolia API, 점수·키워드 필터 | 없음 |
| OpenAI News | RSS | 없음 |
| Anthropic | HTML 목록(제목·URL만; 공개 RSS 없음) | 없음 |
| YouTube | 채널 Atom (`feeds/videos.xml`) | **없음** (Data API 불필요) |
| X | 후순위 | — |

채널·피드·HN 쿼리는 `content/ideas-sources.yaml`에서 고칩니다.

## 스케줄

[`.github/workflows/collect-ideas.yml`](../.github/workflows/collect-ideas.yml)이 주 1회 `npm run ideas:collect`를 돌립니다.

| | |
|---|---|
| cron (UTC) | `0 0 * * 1` |
| 시각 | **월요일 09:00 Asia/Seoul (KST)** (= 월요일 00:00 UTC) |
| 결과 | 변경이 있으면 `content/ideas.yaml`만 master에 커밋 (`content: refresh ideas backlog from weekly collect`). 변경 없으면 커밋 생략 |
| 수동 실행 | Actions → **collect-ideas** → **Run workflow** (`workflow_dispatch`) |

비밀키는 필요 없습니다(HN / RSS / YouTube Atom).
