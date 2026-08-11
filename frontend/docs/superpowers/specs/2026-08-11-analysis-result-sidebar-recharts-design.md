# 분석 결과뷰 — 좌측 사이드바 + Recharts 리디자인 설계

> **작성일**: 2026-08-11
> **대상 기능**: 상권 분석 결과 리포트(`/analysis/result`, 라우트 모달 `@modal/(.)result`)
> **정본 명세**: [분석 결과 리포트](../../features/analysis/result.md) — 본 설계 확정 후 반영
> **작성자**: Claude
> **상태**: 설계 승인(2026-08-11 브레인스토밍) → 구현 계획 대기

이 문서는 결과 리포트 화면을 **① 상단 탭 → 좌측 세로 사이드바 내비**로 재구성하고,
**② 자체 SVG 차트 → Recharts 라이브러리**로 교체하는 리디자인을 상세화한다.
지도 증분 렌더링(기능 1)·단계 선택 브레드크럼(기능 2)은 **본 설계 범위 밖**이며 이후 별도 명세로 다룬다.

---

## 0. 배경 / 기획 의도

| 항목         | 내용                                                                                                                                                                                                                         |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 문제         | (a) 결과 항목 이동이 상단 sticky 탭 하나에 몰려 있어 원본 NowDoBoss의 좌측 사이드바 대비 스캔·항목 파악이 불리하다. (b) 자체 SVG 차트(line/bar/donut/pyramid)의 시각 완성도가 낮다.                                          |
| 목표 (to-be) | (a) 데스크톱에서 **좌측 세로 사이드바 내비 + 오른쪽 긴 스크롤** 구조. 사이드바 항목 클릭 → 해당 섹션으로 스크롤, 현재 섹션 하이라이트. (b) 데이터 시각화를 **Recharts** 기반 재사용 래퍼로 교체해 완성도·반응형·툴팁을 확보. |
| 구현 제외    | 결과 데이터 계약 변경, 새 지표/탭 추가, PDF, 지도·단계 선택 UI(별도 기능)                                                                                                                                                    |

### 이 설계가 **뒤집는** 기존 결정 (supersede)

`result.md`의 다음 항목을 본 설계가 대체한다. 구현 시 `result.md`를 갱신한다.

1. **D2 지표 시각화 — "별도 패키지 없음 / 자체 SVG 차트 프리미티브"** → **Recharts 도입**으로 변경.
2. **구현 제외 범위 — "차트 라이브러리 신규 도입"** 제거.
3. **레이아웃 — "헤더와 탭은 리포트 내부에서 sticky"(상단 탭)** → 데스크톱은 **좌측 사이드바 내비**, 모바일은 기존 상단 가로 탭 폴백.

---

## 1. 핵심 설계 결정

1. **레이아웃 = 좌측 사이드바 + 긴 스크롤(scroll-spy 유지)**. 진짜 탭 전환(콘텐츠 스왑)이 아니라
   **한 페이지 롱스크롤**을 유지하고, 사이드바는 그 위의 앵커 내비다. 기존
   `useScrollSpy` + `scrollToReportSection` + lazy-activation(`useActivatedSections`) 로직을
   **그대로 재사용**한다. 즉 데이터 흐름·딥링크(`?tab=`)·지연 조회는 변경 없음, 탐색 UI의
   위치/형태만 바꾼다.
2. **모바일 폴백**. 사이드바는 좁은 폭에서 자리를 못 만든다. `≤840px`에서는 현재의 **상단 가로
   sticky 탭 바**(`TabList`/`TabButton`)를 그대로 노출한다. 기능 손실 없음.
3. **스크롤 컨테이너 불변**. 모달은 `ScrollArea`(overflow-y auto), 풀페이지는 문서 스크롤.
   `useScrollSpy.findScrollContainer`가 두 경우를 이미 처리하므로 사이드바 sticky는 그 컨테이너
   기준으로 붙는다. 사이드바 자체는 스크롤되지 않고 콘텐츠만 스크롤한다.
4. **Recharts 래퍼는 기존 props 인터페이스를 유지**한다. `analysis-result-view.tsx`의 호출부
   (`<LineChart points unit .../>`, `<BarChart items unit emphasisLabels/>`, `<DonutChart segments/>`,
   `<PopulationPyramid rows unit/>`)를 최소 변경한다. 내부만 Recharts로 교체.
5. **테마 = DESIGN.md 토큰**. 시리즈/강조/축/그리드/툴팁 색을 CSS 변수(`--color-primary-600` 등)에서
   읽어 라이트/다크·브랜드 일관성을 지킨다. 하드코딩 색 금지.
