# 목표: Claude Code 권한 설정을 점검해 auto 모드에 맡길 범위 정하기

Anthropic은 2026년 3월 25일 auto 모드 설계 글에서, 사용자가 수동 권한 요청의 93%를 승인한다고 밝혔다. auto 모드는 승인을 분류기 모델에 맡기지만, 실제 월권 행동의 17%를 놓쳤다고 스스로 보고했다(3월 글이 시험한 분류기 기준이며 지금 분류기의 수치는 확인하지 못했다).
이 키트는 내 레포의 권한 설정을 읽고, 분류기에 맡길 일과 사람이 직접 볼 일을 나누는 보고서를 만든다. 기본은 **읽기 전용 점검**이다.

## 절대 지킬 것

- 권한 모드를 바꾸거나 auto 모드를 켜지 않는다.
- 홈 디렉터리(`~/`)의 파일과 `.claude/settings.local.json`은 **읽기만** 한다. 고칠 필요가 있으면 사용자가 직접 할 일을 보고서에 적는다.
- 설정 파일 전체를 출력하지 않는다. `permissions`, `autoMode`, 최상위 `disableAutoMode` 키만 아래 명령으로 꺼내 읽는다. `<파일>` 자리에 설정 파일 경로를 넣는다.

  ```
  node -e "const s=JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'));console.log(JSON.stringify({permissions:s.permissions,autoMode:s.autoMode,disableAutoMode:s.disableAutoMode},null,2).replace(/(Bearer\s+|sk-|ghp_|gho_|xox[bp]-)[A-Za-z0-9._-]+/g,(m,p)=>p+'***'))" <파일>
  ```

  - 키·토큰 값은 출력하거나 보고서에 적지 않는다. node 명령이 가린 결과만 읽는다.
  - Authorization·token·key 단어가 든 규칙, 그리고 정규식이 못 잡는 형태의 값(예: `X-Api-Key: ...`)이 보이는 규칙은 규칙 문자열 전체를 ***로 가려 보고서에 적는다.
  - Windows에서 `~`는 `%USERPROFILE%`이다.
- node가 없으면 설정 파일을 통째로 출력하지 말고 permissions·autoMode·disableAutoMode 블록만 직접 읽되 값은 위 규칙대로 가리고, 읽지 못했다면 확인 못 함이라고 적는다.
- 코드를 수정하거나 푸시, 배포, 삭제, 설치 명령을 실행하지 않는다.

## 0. 맞는지 먼저 판단하기

- 이 레포나 홈 디렉터리에서 Claude Code 설정(`.claude/settings.json`, `.claude/settings.local.json`, `~/.claude/settings.json`)이 하나라도 있는지 확인한다.
- `permissions`·`autoMode` 키가 세 파일 어디에도 없으면 보고서를 만들지 말고 그 사실만 알리고 멈춘다. 단, 세 파일이 모두 없고 `claude --version`이 성공하면 "현재 설정 없음, 기본 규칙이 적용됨"과 `claude auto-mode defaults` 결과만 담은 보고서를 원하는지 사용자에게 묻고, 원하지 않으면 아무것도 만들지 않고 멈춘다. 이때 4단계의 settings.json 교체는 건너뛴다.

## 1. 읽기 전용으로 현황 파악하기

명령은 추측하지 말고 실제로 실행해 결과를 확인한다. 없는 파일은 "없음"으로 적는다.

