# 목표: Code Mode 스크립트 경계와 런타임 사각을 보고서로 남기기

Claude Code의 실험 기능 Code Mode는 도구를 한 번씩 부르는 대신 JavaScript로 묶어 실행한다. auto 모드에서는 분류기가 개별 도구 호출이 아니라 스크립트를 심사하고, 검색으로 얻은 경로 같은 런타임 값은 보지 못한다. 이 키트는 레포의 훅·권한 규칙을 읽어 **자유 턴 / 스크립트 후보 / 런타임 가드 필요**로 나누는 보고서를 만들고, 승인하면 `REPL` PreToolUse 훅 초안만 추가한다. 설정 키 이름은 필요할 때만 현재 공식 문서로 확인하고 장문을 베끼지 않는다. 기본은 **읽기 전용 점검**이다.

## 절대 지킬 것

- `CLAUDE_CODE_EXPERIMENTAL_CODE_MODE`를 켜거나 끄지 않는다. 권한 모드를 바꾸거나 auto 모드를 켜지 않는다.
- 홈(`~/`)과 `.claude/settings.local.json`은 **읽기만** 한다. 고칠 일은 보고서에만 적는다.
- 검증 명령을 `CLAUDE.md`·`AGENTS.md`에 덧붙이지 않는다. 그건 Boris Cherny 키트 범위다.
- 코드를 수정하거나 푸시, 배포, 삭제, 설치 명령을 실행하지 않는다. 읽기 확인은 `claude --version`, `git status --short`, JSON/파일 읽기, 훅 스크립트 `bash -n`(구문만)으로 한정한다.
- 키·토큰 값은 출력하지 않는다. Authorization·token·key가 든 문자열은 ***로 가린다.

## 0. 맞는지 먼저 판단하기

아래를 확인한다. 해당하지 않으면 **아무것도 바꾸지 말고 멈춘 뒤** 이유를 알린다.

- 현재 디렉터리가 사용자 레포다.
- `.claude/`가 있거나 `claude --version`이 성공한다. 둘 다 아니면 Code Mode 경계를 점검할 대상이 없다고 알리고 멈춘다.
- `docs/code-mode-boundary.md`가 이미 있으면 덮어쓰지 말고 다른 이름을 제안한 뒤, 사용자가 고를 때까지 파일을 만들지 않는다.

## 1. 현황 읽기 (읽기 전용)

추측하지 말고 실제로 읽는다. 없는 파일은 "없음".

- `claude --version`이 되면 버전을 적는다. v2.1.323 미만이면 보고서에 "이 버전은 문서상 Code Mode 미지원 가능"만 한 줄로 적고, 설정 백과사전을 쓰지 않는다.
- `.claude/settings.json`, `.claude/settings.local.json`, `~/.claude/settings.json`에서 `permissions`(allow·ask·deny·defaultMode), `hooks.PreToolUse`, `env.CLAUDE_CODE_EXPERIMENTAL_CODE_MODE`만 꺼낸다.
- PreToolUse 항목 중 matcher가 `REPL`인 것과 `Bash`(또는 Bash를 포함하는 matcher)인 것을 표로 나눈다.
- 넓은 allow(`Bash(*)` 등)가 있으면 "분류기·훅 사각과 겹치면 위험"으로 표시만 한다. 권한 규칙을 이 키트에서 좁히지 않는다(그건 auto-mode 키트 범위에 가깝다).

현재 [Code Mode](https://code.claude.com/docs/en/code-mode) / [Hooks](https://code.claude.com/docs/en/hooks) 문서와 **한 줄로만** 대조한다. 키가 어디에 있어야 하는지는 URL을 적고 장문을 쓰지 않는다.

## 2. 작업 유형과 사각 나누기 (기사 claim)

레포에서 자주 할 법한 작업을 README·스크립트·최근 이슈 제목 등 **읽기만**으로 골라 최대 8개를 적고 분류한다.

1. **자유 턴이 나은 일** — 한두 번 읽고 방향을 정하는 탐색, 짧은 계획 대화.
2. **스크립트 후보** — 다파일 반복 수정, 검색 후 필터, 독립 명령 병렬 실행.
3. **런타임 가드 필요** — 검색·계산으로 경로·인자가 나중에 정해진 뒤 Edit/Bash가 따라오는 흐름. 분류기가 스크립트 텍스트만 보는 사각과 연결해 이유를 적는다.

기존 `REPL` PreToolUse가 없으면 사각 보완 후보로 표시한다. 이미 있으면 무엇을 검사하는지 한 줄로 요약한다.

## 3. 계획을 보여주고 승인받기

승인 전에는 파일을 만들거나 고치지 않는다.

- 1~2단계 표와 세 줄 분류
- 만들 보고서: `docs/code-mode-boundary.md` (`docs/` 없으면 생성 고지, 이름 충돌 시 대안)
- 선택: 레포 `.claude/hooks/code-mode-repl-check.sh`와 `.claude/settings.json`의 `hooks.PreToolUse`에 matcher `REPL` 항목 추가
  - 훅은 `tool_input.code`(없으면 입력 JSON 전체)를 읽어, 사용자가 승인한 위험 부분 문자열만 차단하는 **최소 초안**이다
  - 기본 제안 패턴 예: `rm -rf`, `git push --force`, `git push -f`가 코드 문자열에 있으면 exit 2로 차단. 사용자가 패턴을 고친다
  - 기존 hooks 배열·permissions·env는 그대로 두고 항목만 추가한다. 전후 JSON 차이를 보여 준다
  - Code Mode를 켜라는 안내를 설정에 넣지 않는다. 사용자가 셸/홈 설정에서 켤지 보고서에만 적는다

## 4. 승인된 범위만 적용하기

- 교체 전 `git status --short .claude/settings.json .claude/hooks`가 깨끗하지 않으면 다시 승인받는다.
- `docs/code-mode-boundary.md`를 만든다. 점검 날짜, 버전, env·훅·permissions 요약 표, 자유 턴/스크립트 후보/런타임 가드 표, 사각과 권장 조치, 홈에서 사용자가 직접 할 일만 담는다. 설정 레퍼런스 장문을 베끼지 않는다.
- 승인한 경우에만 훅 스크립트와 `PreToolUse` `REPL` 항목을 추가한다. 다른 키는 건드리지 않는다.

## 5. 실행해서 확인하기

- 수정한 settings면 JSON 파서로 확인한다.
- 훅 스크립트가 있으면 `bash -n`으로 구문만 확인한다(실행으로 도구를 막지 않는다).
- PreToolUse에 `REPL` matcher가 승인 내용대로인지 다시 읽어 비교한다.
- `checklist.md`를 하나씩 점검하고 보고한다.