6. **client-only**. Recharts는 클라이언트 전용이다. 차트 래퍼는 `'use client'`(현재도 그러함).
   결과뷰 자체가 client component라 추가 `dynamic(ssr:false)` 래핑 없이 동작하되, SSR 워닝이
   발생하면 차트 래퍼를 `dynamic(..., { ssr: false })`로 지연 로드한다(빌드 검증에서 판단).

---

## 2. 레이아웃 상세 (기능 3-①)

### 2.1 구조

```
AnalysisResultView (Root, 스크롤 컨테이너 내부)
├─ StickyTopBar (상권명 + 메타 + 공유/저장/시뮬레이션 액션)   ← 전 폭 sticky, 유지
├─ (데스크톱) ResultLayout: grid [Sidebar 220px][Content 1fr]
│   ├─ Sidebar (sticky, 섹션 앵커 내비)
│   │   └─ 요약 / 유동인구 / 매출 / 점포 / 생활권 / 트렌드 / 비교
│   └─ Content (기존 ContextHero + ReportSection들, 롱스크롤)
└─ (모바일 ≤840px) 상단 가로 TabList(현행) + Content 단일 컬럼
```

- 데스크톱 사이드바 폭 `min(220px, ...)`, `position: sticky; top: <헤더높이>`.
- 사이드바 항목: 아이콘(선택)+라벨. 활성 항목은 `spyTab === tab.value`로 강조(좌측 인디케이터 바 +
  텍스트/배경 강조). 클릭 → 기존 `handleTabClick(tab.value)`(lazy 활성화 + `router.replace(tab)` +
  `scrollToReportSection`).
- `ReportSection`의 `scroll-margin-top`은 상단 sticky 바 높이에 맞춘다(현행 112px 유지/조정).
- 접근성: 사이드바는 `nav role="navigation"`, 항목은 `aria-current`로 현재 섹션 표기. 키보드 포커스
  순서 자연스럽게. (진짜 tablist가 아니라 앵커 내비이므로 `role="tab"`은 모바일 폴백 탭에만 유지.)

### 2.2 반응형 분기

| 폭       | 탐색 UI                    | 콘텐츠                                 |
| -------- | -------------------------- | -------------------------------------- |
| `>840px` | 좌측 세로 사이드바(sticky) | 오른쪽 1컬럼(내부 DashboardGrid 2~3열) |
| `≤840px` | 상단 가로 sticky 탭(현행)  | 단일 컬럼                              |

브레이크포인트는 페이지 셸의 기존 `840px`와 정합. 모달(`analysis-result-modal`)은 이미 `≤840px`에서
풀스크린이므로 그 안에서 동일 분기.

### 2.3 재사용 / 신규

- **재사용**: `useScrollSpy`, `useActivatedSections`, `scrollToReportSection`, `handleTabClick`,
  `ANALYSIS_TABS`, `createResultTabHref`, 딥링크 파서.
- **신규(표현)**: `ResultLayout`/`Sidebar`/`SidebarItem` styled 컴포넌트. 사이드바 항목 목록은
  `ANALYSIS_TABS`에서 생성(라벨 재사용). 아이콘은 lucide에서 매핑(요약·유동인구·매출·점포·생활권·
  트렌드·비교).
- **변경**: `analysis-result-view.tsx`의 `StickyHeader` 내 `TabList`를 (a) 데스크톱 사이드바 +
  (b) 모바일 탭으로 분리 렌더.

---

## 3. 차트 교체 상세 (기능 3-②)

### 3.1 패키지

- 추가: `recharts`(^2.x, React 19 호환 확인). devDependencies 아님(런타임).
- 번들 영향은 결과뷰(클라이언트)에 한정. 필요 시 `dynamic` 지연 로드.

### 3.2 래퍼 매핑 (props 유지, 내부 Recharts)

| 래퍼                | 현재 용도          | Recharts 구성                                                                                          | 유지 props                                                                                                           |
| ------------------- | ------------------ | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| `LineChart`         | 시간대별·분기 추세 | `ResponsiveContainer > LineChart > Line + XAxis + YAxis + Tooltip + CartesianGrid`                     | `points: TrendPoint[]`, `unit`, `direction?`, `ariaLabel?` — 방향 배지(↑↓→)는 래퍼가 헤더로 렌더                     |
| `BarChart`          | 요일·연령          | `ResponsiveContainer > BarChart > Bar(+Cell 강조) + XAxis + YAxis + Tooltip`                           | `items: AnalysisMetricRow[]`, `unit`, `emphasisLabels?`, `ariaLabel?` — `emphasisLabels`(주말 등)는 해당 Cell 강조색 |
| `DonutChart`        | 성별 구성          | `ResponsiveContainer > PieChart > Pie(innerRadius) + 중앙 라벨 + Legend`                               | `segments: {label,value,...}[]`, `ariaLabel?`                                                                        |
| `PopulationPyramid` | 연령·성별 %        | `ResponsiveContainer > BarChart(layout="vertical") > Bar 남(음수) + Bar 여(양수) + YAxis(연령)` 발산형 | `rows`, `unit`                                                                                                       |

