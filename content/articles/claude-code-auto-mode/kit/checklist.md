# 점검 체크리스트

## 현황
- [ ] 세 설정 파일 어디에도 `permissions`·`autoMode`가 없으면 보고서를 만들지 않고 그 사실만 알린 뒤 멈췄다(이 경우 아래 분류·변경 항목은 해당 없음). 세 파일이 모두 없고 사용자가 원하면 '설정 없음, 기본 규칙 적용'과 `claude auto-mode defaults` 결과만 담은 짧은 보고서를 만들고 settings.json 교체는 건너뛰었다.
- [ ] `.claude/settings.json`, `.claude/settings.local.json`, `~/.claude/settings.json`의 `permissions`(allow, ask, deny, defaultMode, disableAutoMode)와 `autoMode`, 최상위 `disableAutoMode` 항목을 읽었다.
- [ ] Claude Code 버전을 명령으로 확인했다(못 했다면 그 사실을 적었다).
- [ ] `claude auto-mode defaults`를 실행해 봤고, 동작 여부를 보고서에 적었다.
- [ ] 프로젝트 설정에 `defaultMode: "auto"`나 `autoMode`가 있으면 "무시됨"으로 표시했다.
- [ ] `disableAutoMode`(최상위 또는 `permissions` 아래)가 어느 파일에 있는지와 관리형 설정을 읽지 못했다는 점을 보고서에 적었다.

## 분류
- [ ] 분류 결과 세 줄(기본 허용, 기본 차단, 사람이 직접 확인)이 `docs/auto-mode-audit.md`에 들어 있다.
- [ ] 허용 규칙마다 넓음, 좁음, 판단 필요 중 하나를 붙였다.
- [ ] 이 레포의 작업을 기본 허용, 기본 차단, 사람이 직접 확인할 일로 나눴다.
- [ ] 기본 차단 작업이 필요한지 사용자에게 물었다.
- [ ] ask·deny 규칙을 표에 옮기고 사람 확인 지점으로 보고서에 적었다.
- [ ] 인자가 열린 좁은 규칙은 "판단 필요"로 표시하고 `autoMode.classifyAllShell` 안내를 사용자 할 일에 적었다(홈 파일은 고치지 않았다).

## 변경
- [ ] 3단계에서 표와 교체 계획을 보여주고 승인받은 뒤에만 파일을 만들거나 고쳤다.
- [ ] `docs/auto-mode-audit.md`가 있고 점검 날짜, 버전, 규칙 표, 권장 조치, 홈 디렉터리 항목이 들어 있다.
- [ ] 사용자가 교체를 승인하지 않았거나 교체할 규칙이 없으면 `.claude/settings.json`을 수정하지 않았다.
- [ ] 권한 모드를 바꾸지 않았고 auto 모드를 켜지 않았다.
- [ ] 홈 디렉터리 파일은 수정하지 않았다.
- [ ] 승인받은 규칙만 레포 `.claude/settings.json`에서 교체했고, 파일이 JSON 파서를 통과했다.
- [ ] 교체 후 `.claude/settings.json`의 `permissions`를 다시 읽어 3단계에서 승인받은 규칙 목록과 한 줄씩 비교했고, 교체 대상이 아닌 키는 바뀌지 않았다.
- [ ] `docs/auto-mode-audit.md`에 키·토큰 값이 들어가지 않았다.
- [ ] `.claude/settings.local.json`을 수정하지 않았다.
- [ ] 같은 이름의 기존 보고서를 덮어쓰지 않았다.
- [ ] 코드 수정, 푸시, 배포, 삭제, 설치 명령을 실행하지 않았다.
- [ ] `disableAutoMode`가 있으면 보고서 맨 위에 적었다.
- [ ] 대신 넣은 좁은 규칙은 모두 사용자가 승인한 문자열 그대로이고, 에이전트가 먼저 제안한 규칙에는 `*` 인자 패턴과 `npm run`·`pnpm run` 같은 패키지 매니저 실행 규칙이 없다. 사용자가 이런 규칙을 승인했다면 승인 요청에 'auto 모드에서 남는지 확인 못 함'이라고 적었다.
