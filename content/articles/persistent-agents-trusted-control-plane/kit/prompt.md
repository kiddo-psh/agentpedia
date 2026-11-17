# 목표: 지속 실행 에이전트용 제어면 경계(네트워크·워크스페이스·프로세스·비밀)와 danger-full-access 우회를 점검하기

2026년 11월 Kevin S Lin은 OpenAI가 OpenClaw 같은 **지속 실행 에이전트를 신뢰하지 않는 실행 주체**로 두고, 네트워크·신원·샌드박스 같은 **결정적 제어면**과 분리한다고 썼다. 기사 claim은 허용 목록·워크스페이스 쓰기·프로세스 격리·자격 증명 브로커·`danger-full-access` 금지다.
이 키트는 그 네 경계와 우회 모드를 레포·홈 설정에서 읽고 보고서로 남긴다. 플러그인·훅 목록 감사나 "지시 vs 강제" 일반 격리는 다른 키트 범위다. 기본은 **읽기 전용 점검**이다.

## 절대 지킬 것

- API 키·토큰·비밀번호·개인 키 **값을 출력하거나 보고서에 적지 않는다.** 보이면 이름과 위치만 적고 값은 `***`로 가린다. `.env`와 키 파일은 열지 않는다.
- 홈 디렉터리(`~/`) 파일은 **읽기만** 한다. 고칠 내용은 사용자가 실행할 명령을 보고서에 적는다.
- 격리가 뚫리는지 보려고 외부 접속·우회·메타데이터(`169.254.169.254` 등) 접근을 시도하지 않는다. 공식 문서 페이지를 읽는 것만 예외다.
- 플러그인·훅·MCP·확장을 설치·삭제하지 않는다. 네트워크 허용 목록 **본문**은 바꾸지 않는다.
- `git add`·`git commit`·`git push`·`git stash`는 실행하지 않는다.
- 검증 명령을 `CLAUDE.md`/`AGENTS.md`에 덧붙이지 않는다(Boris Cherny 키트 범위다).

## 0. 맞는지 먼저 판단하기

아래를 확인한다. 해당하지 않으면 **아무것도 바꾸지 말고 멈춘 뒤** 이유를 알린다.

- Codex·OpenClaw·Claude Code처럼 샌드박스·네트워크·워크스페이스·권한 설정이 이 컴퓨터에 있다.
- 현재 디렉터리가 사용자가 작업하는 레포다. 아니면 홈 항목만 읽어 표로 보여 주고, 파일은 만들지 않은 채 멈춘다.

시작 전에 `git status --porcelain`과 `git rev-parse HEAD`를 기록한다. `docs/persistent-agent-control-plane-audit.md`가 이미 있으면 덮어쓰지 말고 파일명을 어떻게 할지 묻는다.

## 1. 네 경계와 우회 모드 목록 만들기 (읽기 전용)

있는 경로만 확인한다. 없으면 "없음". `ls`, `git ls-files`, 값을 가린 읽기만 쓴다. 설정 파일을 `cat`으로 통째로 출력하지 않는다. sandbox·network·filesystem·permissions·shell_environment·credential 관련 키만 뽑는다. 추측하지 말고 **실행해서** 확인한다.

- 레포: `.codex/config.toml`, `.codex/requirements.toml`, `.claude/settings.json`, OpenClaw·에이전트 관련 설정, `AGENTS.md`/`CLAUDE.md`의 경계 지시(지시로만 있는지도 표시)
- 홈(읽기만): `~/.codex/config.toml`, `~/.claude/settings.json` 등
- 표 열: 축(네트워크 / 워크스페이스 / 프로세스 / 비밀 / 우회모드 / 자동검토·신원 단서), 위치, 현재 값(요약), 상태(강제·허용·지시만·미확인), 위험 여부
- 특별히 표시: `danger-full-access` 허용 여부, 쓰기 경로가 홈·레포 전체인지, 비밀이 환경에 그대로 보이는지, 자격 증명 브로커·프록시 단서 유무

## 2. OpenAI 글의 축으로 분류하기

각 행에 Lin 글의 축 이름을 붙인다. 공식 문서로 확인하지 못한 동작은 "미확인".

- **네트워크**: allowlist / denied_domains / managed proxy
- **워크스페이스**: write 허용 경로, `~/.ssh` 등 deny
- **프로세스**: 샌드박스·프로세스 격리 옵션
- **비밀**: exclude 환경 변수, 브로커·vault 단서(값은 적지 않음)
- **우회 금지**: `allowed_sandbox_modes`에 `danger-full-access`가 없는지
- **보조**: Auto-review·에이전트 신원 설정이 보이면 단서만 적음(없어도 실패로 단정하지 않음)

`danger-full-access`가 허용이거나 쓰기가 홈 전체면 위험 항목으로 표시한다.

## 3. 계획을 보여주고 승인받기

다음을 보여 주고 **승인한 뒤에만** 4단계를 진행한다.

- 1~2단계 결과 표
- 만들 보고서: `docs/persistent-agent-control-plane-audit.md` (또는 합의한 다른 이름)
- 레포에 넣을 최소 변경(없으면 "없음"): `danger-full-access` 제거·`read-only`/`workspace-write`만 허용, 워크스페이스 쓰기 경로 축소, 비밀 환경 변수 exclude 추가. **네트워크 허용 목록 본문은 변경 후보에 넣지 않고 권고만.**
- 수정 파일은 git 추적되는 `.codex/config.toml` 또는 `requirements.toml` 한 곳(또는 새로 생성). 추적되지 않으면 수정하지 않고 권고만. `.claude/settings.local.json`과 홈 파일은 수정하지 않는다.
- 키·문법는 공식 문서에서 확인한 것만. 미확인은 설정에 넣지 않는다. 승인 목록에 들어갈 TOML 조각을 그대로 보여 준다.
- 보고서·각 설정 변경은 따로 승인·거절할 수 있다.

## 4. 승인된 범위만 적용하기

### 4-1. 보고서

- `docs/persistent-agent-control-plane-audit.md`를 만든다. 점검 날짜, 네 경계·우회모드 표, 위험 항목과 권장 조치, 홈에서 직접 할 명령, 되돌리는 방법을 담는다. 값은 적지 않는다.

### 4-2. 레포 설정

- `git ls-files --error-unmatch`로 추적 여부를 확인한다. 추적되지 않으면 수정하지 않는다.
- 승인한 조각만 넣는다. 다른 키는 건드리지 않는다.

## 5. 실행해서 확인하기

- 수정한 TOML/JSON이 파서를 통과하는지 **실제로 실행해** 확인한다.
- 추가한 모드·경로가 파일에 있는지 `rg` 등으로 확인한다. 우회 시도는 하지 않는다.
- 보고서·수정 파일에 비밀 값 패턴이 없는지 `grep -nEi -e '(^|[^a-z])sk-[a-z0-9]{16,}|ghp_[A-Za-z0-9]{20,}|github_pat_|xox[bp]-|AKIA[0-9A-Z]{12,}|Bearer +[A-Za-z0-9._-]{16,}|-----BEGIN' docs/persistent-agent-control-plane-audit.md <수정 파일>`로 확인한다(결과 없음).
- `checklist.md`를 하나씩 점검하고, `git status --porcelain`이 승인 목록과 일치하는지 보고한다.
