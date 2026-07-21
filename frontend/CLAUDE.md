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
