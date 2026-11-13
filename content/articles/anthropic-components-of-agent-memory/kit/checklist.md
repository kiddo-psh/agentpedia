# 점검 체크리스트

## 측정
- [ ] 자동 메모리 디렉터리, 레포의 `CLAUDE.md`, `.claude/CLAUDE.md`, `CLAUDE.local.md`, `AGENTS.md`, `.claude/AGENTS.md`가 모두 없으면 아무것도 바꾸지 않고 멈췄다.
- [ ] 자동 메모리 디렉터리 위치를 추측하지 않고 사용자에게 확인했다.
- [ ] 측정 전에 메모리 파일의 크기와 수정 시각(또는 sha256)을 기록했다.
- [ ] `MEMORY.md`의 줄 수와 바이트 크기를 실제 명령(`grep -c ''`, `wc -c`)으로 셌다.
- [ ] 200줄과 25KB(25,000바이트와 25,600바이트 두 기준) 중 먼저 닿는 한도를 계산했고, 한도 밖의 줄 범위를 보고서에 적었다.
- [ ] 보고서에 '25KB의 정의가 문서에 없어 두 기준을 함께 적는다'는 문장과 '한도를 넘는 줄은 로드되지 않는다'는 문장이 있다.
- [ ] 지시 파일(CLAUDE.md, AGENTS.md, .claude/AGENTS.md 등)별 줄 수를 세고 200줄 이상인 파일을 표시했다.
- [ ] AGENTS.md가 있고 작업 디렉터리나 그 위에 `CLAUDE.md`, `.claude/CLAUDE.md`, `CLAUDE.local.md` 중 하나라도 있으며 `@AGENTS.md` 가져오기가 없으면 AGENTS.md를 로드되지 않는 파일로 표시했다(Project instructions 설정을 확인한 뒤).
- [ ] 자동 메모리가 꺼져 있으면 MEMORY.md를 '현재 로드되지 않음'으로 표기하고 지시 파일만 점검했다.
- [ ] 주제별 파일의 개수와 파일별 크기를 보고서에 적었다.
- [ ] /config의 Project instructions 값(claude-md-or-agents-md, claude-md-and-agents-md, claude-md, managed-only)을 확인하고, 값에 따라 로드되는 지시 파일을 가려 표시했다.
- [ ] 환경 변수 `CLAUDE_CODE_DISABLE_AUTO_MEMORY`, `CLAUDE_CONFIG_DIR`, `CLAUDE_CODE_PROJECT_DIR_NAME`는 값(또는 미설정)만 확인했고, `--settings`·관리형 설정 파일이 있으면 같은 키의 값만 조회했다. 해당 파일이 없으면 해당 없음으로 적었다.

## 분류
- [ ] 항목마다 유지, 낡음, 중복, 이동 후보 중 하나로 분류하고 근거를 한 줄 적었다.
- [ ] "낡음" 판정은 레포를 열어 확인한 뒤에 했다.
- [ ] 사람이 정한 지시와 Claude가 배운 내용이 알맞은 곳에 있는지 확인했다.
- [ ] 틀린 경로나 명령이 보이면 이유와 함께 별도로 표시했다.

## 변경
- [ ] 측정 전후 크기·수정 시각을 비교해 홈 디렉터리의 메모리 파일이 그대로임을 확인했고, 설정은 수정하지 않았다. `autoMemoryDirectory`와 `autoMemoryEnabled`는 `~/.claude/settings.json`, `.claude/settings.json`, `.claude/settings.local.json`, `--settings` 파일, 관리형 설정에서, `instructionFiles`는 `~/.claude/settings.json`, `--settings` 파일, 관리형 설정에서만 조회했고(프로젝트·로컬 설정의 `instructionFiles`는 무시되므로 판정에 쓰지 않았다) 수정 시각이 바뀌지 않았음을 확인했다. 크기나 수정 시각이 달라졌다면 자동 메모리 저장 알림 여부를 먼저 확인했다.
- [ ] 수정 대상 지시 파일의 미커밋 변경 여부를 3단계 계획 표에 넣었고, 미커밋 변경이 있는 파일은 따로 승인받은 경우에만 고쳤다. 승인이 없으면 보고서의 정리 제안에만 적었다.
- [ ] 3단계 표와 계획을 보여주고 사용자 승인을 받은 뒤에만 `docs/agent-memory-audit.md`를 만들었다.
- [ ] 보고서는 3단계에서 승인된 파일명으로만 만들었고, 같은 이름의 기존 파일을 승인 없이 덮어쓰지 않았다.
- [ ] 레포의 `CLAUDE.md`(또는 `AGENTS.md`)는 사용자가 승인한 줄만 바꿨고, `.claude/CLAUDE.md`와 `CLAUDE.local.md`는 수정하지 않았다.
- [ ] 지시 파일을 줄였다면 수정 후 줄 수를 다시 세어 200줄 미만임을 보고했다.
- [ ] 지시 파일을 고친 뒤 `git diff`를 보여 줬다.
- [ ] CLAUDE.md에 적힌 명령을 실행하지 않고 package.json 등에 있는지만 확인했다.
- [ ] 작업 후 `git status --short`가 1단계 시작 전 기록과 비교해 승인한 파일과 보고서 파일만 늘었거나 달라졌다. 커밋과 푸시는 하지 않았다.
- [ ] 비밀 값이 보이는 항목은 파일 이름과 줄 번호만 적었고 대화에도 값을 출력하지 않았다.
- [ ] `docs/agent-memory-audit.md`에서 대표 비밀 값 패턴(`sk-`, `ghp_`, `AKIA`, `xox`, `-----BEGIN`, `password=`)을 grep으로 찾았고 나온 결과가 없음을 확인했다(이것만으로 비밀이 없다고 단정하지 않는다).
- [ ] 보고서에 메모리 항목의 원문을 옮기지 않았다.
