# 목표: 분류기에 맡길 일과 사람이 볼 일을 나눠 보고서로 남기기

Anthropic은 2026년 3월 25일 auto 모드 설계 글에서, 사용자가 수동 권한 요청의 93%를 승인한다고 밝혔다(승인 피로). auto 모드는 입력 층 탐지기와 출력 층 분류기가 사람 승인을 대신하지만, 당시 시험에서 월권 행동의 17%를 놓쳤다고 스스로 보고했다. 분류기는 사용자 메시지와 도구 호출만 봤고, 세부는 이후 문서에서 바뀌었다.
이 키트는 내 권한 규칙을 읽어 **분류기에 맡길 일 / 기본 차단 / 사람이 직접 볼 일**로 나누는 보고서를 만든다. 설정 키 이름은 필요할 때만 현재 공식 문서로 확인하고, 문서 장문을 베끼지 않는다. 기본은 **읽기 전용 점검**이다.

## 절대 지킬 것

- 권한 모드를 바꾸거나 auto 모드를 켜지 않는다.
- 홈 디렉터리(`~/`)의 파일과 `.claude/settings.local.json`은 **읽기만** 한다. 고칠 일은 보고서에만 적는다.
- 설정 파일 전체를 출력하지 않는다. `permissions`, `autoMode`, 최상위 `disableAutoMode`만 꺼낸다. 키·토큰 값은 출력하지 않는다. Authorization·token·key가 든 규칙 문자열은 전체를 ***로 가린다. Windows에서 `~`는 `%USERPROFILE%`이다.
- 코드를 수정하거나 푸시, 배포, 삭제, 설치 명령을 실행하지 않는다. 읽기 확인용으로만 `claude --version`, `claude auto-mode defaults`(동작할 때), `git status --short .claude/settings.json`, JSON 파서를 쓴다. `claude auto-mode reset`은 실행하지 않는다.

## 0. 맞는지 먼저 판단하기

- `.claude/settings.json`, `.claude/settings.local.json`, `~/.claude/settings.json` 중 하나라도 있는지 본다.
- 세 파일 어디에도 `permissions`·`autoMode`가 없으면 보고서를 만들지 말고 알리고 멈춘다. 단, 세 파일이 모두 없고 `claude --version`이 성공하면 "설정 없음, 기본 규칙"과 `claude auto-mode defaults` 결과만 담은 짧은 보고서를 원하는지 묻고, 원하지 않으면 멈춘다. 이때 settings 교체는 건너뛴다.

## 1. 권한 규칙 읽기 (읽기 전용)

추측하지 말고 실제로 읽는다. 없는 파일은 "없음".

- 세 파일에서 `permissions.allow` / `ask` / `deny` / `defaultMode`, `autoMode`, `disableAutoMode`(최상위 또는 `permissions` 아래)를 읽는다.
- `claude --version`이 있으면 버전을 적는다.
- `claude auto-mode defaults`가 동작하면 기본 허용·차단을 읽고, 현재 [permission modes](https://code.claude.com/docs/en/permission-modes) / [auto-mode config](https://code.claude.com/docs/en/auto-mode-config) 문서와 **한 줄로만** 대조한다. 키가 어디에 있어야 하는지는 문서 URL을 적고 장문을 쓰지 않는다.
- 프로젝트 설정에만 있고 문서상 무시되는 항목(`autoMode`를 프로젝트에 둔 경우, `defaultMode: "auto"` 등)은 "무시됨" + 사용자가 홈에서 할 일로만 적는다.
- `disableAutoMode`가 있으면 위치를 보고서 맨 위에 적는다.

## 2. 세 줄로 나누기 (기사 claim)

`permissions.allow` 각 규칙:

- **넓음**: `Bash(*)`, 와일드카드 인터프리터, 패키지 매니저 실행 등. auto에 들어갈 때 버려지는 유형이면 표시한다(현재 문서 기준). 다른 모드에서는 그대로다.
- **좁음**: 명령이 고정된 규칙. 인자가 열린 `*`는 "판단 필요".
- **판단 필요**: 위 둘로 나누기 어려움. 이유와 함께.

`ask`·`deny`는 분류기보다 먼저 적용될 수 있으므로 **사람 확인 지점**으로 표에 옮긴다.

레포 작업을 기사 틀로 세 줄 요약한다.

1. **분류기(또는 기본 허용)에 맡겨도 되는 일** — 로컬 파일, 선언된 의존성 설치 등. 모호하지 않은 일.
2. **기본 차단에 해당하는 일** — 강제 푸시, 프로덕션 배포 등. 이 레포에 필요한지 사용자에게 묻는다.
3. **사람이 직접 볼 일** — 분류기가 의도를 잘못 읽기 쉬운 모호한 요청, 넓은 allow가 열린 채인 작업. 3월 글의 미탐·승인 피로를 이유로 적는다.

## 3. 계획을 보여주고 승인받기

승인 전에는 파일을 만들거나 고치지 않는다.

- 1~2단계 표와 세 줄 분류
- 만들 보고서: `docs/auto-mode-audit.md` (이미 있으면 다른 이름, `docs/` 없으면 생성 고지)
- 선택: 레포 `.claude/settings.json`의 **넓은 allow**를 사용자가 말한·README/Makefile에 적힌 **고정 명령**으로만 좁히기. `*` 인자·`npm run`/`pnpm run` 후보는 에이전트가 먼저 제안하지 않는다. 승인 요청에 적어 둔다.
  - 팀·모든 모드에 미치는 영향
  - auto에서는 넓은 규칙이 이미 버려질 수 있어, 이 교체는 **다른 모드의 열린 범위를 줄이는** 변경이라는 점
- 홈·`settings.local.json`의 넓은 규칙은 고치지 않고 보고서에만 적는다.

## 4. 승인된 범위만 적용하기

- 교체 전 `git status --short .claude/settings.json`이 깨끗하지 않으면 다시 승인받는다.
- `docs/auto-mode-audit.md`를 만든다. 점검 날짜, 버전, 규칙 표, 세 줄 분류, ask·deny 사람 확인 지점, 너무 넓은 규칙, 권장 조치, 홈에서 사용자가 직접 할 일만 담는다. 설정 레퍼런스 장문을 베끼지 않는다.
- 승인한 경우에만 `.claude/settings.json`에서 넓은 규칙을 좁은 규칙으로 최소 교체한다. 다른 키는 건드리지 않는다.

## 5. 실행해서 확인하기

- 수정한 파일이면 JSON 파서로 확인한다.
- 교체한 규칙이 승인 목록과 같은지 다시 읽어 비교한다.
- `checklist.md`를 하나씩 점검하고 보고한다.
