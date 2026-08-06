# 상권 분석 결과 — 대시보드 레이아웃 개편 설계

> **작성일**: 2026-08-06
> **대상**: 웹 (Next.js App Router) / `frontend/`
> **정본 명세**: [분석 결과 리포트](../../features/analysis/result.md) — 승인 후 반영
> **상태**: 설계 승인됨(목업+방향 확정), 구현 대기

## 1. 배경 / 문제

현재 `/analysis/result`는 탭 클릭 시 내용을 통째로 교체하고, 각 지표를 세로로 하나씩 크게 나열한다. 결과:

- 한 번에 하나의 그래프만 크게 보여 한눈 비교가 안 된다.
- `AnalysisMetricList`의 CSS 가로 비례 바가 약해 눈에 안 들어온다.
- 탭 전환식이라 전체 리포트를 훑기 어렵다.

목표: **한 페이지 스크롤 대시보드** — 반응형 카드 그리드로 다양한 데이터를 한눈에, 탭은 해당 섹션으로 스크롤 이동(스크롤스파이), 섹션 크기를 줄인 최적화 보고서.

## 2. 목표 / 비목표

**목표**
1. 탭 전환식 → 한 페이지 스크롤 + 스크롤 앵커 탭(스크롤스파이 하이라이트).
2. 반응형 카드 그리드(데스크톱 2~3열 / 태블릿 2열 / 모바일 1열), 섹션 컴팩트화.
3. 상단 KPI 행 + 약한 가로막대 시각 강화.
4. 스크롤 근접 시 섹션 데이터 lazy 로드(명세 D2-5 유지, 초기 부하 최소).

**비목표**
- 차트 종류 추가/변경(이미 도입한 라인·도넛·피라미드 그대로 재배치).
- 색상 체계 변경(DESIGN.md 토큰 유지).
- 새 API/엔드포인트.

## 3. 아키텍처

### 3-1. 레이아웃 (`analysis-result-view.tsx`)

- 탭 조건부 렌더(`activeTab === 'x' ? ... : null`) 제거 → **모든 섹션 그룹을 항상 렌더**, 각 그룹을 `<section id="report-{tab}">`로 감싸고 `scroll-margin-top`을 sticky 헤더 높이만큼 준다.
- 신규 `DashboardGrid` 컨테이너: CSS grid. 데스크톱 `grid-template-columns: repeat(2, minmax(0,1fr))`(넓은 카드는 `grid-column: 1 / -1` 풀폭), 큰 화면(≥1280px)에서 소형 카드는 3열 허용, 태블릿 2열, 모바일 1열.
- 각 지표 섹션 → 컴팩트 `Card`(제목 + 본문). 라인·피라미드는 넓게, 도넛·바 리스트는 좁게 배치.
- 콘텐츠 max-width를 1180 → 약 1320px로 확대(대시보드 밀도).
- 기존 `AnalysisResultSection`(loading/error/empty/onRetry 격리)은 카드 내부에서 그대로 사용.

### 3-2. 스크롤 앵커 탭 (스크롤스파이)

- 탭 버튼 클릭 → `getElementById('report-{tab}').scrollIntoView({behavior:'smooth', block:'start'})` + `router.replace`로 URL `tab` 동기화.
- 신규 훅 `useScrollSpy(ids: string[]): activeId` — IntersectionObserver로 현재 뷰포트 상단에 걸린 섹션을 활성으로 계산해 탭 하이라이트. 스크롤 중 URL 재기록은 하지 않음(history churn 방지); 하이라이트만 갱신.
- 탭 UI/URL 계약은 유지(딥링크로 특정 탭 진입 시 해당 섹션으로 초기 스크롤).

### 3-3. 뷰포트 근접 lazy 로딩

