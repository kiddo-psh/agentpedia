# 점검 체크리스트

## 목록
- [ ] 레포 안 MCP 설정(`.mcp.json`, `.cursor/mcp.json`, `.claude/`, `.codex/` 등)의 서버를 모두 적었다.
- [ ] 각 항목에 클라이언트를 적었다(Cursor / Claude Code / Codex / VS Code·Copilot / 불명).
- [ ] 홈 디렉터리 MCP 항목은 읽기만 했고, 이름·명령·URL만 적었다.
- [ ] 키·토큰 값은 출력·저장하지 않았다.

## 분류
- [ ] 각 서버에 Copilot 커넥터 후보 / 사설 유지 / 허용 목록 후보(또는 판단 보류)를 붙였다.
- [ ] "Copilot 커넥터 후보"를 Cursor·Claude·Codex 설정 삭제로 해석하지 않았다.
- [ ] 커넥터 여부는 현재 공식 문서·Changelog 기준으로만 적었고, 추측한 서비스는 판단 보류로 뒀다.
- [ ] 플러그인·훅·확장 침해 점검(agent-tools-trust-boundary)으로 범위를 넓히지 않았다.

## 변경
- [ ] `.cursor/mcp.json`, Claude·Codex MCP 설정은 수정·제거하지 않았다.
- [ ] 설정 제거는 사용자가 해당 클라이언트 연동 폐기를 명시하고, Copilot이 대체하는 경로이며, 같은 클라이언트에서 대체가 동작한다고 확인한 경우에만 했다(기본은 보고서만).
- [ ] 홈 디렉터리 파일과 엔터프라이즈 managed-settings는 수정하지 않았고, URL 초안만 보고서에 적었다.
- [ ] `docs/mcp-connector-inventory.md`에 비밀 값 패턴이 없음을 grep으로 확인했다.
