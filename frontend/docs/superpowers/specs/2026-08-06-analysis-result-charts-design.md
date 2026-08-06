# 상권 분석 결과 — SVG 차트 도입 (High 슬라이스) 설계

> **작성일**: 2026-08-06
> **대상**: 웹 (Next.js App Router) / `frontend/`
> **정본 명세**: [분석 결과 리포트](../../features/analysis/result.md) — 본 설계 승인 후 반영
> **상태**: 설계 승인 대기

## 1. 배경 / 문제

`/analysis/result`의 지표는 현재 두 형태로만 표현된다.

- `AnalysisMetricList`의 CSS 가로 비례 바 (유동/매출/거주 연령·항목별 지출·트렌드)
- 텍스트 숫자 카드 (`renderCards` / `MetricCard` / `ComparisonGrid`)

이 표현은 **시계열(추세)·부분전체(성비)·양방향 분포(연령×성별)** 를 효과적으로 전달하지 못한다. 특히:

- **트렌드**를 비례 바로 그리면 분기 간 변화 방향·기울기가 드러나지 않는다.
- **성별 분포**(유동/매출/거주)는 데이터가 있으나 화면에 전혀 노출되지 않는다.
- **연령×성별**(유동/매출) 데이터도 미노출.

## 2. 목표 / 비목표

**목표 (이번 High 슬라이스)**

1. 전달력 개선이 가장 큰 3개 차트를 SVG로 도입한다.
2. 재사용 가능한 SVG 차트 프리미티브 3종을 확보한다 (다음 슬라이스의 기반).
3. 차트 라이브러리를 도입하지 않는다 (명세 D0/D3-4 유지, 번들 0 추가).

**비목표 (다음 슬라이스)**

- 시간/요일/연령 CSS 바 → 세로 막대 교체 (이미 바 형태라 우선순위 낮음)
- 벤치마크 z-score 막대, 지역 3계층 미러 바, 개·폐업 도넛, 시간대 라인화

## 3. 무엇을 만드나 — 데이터 검증 완료

| #   | 차트                                                    | 배치 탭                               | 데이터 소스 (검증)                                                                                   | 프리미티브          |
| --- | ------------------------------------------------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------- |
| 1   | 분기별 라인 + `trendDirection` 배지(↑↓→) + `changeRate` | 트렌드 (SALES / FOOT_TRAFFIC / STORE) | `CommercialTrend.periods[]` (`periodCode`, `value`, `changeRate`)                                    | `LineChart`         |
| 2   | 연령×성별 인구 피라미드                                 | 유동인구                              | `CommercialFootTraffic.byAgeGenderPercentItem` (`maleAge10Percent`…`femaleAge60PlusPercent`)         | `PopulationPyramid` |
| 3   | 성별 도넛                                               | 거주 · 매출                           | 거주 `malePercentage`/`femalePercentage`, 매출 `countByGenderItem.maleSalesCount`/`femaleSalesCount` | `DonutChart`        |

### 3-1. 피라미드 배치 정정 (데이터 근거)

DESIGN.md 화면 명세(S-DISC-3)는 "거주: 인구 피라미드"라 규정하지만, **거주 데이터(`CommercialResidentPopulation`)에는 연령별 성별 분리가 없다** — `byAgeItem`(연령 합계) + `malePercentage`/`femalePercentage`(전체 성비)뿐. 전체 성비를 연령대에 배분하면 API가 제공하지 않는 값을 날조하는 것이며, 명세 D6("`null`을 0으로 표현 금지, 임의 값 생성 금지")에 위배된다.

따라서:

- **진짜 연령×성별 피라미드**는 데이터가 있는 **유동인구**(`byAgeGenderPercentItem`)에 배치한다.
- **거주**는 연령별 막대(기존 유지) + **성별 도넛**(전체 성비, 정직한 표현)으로 처리한다.

이 정정은 정본 명세 result.md에 명시한다.

## 4. 아키텍처 — 표현/데이터 분리

```
frontend/src/components/analysis/charts/
  chart-frame.tsx        # viewBox 반응형 뼈대: 축·그리드·범례·툴팁 레이어
  line-chart.tsx         # 정규화 series 입력만
  population-pyramid.tsx  # 좌우 diverging 수평 막대
  donut-chart.tsx        # 단일 비율(2-3 세그먼트)
  use-chart-tooltip.ts   # 호버/포커스 툴팁 훅
frontend/src/lib/analysis/chart-data.ts  # API DTO → 정규화 series (순수함수)
```

