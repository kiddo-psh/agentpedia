# 적용 후 점검

- [ ] `docs/verifier-honesty.md`(또는 날짜 접미사 이름)에 검증 표면 표와 자기 수정 위험(예/아니오)이 있다.
- [ ] 보고서에 Code Review가 `REVIEW.md`를 PR이 아니라 베이스·기본 브랜치에서 읽는다는 근거(문서 URL)가 있다.
- [ ] 완화 시도(약화한 규칙 요지)와, 그 약화본을 채점에 쓰면 안 되는 이유가 보고서에 있다. 약화본 `REVIEW.md`를 레포에 커밋하지 않았다.
- [ ] 승인한 경우 루트 `REVIEW.md`에 Important 정의·Nit 상한·CI 중복 제외·`file:line` 증거 요구가 있다. 기존 문장을 지우지 않았다.
- [ ] 승인한 `verify` 스킬이 있다면, 적힌 명령을 직접 실행했고 성공했다. 실패한 명령을 스킬에 남기지 않았다.
- [ ] 검증 명령을 `CLAUDE.md`/`AGENTS.md`에 덧붙이지 않았다.
- [ ] observe/enforce 게이트 API를 지어내거나 브랜치 보호·Code Review 설정을 바꾸지 않았다.
- [ ] 애플리케이션 코드·테스트 본문을 수정하지 않았다.
- [ ] `git status --short`를 시작 시점과 비교했을 때 바뀐 파일이 보고서·`REVIEW.md`·`.claude/skills/verify/` 범위뿐이다.
