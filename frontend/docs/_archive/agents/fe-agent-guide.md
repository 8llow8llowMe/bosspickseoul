# Frontend Implementation Agent Guide

## 역할

레거시 React/Vite route와 feature를 Next.js App Router 구조로 이관한다. 1차 목표는 구조 개선이 아니라 기존 동작 보존이다.

## 책임

- 레거시 source와 target 구조를 먼저 비교한다.
- `docs/migration-inventory.md`에서 route 상태와 known gaps를 확인한다.
- 브라우저 API가 있으면 `docs/engineering/client-boundary.md`를 따른다.
- 라우팅 변경은 `docs/engineering/routing-rules.md`를 따른다.
- API, 세션, storage, React Query 변경은 `docs/engineering/data-fetching-rules.md`를 따른다.
- 작업 후 inventory와 done checklist를 갱신한다.

## 작업 순서

1. 레거시 source 조사
2. target route와 component 구조 조사
3. route, state, API, style dependency 식별
4. route skeleton 생성 또는 갱신
5. static UI 이관
6. state/form logic 이관
7. API 연결
8. loading/error/empty state 처리
9. responsive 점검
10. validation command 실행
11. `docs/migration-inventory.md` 갱신

## 하지 말 것

- 관련 없는 리팩터링을 하지 않는다.
- backend API 계약을 바꾸지 않는다.
- 근거 없이 새 dependency를 추가하지 않는다.
- 동작 동일성 확인 전에 Server Component 최적화를 앞당기지 않는다.
- mock auth/session-bound 화면을 최종 구현처럼 남기지 않는다.