**원칙**

- 차트 컴포넌트는 API 타입을 모른다. 정규화된 배열(`{ label, value }[]`, 피라미드는 `{ ageLabel, male, female }[]`, 라인은 `{ periodLabel, value, changeRate }[]`)만 받는다.
- API DTO → 정규화 매핑은 `chart-data.ts` 순수함수로 분리해 단위 테스트한다.
- 공통 골격(반응형 viewBox, 축/그리드, 범례, 툴팁 레이어)은 `chart-frame.tsx`에 모은다. 각 차트는 마크(선/막대/호)만 책임진다.

**대안 검토**

- 단일 범용 `<Chart type>`: 내부 분기 복잡·경계 흐림 → 기각.
- 탭 파일 인라인 SVG: 재사용·테스트 불가, DESIGN "공통 컴포넌트는 `src/components`로" 위반 → 기각.

### 4-1. 마운트 지점 (`analysis-result-view.tsx`)

- 트렌드 탭: 각 `trends.map` 섹션의 `AnalysisMetricList` → `LineChart`(값 라벨은 유지 가능).
- 유동인구 탭: 신규 "연령·성별 유동인구" 섹션 추가 → `PopulationPyramid`. 데이터는 `footTraffic.byAgeGenderPercentItem`.
- 거주 탭: "연령별 상주인구" 섹션 하단 또는 신규 섹션에 성별 `DonutChart` 추가 (`population.malePercentage/femalePercentage`).
- 매출 탭: 신규 "성별 매출건수" 섹션에 `DonutChart` (`sales.countByGenderItem`).

새 데이터(`byAgeGenderPercentItem`, `countByGenderItem`)는 기존 쿼리(`footTrafficQuery`, `salesQuery`) 응답에 이미 포함되므로 **추가 API 호출 없음**.

## 5. 품질 기준 (DESIGN.md 준수)

- **토큰만 사용**: 라인/강조 `--color-primary-600`(#2272eb), 그리드·축은 옅게. 추세 배지·`changeRate`만 양수 `green500`/음수 `red500`. 성별 2색은 "강조 1 + 보조 2 이내" 규칙 내 — 남성 `--color-primary-*`, 여성은 보조 1색(신규 토큰 `--color-chart-female` 추가, 색상 외 명도차 + 텍스트 라벨 병기로 컬러블라인드 대응).
- **인터랙션**: 값 상시 노출 + 호버/포커스 시 상세 툴팁(hover-only 금지 준수). 키보드 포커스 링, `aria-label`.
- **반응형**: `viewBox` 기반 full-width, aspect 유지 (DESIGN "Charts: full-width, responsive").
- **요약 우선**: 요약 숫자 카드가 차트보다 먼저 읽히도록 배치 유지.
- **상태**: `null`은 0 아님 → "데이터 없음" (기존 `formatAnalysisValue`/`getMetricMaximum` 재사용). 섹션 loading/error/empty는 기존 `AnalysisResultSection` 경계 그대로.

## 6. 테스트 전략

- `chart-data.ts` 매핑 순수함수 단위 테스트: 정상 / `null` 혼재 / 빈 배열 / 전부 `null` 경계.
- 각 차트 컴포넌트 fixture 렌더 테스트: 세그먼트/포인트 수, 접근성 속성, 데이터 없음 처리.
- 완료 보고 전 `pnpm qa:verify` (format:check && lint && typecheck && build) 통과.

## 7. 위험 / 미결

| 항목                                       | 처리                                                                    |
| ------------------------------------------ | ----------------------------------------------------------------------- |
| 실제 분석 응답 미비                        | fixture 기반 검증, 실데이터 적재 후 브라우저 재검증 (명세 D8 방침 계승) |
| `byAgeGenderPercentItem` 키 누락/부분 null | 정규화 단계에서 누락 연령/성별을 "데이터 없음"으로 격리, 축은 유지      |
| 여성 색상 토큰 신설                        | DESIGN.md 토큰 절에 추가 여부를 명세 갱신 시 확정 (임시 상수 금지)      |

## 8. 변경 이력

| 버전 | 날짜       | 내용                                                                  | 작성자 |
| ---- | ---------- | --------------------------------------------------------------------- | ------ |
| 0.1  | 2026-08-06 | High 슬라이스(트렌드 라인·유동 피라미드·성별 도넛) SVG 도입 설계 초안 | Claude |
