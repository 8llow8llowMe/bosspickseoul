# Frontend Docs

## 목적

- 이 디렉터리는 `NowDoBoss-V2/frontend` 마이그레이션의 기준 문서 모음이다.
- 기존 프론트엔드(`../../NowDoBoss/FrontEnd`)를 Next.js로 옮길 때, 작업 순서와 디자인 기준이 흔들리지 않도록 한다.

## 문서 구성

- `migration-playbook.md`
  - 단계별 작업 순서, 기술 선택, 이관 절차
- `phase-checklist.md`
  - Phase별 진행 상황과 완료 체크 상태
- `migration-inventory.md`
  - 레거시 기능 목록, 라우트 매핑, 주요 리스크
- `design-guide.md`
  - 색상, 타이포, 레이아웃, 공통 컴포넌트 규칙
- `seo-guide.md`
  - 공개/비공개 페이지 SEO 정책, metadata, 색인 기준
- `done-checklist.md`
  - 기능 단위 완료 기준과 QA 체크리스트

## 권장 읽기 순서

1. `AGENT.md`
2. `docs/migration-playbook.md`
3. `docs/phase-checklist.md`
4. `docs/migration-inventory.md`
5. `docs/design-guide.md`
6. `docs/seo-guide.md`
7. `docs/done-checklist.md`

## 현재 작업 원칙

- 첫 단계에서는 구조 전면 개선보다 기능 동일성 확보를 우선한다.
- 레거시의 모든 브라우저 의존 로직은 SSR 안전성 관점에서 재배치한다.
- 패키지 매니저는 `pnpm`을 기준으로 통일한다.
- 코드 포맷은 `Prettier`를 기준으로 통일한다.
- 디자인은 기존 NowDoBoss의 블루/화이트 기반 제품 톤을 유지하되, 구현은 Next.js 환경에 맞게 정리한다.
- SEO는 공개 페이지 기준으로 초반부터 기본 골격을 같이 반영하고, 세부 고도화는 후반에 진행한다.