- 신규 훅 `useActivatedSections()` → `{ register(id): ref, activated: Set<string> }`. IntersectionObserver(rootMargin 하단 여유 ~300px)로 섹션이 근접하면 `activated`에 추가(한 번 활성화되면 유지).
- 각 React Query의 `enabled`를 `activated.has('{tab}') && (기존 조건)`으로 교체. 요약(핵심 지표)은 초기 진입 시 항상 로드. 딥링크 탭 진입 시 해당 섹션은 초기 활성.
- 효과: 초기엔 요약+상단만 조회, 스크롤하며 나머지 로드 → 명세 D2-5("상세는 활성화 시 조회") 정신 유지.

### 3-4. 가로막대 강화 (`analysis-metric-list.tsx`)

- Track/Fill 대비 강화: track 높이 9→10px, fill에 최소 폭 보장(현행 `Math.max(3,…)` 유지), 값 라벨 굵기·색 강조.
- 카드 2열 배치(그리드에서)로 나열 피로 감소. 컴포넌트 자체는 표현만 강화, 데이터 계약 불변.

## 4. 컴포넌트/파일 경계

| 파일 | 변경 |
| --- | --- |
| `src/components/analysis/analysis-result-view.tsx` | 탭 조건부 렌더 제거 → 섹션 앵커 + DashboardGrid 카드 배치, 스크롤스파이·lazy 훅 사용, 쿼리 enabled 교체 |
| `src/lib/analysis/use-scroll-spy.ts` (신규) | IntersectionObserver 기반 activeId 훅 |
| `src/lib/analysis/use-activated-sections.ts` (신규) | 뷰포트 근접 활성화 Set 훅 |
| `src/components/analysis/analysis-metric-list.tsx` | 바 시각 강화(토큰 내) |
| `docs/features/analysis/result.md` | 레이아웃(스크롤 대시보드·스크롤스파이·근접 lazy) 반영 |

## 5. 품질 기준 / 제약 (DESIGN.md·CLAUDE.md)

- 디자인 토큰만(색/radius/shadow/spacing). 임의값 금지.
- 반응형: 카드/차트 full-width·aspect 유지. 모바일 1열, 이중 스크롤 없음.
- 접근성: 탭은 버튼+`aria-current`, 스크롤 이동은 `prefers-reduced-motion` 존중(auto), 스크롤스파이는 시각 보조일 뿐 정보 유일 소스 아님.
- 부분 실패 격리(`AnalysisResultSection`)·null "데이터 없음" 유지.
- 완료 전 `pnpm test` + `pnpm qa:verify` 통과.

## 6. 테스트 전략

- `use-scroll-spy`/`use-activated-sections`: 순수 로직은 어렵지만, 관찰자 콜백 처리 함수는 분리해 단위 테스트(활성 계산, 한 번 활성화 유지).
- `analysis-metric-list`: 기존 정적 마크업 테스트 유지(값·aria 불변).
- 뷰: 스모크(모든 섹션이 앵커 id로 렌더되는지) + `renderToStaticMarkup`.
- 실렌더 확인은 dev 서버(5173)에서 육안 검증(그리드/스크롤/바).

## 7. 위험 / 미결

| 항목 | 처리 |
| --- | --- |
| IntersectionObserver SSR 부재 | 클라이언트 컴포넌트에서만 사용(뷰는 이미 'use client'), 초기 렌더는 관찰 전이므로 요약은 즉시 enabled로 보강 |
| 스크롤스파이·lazy 중복 관찰자 | 훅 2개로 관심사 분리(하이라이트 vs 데이터 활성) |
| 딥링크 탭 진입 초기 스크롤 타이밍 | 마운트 후 해당 앵커로 1회 스크롤, 콘텐츠 로드 전이면 재보정 |

## 8. 변경 이력

| 버전 | 날짜 | 내용 | 작성자 |
| --- | --- | --- | --- |
| 0.1 | 2026-08-06 | 탭 전환식 → 스크롤 대시보드(카드 그리드·스크롤스파이·근접 lazy·바 강화) 설계 | Claude |
