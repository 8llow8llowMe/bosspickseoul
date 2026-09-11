# BossPickSeoul Frontend Agent Guide

BossPickSeoul은 NowDoBoss(사장님 상권분석) 리브랜딩 서비스다. 이 저장소의 `frontend/`는 React/Vite에서 Next.js App Router로 마이그레이션하는 FE 전용 작업 영역이다.

## 정본 위치

- 설계: `docs/features/`의 한국어 Feature 명세. 인덱스는 `docs/features/_index.md`다.
- 디자인: `DESIGN.md`
- 횡단 기술 규칙: `docs/engineering/`
- 실행·운영: `docs/runbook/`
- 명세 템플릿: `_DocumentTemplates/`

## 작업 프로세스

새 기능이나 화면은 명세를 먼저 작성하거나 갱신한다.

1. `docs/features/<feature>/*.md`에 한국어 명세를 작성한다.
2. `docs/superpowers/plans/`에 실행 계획을 작성한다.
3. 구현과 함께 `docs/features/_index.md` 상태를 갱신한다.
4. 코드 리뷰와 체계적인 디버깅으로 검증한다.

정본은 항상 한국어 Feature 명세 한 곳이며, 계획과 구현 문서는 그 명세를 실행하기 위한 자료다.

## 기술 기준선

- Next.js App Router + TypeScript / pnpm / styled-components / Zustand / React Query
- Pretendard는 `next/font/local`을 사용하고, 클라이언트 노출 환경변수는 `NEXT_PUBLIC_*`만 사용한다.
- 브라우저 API, chart, Kakao Map, Firebase Messaging, WebSocket은 client component 또는 `dynamic(..., { ssr: false })` 경계 안에 둔다.

## 금지사항

- API 문서 없이 엔드포인트나 계약을 추측하지 않는다. 필요한 정보는 작성자에게 확인한다.
- 백엔드 API 계약을 변경하지 않는다.
- `DESIGN.md`에 없는 색상, radius, shadow, spacing 토큰을 임의로 추가하지 않는다.
- 범위 밖 리팩터링을 하지 않고 mock 세션을 최종 구현처럼 남기지 않는다.

## 검증

완료 보고 전에 `pnpm qa:verify`를 실행한다. 이 명령은 `format:check`, `lint`, `typecheck`, `build`를 순서대로 검증한다. 실행하지 않은 검증을 통과했다고 보고하지 않는다.

## PR 생성 규약

PR의 base는 항상 `develop`이며 assignee `seonghoho`와 label `frontend-web`을 지정한다.

```bash
gh pr create --base develop \
  --title "[FE] <type>: <한국어 제목>" \
  --body-file <파일> \
  --assignee seonghoho \
  --label frontend-web
```

기존 PR에 누락됐다면 `gh pr edit <번호> --add-assignee seonghoho --add-label frontend-web`을 사용한다. `frontend-web` 라벨은 Jenkins 배포 대상 지정이므로 누락하면 배포가 생략된다. 세부 동작과 `FORCE_DEPLOY` 복구 절차는 `docs/runbook/deployment.md`를 따른다.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
