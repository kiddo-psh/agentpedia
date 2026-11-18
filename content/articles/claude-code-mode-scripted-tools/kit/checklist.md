# 점검 체크리스트

## 현황
- [ ] Claude Code도 `.claude/`도 없으면 보고서를 만들지 않고 멈췄다(해당 없음).
- [ ] 버전(가능하면), permissions·PreToolUse·Code Mode env를 세 설정에서 읽었다.
- [ ] REPL·Bash(또는 Bash 포함) matcher를 구분해 적었다.
- [ ] 문서 대조는 URL과 한 줄만 적었고, 설정 장문을 베끼지 않았다.

## 분류 (기사 claim)
- [ ] 작업을 **자유 턴 / 스크립트 후보 / 런타임 가드 필요**로 나눴다.
- [ ] 런타임 가드 항목에 분류기가 스크립트만 보고 런타임 경로를 못 본다는 이유를 적었다.
- [ ] 기존 REPL 훅 유무를 적었다.

## 변경
- [ ] 표와 훅 초안 계획을 보여주고 승인받은 뒤에만 파일을 만들거나 고쳤다.
- [ ] `docs/code-mode-boundary.md`에 날짜, 표, 사각, 권장 조치, 홈 할 일이 있다. 설정 백과사전 문단은 없다.
- [ ] Code Mode env를 바꾸지 않았고, 권한 모드·auto를 켜지 않았다.
- [ ] 홈·`settings.local.json`은 수정하지 않았다.
- [ ] 승인한 경우에만 `.claude/hooks/code-mode-repl-check.sh`(또는 합의한 이름)와 settings의 PreToolUse `REPL` 항목을 추가했고, 다른 키는 그대로다.
- [ ] settings JSON과(해당 시) `bash -n`으로 훅 구문을 실행해 확인했다.
- [ ] CLAUDE.md·AGENTS.md에 검증 명령을 덧붙이지 않았다.
- [ ] 보고서에 키·토큰 값이 없다.
- [ ] 기존 보고서를 덮어쓰지 않았다.
- [ ] 코드 수정·푸시·배포·삭제·설치를 하지 않았다.
