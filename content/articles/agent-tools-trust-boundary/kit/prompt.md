# 목표: 내 코딩 에이전트에 붙은 것들의 목록과 출처를 점검하기

2026년 10월에 세 사건이 있었다. Postman이 코딩 에이전트에 플러그인과 훅을 무단으로 설치했고, Cursor 마켓플레이스의 Claude Code 확장(2.1.312, 2.1.313)에 백도어가 들어 있었고, OpenCode Console에 저장된 API 키가 유출됐다.
이 키트는 같은 경로로 들어온 것이 내 환경에 있는지 찾아 보고서로 남긴다. 기본은 **읽기 전용 점검**이다.

## 절대 지킬 것

- API 키, 토큰, 비밀번호, 개인 키의 **값을 읽어서 출력하거나 보고서에 적지 않는다.** 이름, 파일 경로, 줄 번호만 다룬다. 값이 들어 있을 수 있는 파일(`.env`, `config.toml`, `settings.json`, `auth.json`, `credentials` 등)은 키 이름과 구조만 확인하고, 출력할 때 값은 `***`로 가린다.
- 홈 디렉터리(`~/`)의 파일은 **읽기만** 한다. 고칠 필요가 있으면 사용자가 직접 실행할 명령을 보고서에 적는다.
- 확장 프로그램이나 플러그인을 설치, 삭제, 업데이트하지 않는다.
- 키를 교체하거나 외부 서비스에 접속하지 않는다.

## 0. 맞는지 먼저 판단하기

아래를 확인한다. 해당하지 않으면 **아무것도 바꾸지 말고 멈춘 뒤** 이유를 알린다.

- 이 컴퓨터에서 Claude Code, Codex, Cursor, VS Code 확장, OpenCode 같은 코딩 에이전트 도구를 하나 이상 쓰고 있다. (설정 폴더나 레포 안 설정 파일로 확인한다.)
- 현재 디렉터리가 사용자가 작업하는 레포다. 레포가 아니면 4단계(레포 설정 변경)는 건너뛰고 보고서만 만든다.

## 1. 목록 만들기 (읽기 전용)

있는 것만 확인한다. 없는 경로는 "없음"으로 적는다. 명령은 추측하지 말고 실제로 실행해 결과를 확인한다.

**레포 안**
- `.mcp.json`, `.claude/settings.json`, `.claude/settings.local.json`, `.claude/hooks/`, `.claude/plugins/`, `.codex/`, `.cursor/mcp.json`, `.vscode/extensions.json`
- 각 파일의 MCP 서버(이름, 명령 또는 URL), 훅(이벤트, 실행 명령), 플러그인과 마켓플레이스, 권한 규칙

**홈 디렉터리 (읽기만)**
- Claude Code: `~/.claude/settings.json`, `~/.claude/plugins/`, `~/.claude.json`의 MCP 서버 항목
- Codex: `~/.codex/config.toml`의 `[marketplaces.*]`, `[plugins.*]`, `[mcp_servers.*]`, `[hooks.*]`
- 에디터 확장: `code --list-extensions --show-versions`, `cursor --list-extensions --show-versions`가 있으면 실행한다. 없으면 `~/.vscode/extensions/`, `~/.cursor/extensions/`의 폴더 이름을 본다.
- SSH: `~/.ssh/authorized_keys`의 각 키 **주석(comment)과 개수만** 확인한다.
- macOS: `~/Library/LaunchAgents/`의 파일 이름. Linux: `crontab -l`의 `@reboot` 줄.

## 2. 위험 표시하기

각 항목에 위험도를 붙인다.

- **높음**
  - `anthropic.claude-code` 확장의 2.1.312 또는 2.1.313 버전
  - `authorized_keys`에 주석이 `svc-telemetry`인 키
  - `~/Library/LaunchAgents/com.apple.sysmond.plist`, `~/.config/.smt`, `~/.config/.smtk`, `/tmp/.stk_*`
  - 사용자가 설치한 기억이 없다고 답한 훅
- **확인 필요**
  - 다른 앱이 설치한 것으로 보이는 플러그인·마켓플레이스 (예: Postman 마켓플레이스 `postmanlabs/postman-plugin`)
  - 출처 URL이 없거나 개인 저장소에서 오는 MCP 서버
  - 세션 시작 시 에이전트에게 지시문을 출력하는 훅
- **보통**: 사용자가 직접 설치한 것으로 확인된 항목

위험도 "높음" 항목이 하나라도 있으면 즉시 사용자에게 알리고, 보고서에 대응 절차를 적는다. 직접 지우지 않는다. 확장을 지우는 것만으로는 백도어가 사라지지 않는다는 점도 함께 알린다.

키 저장 위치도 적는다. 환경 변수 이름, `.env` 파일 위치, 에이전트 설정에 들어 있는 키 항목 이름, 사용자가 키를 맡긴 외부 서비스(사용자에게 묻는다).

## 3. 계획을 보여주고 승인받기

다음을 보여주고 **사용자의 승인을 받은 뒤에만** 4단계를 진행한다.

- 1~2단계 결과 요약 표 (항목, 위치, 출처, 위험도)
- 만들 보고서 파일: `docs/agent-trust-audit.md`
- 레포 안 설정에서 제거하거나 비활성화할 MCP 서버·훅 목록과 이유 (없으면 "없음")
- 레포 에이전트 설정에 추가할 비밀 파일 읽기 차단 규칙 (예: Claude Code의 `permissions.deny`에 `Read(./.env)`, `Read(./.env.*)`). 이 레포가 쓰는 에이전트의 설정 형식에 맞춘다.

## 4. 승인된 범위만 적용하기

- `docs/agent-trust-audit.md`를 만든다. 다음 내용을 담는다.
  - 점검 날짜
  - 항목 표 (값은 절대 적지 않는다)
  - 위험 항목별 권장 조치
  - 홈 디렉터리 항목은 사용자가 직접 실행할 명령
- 승인한 항목만 레포 안 설정 파일에서 제거하거나 규칙을 추가한다. 다른 설정은 건드리지 않는다.

## 5. 실행해서 확인하기

- 수정한 설정 파일이 올바른 JSON 또는 TOML인지 파서로 확인한다. 예: `node -e "JSON.parse(require('fs').readFileSync('.claude/settings.json','utf8'))"`
- 비밀 파일 차단 규칙을 추가했다면, 에이전트가 `.env`를 읽으려 할 때 거부되는지 확인할 방법을 사용자에게 안내한다.
- 보고서에 키·토큰 값이 들어가지 않았는지 다시 검사한다. 예: `sk-`, `ghp_`, `-----BEGIN` 같은 패턴을 grep으로 찾는다.
- `checklist.md`의 항목을 하나씩 점검하고 결과를 보고한다.