- **툴팁·라벨 포맷**: 기존 `formatAnalysisValue(value, unit)` 재사용해 tabular-nums·단위 표기 일관.
- **빈/로딩/에러**: 차트 래퍼는 데이터 렌더만 담당. 로딩·에러·빈 상태는 현행처럼 상위
  `AnalysisResultSection`이 관리(차트에 데이터가 있을 때만 마운트). 빈 판정 로직(호출부의
  `empty={...}`)은 그대로 유지.
- **반응형**: `ResponsiveContainer width="100%"` + 고정 aspect(height 또는 aspect prop). 기존
  `ChartBox $maxWidth`로 카드 폭 상한을 유지해 과대 확대를 방지.

### 3.3 정리(cleanup)

- 자체 SVG 내부 구현(`line-chart`/`bar-chart`/`donut-chart`/`population-pyramid`의 SVG 코드),
  `chart-frame`, `use-chart-tooltip`는 교체 후 미사용이면 제거. 파일명/공개 export는 유지해
  호출부 import 경로를 보존한다(내부만 교체).
- 관련 테스트(`charts/*.test.ts`)는 Recharts 렌더 기준으로 갱신. Recharts는 jsdom에서
  `ResponsiveContainer`가 0×0을 반환하므로, 테스트는 (a) 고정 width/height를 주거나 (b) 데이터→
  구성 매핑 순수 함수 단위로 검증한다. 데이터 매핑은 이미 `lib/analysis/chart-data.ts`에 분리돼 있어
  로직 테스트는 그대로 유지된다.

---

## 4. 영향 범위 파일

| 파일                                                                     | 변경                                                          |
| ------------------------------------------------------------------------ | ------------------------------------------------------------- |
| `package.json`                                                           | `recharts` 의존성 추가                                        |
| `src/components/analysis/analysis-result-view.tsx`                       | 상단 탭 → 데스크톱 사이드바 + 모바일 탭 분리, 레이아웃 그리드 |
| `src/components/analysis/charts/line-chart.tsx`                          | 내부 Recharts 교체(props 유지)                                |
| `src/components/analysis/charts/bar-chart.tsx`                           | 〃                                                            |
| `src/components/analysis/charts/donut-chart.tsx`                         | 〃                                                            |
| `src/components/analysis/charts/population-pyramid.tsx`                  | 〃                                                            |
| `src/components/analysis/charts/chart-frame.tsx`, `use-chart-tooltip.ts` | 미사용 시 제거                                                |
| `charts/*.test.ts`                                                       | Recharts 기준 갱신                                            |
| `docs/features/analysis/result.md`                                       | supersede 반영(D2·제외범위·레이아웃·변경이력)                 |

**미변경(중요)**: `analysis-result-modal.tsx`, `analysis-result-page.tsx`, `use-scroll-spy.ts`,
`use-activated-sections.ts`, `presentation.ts`, `chart-data.ts`, 모든 `fetchCommercial*` API,
데이터 계약.

---

## 5. 성공 기준

1. 데스크톱(>840px): 결과뷰 좌측에 세로 사이드바 내비가 보이고, 항목 클릭 시 해당 섹션으로 스크롤,
   스크롤 시 현재 섹션이 하이라이트된다. `?tab=` 딥링크·공유 URL은 현행과 동일하게 동작.
2. 모바일(≤840px): 기존 상단 가로 탭으로 폴백되고 이중 스크롤이 없다.
3. 모달·풀페이지 두 surface 모두에서 사이드바/탭·스크롤이 정상.
4. 4종 차트가 Recharts로 렌더되어 반응형·툴팁·단위 표기가 동작하고, null은 0으로 표기하지 않는다.
5. 지연 조회(활성화 시에만 요청)·에러/빈/로딩 상태가 현행과 동일하게 유지된다.
6. `pnpm qa:verify`(format:check + lint + typecheck + build) 통과.

---

## 6. 리스크 / 확인 필요

- **Recharts × React 19 / Next 16 호환**: 설치 후 빌드에서 검증. 문제 시 대안(`@nivo`,
  `visx`)으로 재논의 — 단, 인터페이스는 유지하므로 교체 비용은 래퍼 내부에 국한.
- **jsdom 테스트**: `ResponsiveContainer` 0×0 이슈 → 테스트 전략 3.3 적용.
- **사이드바 sticky 오프셋**: 모달/풀페이지의 상단 sticky 바 높이 차이 → `scroll-margin-top`과
  사이드바 `top`을 공통 상수로 맞춘다.