- 위 세 설정 파일에서 `permissions.allow`, `permissions.ask`, `permissions.deny`, `permissions.defaultMode`, `autoMode`, 그리고 최상위 `disableAutoMode`와 `permissions.disableAutoMode` 항목을 읽는다.
- `claude --version`이 있으면 실행해 버전을 적는다. 없으면 "확인 못 함"이라고 적는다.
- `claude auto-mode defaults`가 이 버전에서 동작하면 실행해 기본 규칙(JSON)을 읽는다. 동작하지 않으면 건너뛰고 그 사실을 적는다. 사용자 `~/.claude/settings.json`에 `autoMode`가 있으면 `claude auto-mode config`도 실행해 실제 적용 규칙을 읽고, 동작하지 않으면 그 사실을 적는다. 두 명령은 읽기 전용이며 출력만 읽는다(`claude auto-mode reset`은 실행하지 않는다). 기본 규칙은 공식 문서 https://code.claude.com/docs/en/permission-modes 와 대조한다.
- `autoMode` 블록이 프로젝트의 `.claude/settings.json`이나 `settings.local.json`에 있으면 분류기가 읽지 않으므로(https://code.claude.com/docs/en/auto-mode-config) "무시됨"으로 표시하고, `~/.claude/settings.json`으로 옮기는 일을 사용자 할 일로 보고서에 적는다.
- `disableAutoMode`(settings-reference가 '모든 파일'에서 인정하는 최상위 키, 그리고 permission-modes가 관리형 설정용으로 설명하는 `permissions.disableAutoMode`)가 세 파일 중 어디에 `"disable"`로 있으면 위치와 함께 보고서 맨 위에 적는다. 2026년 11월 공식 문서(https://code.claude.com/docs/en/settings-reference) 기준으로 이 키는 어느 설정 파일에 있어도 auto 모드를 권한 모드 순환에서 뺀다. 조직 전체에 강제하려면 관리형 설정을 쓴다. 관리형 설정은 읽지 못했다고 적는다. `permissions.disableAutoMode`도 최상위 키와 같은 키로 인정되며 어느 설정 파일에 있어도 적용된다(같은 문서 기준). 발견하면 위치와 함께 보고서 맨 위에 적는다.
- `defaultMode: "auto"`가 프로젝트의 `.claude/settings.json`이나 `settings.local.json`에 있으면 공식 문서상 무시되므로 따로 표시한다.

## 2. 위험 표시하기

`permissions.allow`의 각 규칙을 분류한다.

- **넓음**: 2026년 11월 공식 문서 기준으로 `Bash(*)`·`PowerShell(*)`, `Bash(python*)` 같은 와일드카드 인터프리터 규칙, 패키지 매니저 실행 명령 규칙, `Agent`·`Monitor` 허용 규칙. auto 모드에 들어갈 때 버려지고 나가면 다시 적용된다(https://code.claude.com/docs/en/permission-modes). 다른 모드에서는 그대로 적용된다.
- **좁음**: 2026년 11월 공식 문서 기준으로 `Bash(npm test)`처럼 명령이 정해진 규칙. 좁은 규칙은 auto 모드에서도 분류기보다 먼저 적용되므로 대체로 분류기가 보지 못한다(보호 경로 쓰기, `rm` 중요 경로 삭제 등 일부는 예외). 인자가 열려 있는 규칙(예: `Bash(npm test *)`)은 '판단 필요'로 표시하고, 모든 셸 명령을 분류기에 보내려면 사용자가 `~/.claude/settings.json`에 `autoMode.classifyAllShell: true`를 직접 추가할 수 있다고 보고서의 사용자 할 일에 적는다(공식 문서 https://code.claude.com/docs/en/auto-mode-config 기준). 이 키는 홈 파일 변경이므로 고치지 않고 보고서에만 적는다.
- **판단 필요**: 위 둘로 나누기 어려운 규칙. 이유와 함께 적는다.

`permissions.ask`와 `permissions.deny` 규칙은 분류기보다 먼저 적용되고, 명령 내용으로 범위를 좁힌 ask 규칙(예: `Bash(git push *)`)은 auto 모드에서도 확인을 묻는다. 두 규칙은 표에 그대로 옮기고, 사람 확인 지점으로 보고서에 적는다. 푸시 전에 사람 확인을 원하는 팀에는 `permissions.ask`에 `Bash(git push *)`, `Bash(gh pr create *)`를 두는 것을 권장 조치로 보고서에 적는다(적용은 사용자가 직접 한다).

그리고 이 레포의 작업을 다음 세 줄로 나눠 적는다.

- auto 모드의 기본 허용에 해당하는 일 (로컬 파일 작업, 선언된 의존성 설치 등. 작업 중인 레포의 기본 브랜치 푸시와 PR 생성도 2026년 11월 공식 문서 기준 기본 허용이다. https://code.claude.com/docs/en/auto-mode-config)
- 기본 차단에 해당하는 일 (강제 푸시, 프로덕션 배포 등). 이 레포에서 이런 일이 필요한지 사용자에게 묻는다.
- 사람이 직접 확인해야 할 일. 분류기가 의도를 잘못 읽을 수 있는 모호한 요청이 많은 작업을 적는다.

## 3. 계획을 보여주고 승인받기

다음을 보여주고 **사용자의 승인을 받은 뒤에만** 4단계를 진행한다.

- 1~2단계 결과 표 (규칙, 위치, 분류, 이유)
- 만들 보고서: `docs/auto-mode-audit.md` (`docs/` 폴더가 없으면 새로 만든다고 알리고, 같은 이름 파일이 이미 있으면 덮어쓰지 않고 다른 이름을 제안한다)
- 레포의 `.claude/settings.json`에서 교체할 넓은 허용 규칙과 대신 넣을 좁은 규칙(없으면 "없음"). 승인 요청에는 아래 네 가지를 반드시 적는다.
  - 교체할 규칙과 새 규칙: 좁은 규칙 후보는 사용자가 직접 말한 명령이나 README·Makefile에 적힌 고정 명령에서만 고르고(셸 히스토리는 읽지 않는다), 근거가 되는 파일 위치를 승인 요청에 함께 적는다. 인자를 여는 `*` 패턴은 제안하지 않는다. `npm run ...`, `pnpm run ...`처럼 패키지 매니저로 스크립트를 실행하는 규칙은 후보로 내지 않는다. 새 규칙은 사용자가 승인한 문자열 그대로만 쓴다.
  - 팀 전체와 모든 모드에 미치는 영향: 이 파일은 커밋하면 팀원 전체와 모든 권한 모드에 적용된다.
  - auto 모드에서의 동작: 2026년 11월 공식 문서(https://code.claude.com/docs/en/permission-modes) 기준으로 넓은 규칙은 auto 모드에서 이미 버려지므로 이 교체는 다른 모드의 범위를 줄이는 변경이다. 제안한 좁은 규칙은 auto 모드에서도 유지되어 분류기를 건너뛴다.
  - 확인하지 못한 점: 문서는 패키지 매니저 실행 명령을 버려지는 규칙으로 분류하지만 명령이 고정된 규칙도 해당하는지는 밝히지 않는다. 사용자가 이런 규칙을 승인해 넣더라도 auto 모드에서 남는지는 확인하지 못했다고 적는다.
- `settings.local.json`이나 홈 파일의 넓은 규칙은 고치지 않고 보고서에만 적는다.

## 4. 승인된 범위만 적용하기

- 교체 전에 `git status --short .claude/settings.json`로 이 파일이 git에서 깨끗한지 확인하고, 변경이 있으면 사용자에게 알리고 교체를 계속할지 다시 승인받는다.
- `docs/auto-mode-audit.md`를 만든다. 점검 날짜, Claude Code 버전, 규칙 표, 2단계의 세 줄 분류(기본 허용·기본 차단·사람이 직접 확인), ask·deny 규칙 기반 사람 확인 지점, 위험 항목별 권장 조치, 홈 디렉터리 항목(autoMode 이동, classifyAllShell 안내 포함)에 대해 사용자가 직접 할 일을 담는다.
- 승인한 규칙만 `.claude/settings.json`에서 교체하는 최소 수정으로 한다. 다른 설정은 건드리지 않는다.

## 5. 실행해서 확인하기

- 수정한 설정 파일이 올바른 JSON인지 파서로 확인한다. 예: `node -e "JSON.parse(require('fs').readFileSync('.claude/settings.json','utf8'))"`. `node`가 없으면 확인하지 못했다고 보고서에 적는다.
- 교체한 규칙이 사용자가 승인한 목록과 같은지 다시 읽어 비교한다.
- `checklist.md`의 항목을 하나씩 점검하고 결과를 보고한다.
