# 목표: MCP 서버를 커넥터·사설·허용 목록 후보로 분류하기

2026년 10월 28일 GitHub는 GitHub-verified MCP 서버(커넥터)를 공개 프리뷰로 내놓았다. 기사 claim은 **MCP가 개발자 로컬 설정에서 한 번 연결·조직 허용 목록으로 관리하는 연결 계층으로 옮겨 간다**는 것이다.
이 키트는 레포·로컬 MCP 서버를 모아 **검증된 커넥터 대체 / 사설 유지 / 허용 목록 후보**로 분류한 보고서를 남긴다. 기본은 **읽기 전용 점검**이다. 플러그인·훅·확장 침해 흔적 점검은 agent-tools-trust-boundary 범위이므로 하지 않는다.

## 절대 지킬 것

- API 키, 토큰, 비밀번호의 **값을 읽어서 출력하거나 보고서에 적지 않는다.** 이름, 경로, 줄 번호만 다룬다.
- 홈 디렉터리(`~/`)의 파일은 **읽기만** 한다. 고칠 필요는 보고서에 사용자가 실행할 명령으로만 적는다.
- 새 MCP 서버를 설치하거나 Copilot 커넥터를 대신 로그인·연결하지 않는다.
- 엔터프라이즈 `managed-settings.json`이나 조직 Copilot 정책 UI는 직접 고치지 않는다. URL 초안만 보고서에 적는다.
- `git commit` 등 git 기록을 바꾸는 명령은 실행하지 않는다.

## 0. 맞는지 먼저 판단하기

아래를 확인한다. 해당하지 않으면 **아무것도 바꾸지 말고 멈춘 뒤** 이유를 알린다.

- 레포 또는 홈 디렉터리에 MCP 설정이 하나 이상 있다. 예: `.mcp.json`, `.cursor/mcp.json`, `.claude/settings.json`(MCP 항목), `~/.claude.json`, `~/.codex/config.toml`의 MCP 관련 표.
- 현재 디렉터리가 사용자가 작업하는 레포다. 레포가 아니면 레포 설정 변경은 건너뛰고 보고서만 만든다.

## 1. 목록 만들기 (읽기 전용)

있는 것만 확인한다. 없는 경로는 "없음"으로 적는다. 명령은 추측하지 말고 **실제로 실행해** 결과를 확인한다.

**레포 안**
- `.mcp.json`, `.cursor/mcp.json`, `.vscode/mcp.json`(있으면), `.claude/settings.json`, `.codex/`
- 각 서버의 이름, 명령 또는 URL, 인증 방식(키 이름만, 값 금지)

**홈 디렉터리 (읽기만)**
- Claude Code / Codex / Cursor 전역 MCP 항목이 있으면 이름과 명령·URL만

GitHub-verified 커넥터 후보인지 판별할 때, 서비스 이름만으로 단정하지 않는다. Changelog·문서에 나온 예(Slack, Figma, Notion, Sentry, Linear 등)와 **현재** [Copilot connectors 문서](https://docs.github.com/en/copilot/concepts/customizations/copilot-connectors) / Customize 화면에 있는지만 기준으로 삼고, 확인 못하면 "판단 보류"로 둔다.

## 2. 세 종류로 분류하기

각 서버에 하나를 붙인다.

- **검증된 커넥터 대체 검토**: 공개된 GitHub-verified 커넥터와 같은 서비스로 보이고, 키가 로컬에만 있는 형태
- **사설 유지**: 내부 API, 사설 URL, 커스텀 서버, Actions 전용 흐름처럼 커넥터로 못 옮기거나 옮기면 안 되는 것
- **허용 목록 후보**: 엔터프라이즈가 allowlist를 쓰는 경우, 커넥터 와일드카드 또는 서비스별 `serverUrl`을 넣어야 하는 항목. 공식 문서의 `https://api.github.com/copilot-connectors/api/v1/connectors/*/mcp` 문법을 참고하되, **현재 문서 URL을 연 뒤** 문법·정책 키를 확인한다.

agent-tools-trust-boundary처럼 침해 흔적(악성 확장 버전 등)을 찾거나 위험도 "높음" 표로 바꾸지 않는다. 이 키트의 분류는 연결 계층 이전 여부다.

## 3. 계획을 보여주고 승인받기

다음을 보여주고 **사용자의 승인을 받은 뒤에만** 4단계를 진행한다.

- 1~2단계 결과 표 (이름, 위치, 분류, 이유)
- 만들 보고서: `docs/mcp-connector-inventory.md`
- 레포 설정에서 제거할 항목(없으면 "없음")과 이유
- 보고서에 적을 `allowedMcpServers` URL 초안(조직 파일은 수정하지 않음)

## 4. 승인된 범위만 적용하기

- `docs/mcp-connector-inventory.md`를 만든다. 점검 날짜, 표, 분류별 권장 조치, 홈 디렉터리용 수동 명령, 허용 목록 URL 초안을 담는다.
- 승인한 레포 설정 항목만 제거한다. 다른 MCP·에이전트 설정은 건드리지 않는다.

## 5. 실행해서 확인하기

- 수정한 JSON이 있으면 파서로 확인한다. 예: `node -e "JSON.parse(require('fs').readFileSync('.mcp.json','utf8'))"`
- 보고서에 키·토큰 값 패턴(`sk-`, `ghp_`, `-----BEGIN`)이 없는지 grep으로 **실행해** 확인한다.
- `checklist.md` 항목을 하나씩 점검하고 결과를 보고한다.
