# Frontend Docs

## 목적

- 이 디렉터리는 `NowDoBoss-V2/frontend` 마이그레이션의 기준 문서 모음이다.
- 기존 프론트엔드(`../../NowDoBoss/FrontEnd`)를 Next.js로 옮길 때, 작업 순서와 디자인 기준이 흔들리지 않도록 한다.
- `frontend/AGENTS.md`는 Codex 작업자가 처음 읽는 짧은 작업 지도이고, 상세 기준은 이 디렉터리의 문서로 분리한다.

## 항상 읽을 문서

1. `AGENTS.md`
2. `docs/README.md`
3. `docs/migration-playbook.md`
4. `docs/migration-inventory.md`

## 작업 유형별 추가 문서

- UI/디자인 작업: `docs/design-guide.md`, `docs/engineering/styling-rules.md`
- SEO/공개 페이지 작업: `docs/seo-guide.md`
- QA/완료 점검: `docs/done-checklist.md`, `docs/qa-runbook.md`
- 배포/전환 작업: `docs/cutover-runbook.md`, `docs/seo-performance-audit.md`
- 라우팅 작업: `docs/engineering/routing-rules.md`
- 브라우저 API/SSR 경계 작업: `docs/engineering/client-boundary.md`
- API/세션/데이터 작업: `docs/engineering/data-fetching-rules.md`
- 코드 스타일/의존성 작업: `docs/engineering/code-style.md`
- 역할별 작업: `docs/agents/*.md`

작은 작업마다 모든 문서를 읽지 않는다. 요청된 작업과 직접 관련된 문서만 추가로 확인한다.

## 문서 구성

- `migration-playbook.md`: 단계별 작업 순서, 기술 선택, 이관 절차
- `phase-checklist.md`: Phase별 진행 상황과 완료 체크 상태
- `migration-inventory.md`: 레거시 기능 목록, 라우트 매핑, 주요 리스크, 이관 상태
- `design-guide.md`: 색상, 타이포, 레이아웃, 공통 컴포넌트 규칙
- `seo-guide.md`: 공개/비공개 페이지 SEO 정책, metadata, 색인 기준
- `qa-runbook.md`: 자동 검증, 수동 smoke test, 검증 결과 기록 방식
- `cutover-runbook.md`: 환경변수, 배포 전환 순서, 롤백 기준
- `seo-performance-audit.md`: 현재 SEO/번들 점검 결과와 운영 전 확인 항목
- `done-checklist.md`: 기능 단위 완료 기준과 QA 체크리스트
- `agents/orchestrator-guide.md`: 마이그레이션 작업 분할과 조율 기준
- `agents/design-agent-guide.md`: UX/UI와 디자인 시스템 작업 기준
- `agents/fe-agent-guide.md`: 프론트엔드 구현 agent 작업 절차
- `agents/review-agent-guide.md`: 리뷰 기준과 출력 형식
- `engineering/code-style.md`: 코드 스타일, 포맷, 의존성 추가 기준
- `engineering/routing-rules.md`: App Router 전환 규칙
- `engineering/client-boundary.md`: 브라우저 API와 SSR 경계 규칙
- `engineering/data-fetching-rules.md`: API, 세션, React Query, storage 규칙
- `engineering/styling-rules.md`: 디자인 토큰과 스타일 구현 규칙

## 현재 작업 원칙

- 첫 단계에서는 구조 전면 개선보다 기능 동일성 확보를 우선한다.
- 레거시의 모든 브라우저 의존 로직은 SSR 안전성 관점에서 재배치한다.
- 패키지 매니저는 `pnpm`을 기준으로 통일한다.
- 코드 포맷은 `Prettier`를 기준으로 통일한다.
- 디자인은 기존 NowDoBoss의 블루/화이트 기반 제품 톤을 유지하되, 구현은 Next.js 환경에 맞게 정리한다.
- SEO는 공개 페이지 기준으로 초반부터 기본 골격을 같이 반영하고, 세부 고도화는 후반에 진행한다.
