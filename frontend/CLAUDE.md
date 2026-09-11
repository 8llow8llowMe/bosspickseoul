# BossPickSeoul Frontend — 작업 지도 (Claude Code)

BossPickSeoul은 NowDoBoss(사장님 상권분석) 리브랜딩 서비스다. 이 저장소의 `frontend/`는
React/Vite → Next.js App Router 마이그레이션 작업 영역이며, **작업 범위는 FE 전용**이다.

## 정본 위치 (여기부터 읽는다)

- **설계(무엇을 만드는가)**: `docs/features/` — Feature 기준 명세(공통 S0~S5 → 세부 D0~D8). 인덱스: `docs/features/_index.md`
- **디자인**: `DESIGN.md` (단일 정본)
- **횡단 기술 규칙**: `docs/engineering/` (routing / client-boundary / data-fetching / styling / code-style)
- **실행·운영**: `docs/runbook/` (migration / qa / cutover / seo)
- **명세 템플릿**: `_DocumentTemplates/` (2계층, 플랫폼명세 미사용)

## 작업 프로세스 (superpowers)

새 기능/화면은 **명세 먼저**다.

1. **brainstorming** → `docs/features/<feature>/*.md`에 한국어 명세 작성/갱신 (정본)
2. **writing-plans** → `docs/superpowers/plans/`에 실행 계획
3. **executing-plans / subagent-driven-development** → 구현 + `docs/features/_index.md` 상태 갱신
4. **code-review / systematic-debugging** → 검증·디버깅
   > 정본은 항상 한국어 Feature 명세 1곳. superpowers는 그걸 만들고 실행하는 과정이다.

## 기술 기준선

- Next.js App Router + TypeScript / pnpm / styled-components / Zustand / React Query
- Font: Pretendard (`next/font/local`) / 클라이언트 노출 env는 `NEXT_PUBLIC_*`
- 브라우저 API·chart·Kakao Map·Firebase Messaging·WebSocket → client component 또는 `dynamic(...,{ssr:false})`

## 금지사항

- API 문서 없이 임의 엔드포인트/스펙 작성 금지 → 작성자에게 문의
- 백엔드 API 계약 변경 금지
- 임의 색상·radius·shadow·spacing 토큰 추가 금지 → `DESIGN.md` 준수
- 광범위한 무관 리팩터 금지 / mock 세션을 최종본처럼 남기지 않기

## 검증 명령

완료 보고 전 실행: `pnpm qa:verify` (= `format:check && lint && typecheck && build`).
미실행 명령을 통과했다고 보고하지 않는다.

브라우저 실측 회귀는 `pnpm test:e2e` (Playwright) 로 **따로** 돌린다 — dev 서버가 떠 있어야 하고
CI 이미지에 브라우저가 없어 `qa:verify` 에 넣지 않았다. 규칙은 `docs/runbook/qa.md` §2.

## PR 생성 규약

PR 을 만들 때 **assignee 와 label 을 반드시 지정한다.**

```bash
gh pr create --base develop \
  --title "[FE] <type>: <한국어 제목>" \
  --body-file <파일> \
  --assignee seonghoho \
  --label frontend-web
```

이미 만든 PR 에 빠졌다면 `gh pr edit <번호> --add-assignee seonghoho --add-label frontend-web`.

| 항목         | 값             | 왜                                                               |
| ------------ | -------------- | ---------------------------------------------------------------- |
| `--assignee` | `seonghoho`    | 리뷰·머지 책임자가 PR 목록에서 드러나야 한다                     |
| `--label`    | `frontend-web` | **배포 게이트다.** 라벨이 없으면 머지해도 dev 에 배포되지 않는다 |

`frontend-web` 은 분류용 꼬리표가 아니라 Jenkins 의 **배포 대상 지정**이다. 라벨 없이 머지하면
파이프라인이 "배포 대상 아님 - 생략" 으로 조용히 끝난다(fail-closed). 자세한 동작과 복구 방법
(`FORCE_DEPLOY` 수동 실행)은 `docs/runbook/deployment.md` §2 를 본다.

`pr` 스킬은 「에이전트가 라벨을 붙이지 않는다」고 하는데, 그건 **분류 라벨** 이야기다. 배포
게이트 라벨은 여기 규약이 이긴다 — 스킬 문서에도 예외로 적어 두었다.

base 는 **항상 `develop`** 이다. 스택 PR 로 중간 브랜치를 base 로 두면 머지가 develop 이 아니라
그 브랜치로 들어간다. 더 나쁜 경우도 있다 — base 브랜치가 머지되면서 삭제되면 **GitHub 이 위
PR 을 자동으로 닫는다.** 다시 열려면 base 브랜치를 일시 복원해야 한다(2026-09-11 #327→#328 에서
실제로 겪었다). 앞 작업이 끝나기 전에 올려야 하면 base 는 `develop` 로 두고 충돌은 rebase 로
푼다.

머지는 **rebase and merge** 로만 한다(루트 `CLAUDE.md` 「머지 방식」, 2026-09-11 결정). FE 는 그전까지
merge commit 이었으므로 두 가지가 바뀐다.

- 브랜치 커밋이 develop 에 그대로 올라간다. PR 을 올리기 전에 커밋을 `[FE] <type>: …` 형식으로 정리하고,
  `wip`·중간 수정 커밋은 squash 한다. 리뷰 반영 커밋도 마찬가지다.
- 스택 PR 은 아래 PR 이 머지되면 위 브랜치가 옛 커밋을 물고 있게 된다. `git rebase --onto origin/develop <옛 base 브랜치>`
  로 갈아탄 뒤 `gh pr edit <번호> --base develop` 으로 base 를 바꾼다. 인계 문서에 「squash 가 아니라 merge commit」
  이라고 적힌 예전 관행은 더 이상 따르지 않는다.

배포 게이트는 영향이 없다. Jenkins 는 머지 커밋 메시지가 아니라 develop 머리 커밋 SHA 에 연결된 PR 의 라벨을
GitHub API 로 읽으므로(`docs/runbook/deployment.md` §2), rebase 로 올라간 커밋에서도 `frontend-web` 라벨을 찾는다.
