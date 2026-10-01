---
project: bosspickseoul
cwd: frontend/
branch: feature/fe/analysis-result-chart-forms (PR #481 열림) · 다음 작업은 develop 에서 새 브랜치
timestamp: 2026-10-01T22:45:15+09:00
title: 상권분석 결과 UI/UX 개편 — 차트 3단계 완료, 요약 재구성(#482) 이어서
files:
  - frontend/src/components/analysis/analysis-result-view.tsx
  - frontend/src/components/analysis/analysis-trend-summary.tsx
  - frontend/src/components/analysis/charts/share-bar.tsx
  - frontend/src/components/analysis/charts/bar-chart.tsx
  - frontend/src/components/analysis/charts/line-chart.tsx
  - frontend/src/components/analysis/charts/chart-theme.tsx
  - frontend/src/components/analysis/analysis-result-modal.tsx
  - frontend/src/lib/analysis/chart-insights.ts
  - frontend/src/lib/analysis/chart-data.ts
  - frontend/src/lib/analysis/chart-scale.ts
  - frontend/src/lib/analysis/use-scroll-spy.ts
  - frontend/DESIGN.md
  - frontend/docs/features/analysis/result.md
---

## 작업 주제: 상권분석 결과 UI/UX 개편 — 차트 3단계 완료, 요약 재구성(#482) 이어서

### 요약

`/analysis/result` 결과 모달의 그래프와 레이아웃을 데스크탑·태블릿·모바일 기준으로 검토했다.
변경안은 4단계로 나눴다. 이번 세션에서 1~3단계를 PR 로 올렸다.

| 단계 | PR | 상태 | 내용 |
|---|---|---|---|
| 1. 차트 정확성 | #479 | 머지 | 막대 Y축 0 시작 · 최댓값 1개 강조와 값 라벨 · 여성 색 `--color-chart-female` · 증감 ▲▼+문장(빨강/초록 금지) · 축 단위 「(원)」 · X축 라벨 전부 표시(좁으면 두 줄) |
| 2. 헤더·분기 | #480 | 머지 | 기간 선택을 sticky 헤더 하나로 · 전체 화면 분기 840→**1024px** · ≤640 헤더 두 줄 · scroll-spy inset 을 `scroll-margin-top` 과 맞춤 |
| 3. 차트 형태 | #481 | **열림(리뷰 대기)** | 시간대 곡선→막대 · 성별 도넛→연령 카드 아래 100% 성비 막대(`ShareBar`) · 트렌드 3장→「분기별 변화」 1장(`AnalysisTrendSummary`) · 카드 결론 문장(`chart-insights`) |
| 4. 요약 재구성·그리드·모바일 | **#482 이슈** | 미착수 | 다음 기기에서 이어 할 작업 |

### 내린 결정

- **막대는 Y축 0 에서 시작한다.** 꺾은선만 0 이 아닌 기준선을 허용한다(`computeNiceYScale(..., { includeZero })`).
- **강조 색은 최댓값 1개에만 쓴다.** 요일 고정 강조(토·일)는 폐기했다.
  - 강조 막대의 값 라벨은 행의 `labelValue` 에 싣는다.
  - recharts 가 높이 0 막대를 걸러내서 LabelList index 가 어긋나기 때문이다.
- **증감은 빨강·초록으로 칠하지 않는다.** 국내 사용자는 빨강을 상승으로 읽는다.
  - 문장 예: 「매출이 직전 분기보다 6.7% 줄었어요」.
  - 방향·비율은 마지막 두 점 값으로 FE 가 계산한다(`describeLatestChange`).
  - 반올림해서 0% 가 되면 「거의 같아요」로 적는다.
  - **서버 `trendDirection` 의 보합 기준(±1%)과는 맞추지 않았다.** 사용자에게 아직 확인받지 못한 열린 질문이다.
- **기간 선택은 헤더에 하나만 둔다.** 7개 그룹 머리의 select 가 모두 URL `periodCode` 하나를 바꾸고 있었다.
- **분기점은 1024px 다.** 지도 셸 `useNarrowViewport` 와 같다.
  - 같은 표면을 쓰는 AI 리포트 크게보기도 1024 를 따른다(1025px 이상에서만 열린다).
- **두 조각 성비는 도넛 대신 100% 막대로 그린다.**
  - 문장과 막대는 같은 `toShares`(최대 나머지 방식, `lib/analysis/chart-data`)를 쓴다.
  - 한쪽 성별 값만 오면 「데이터 없음」이다.
- **결론 문장 규칙**: 구간 하나라도 null 이면 문장을 뺀다. 주어·목적어를 생략하지 않는다(메모리 copy-no-ellipsis).
- **트렌드 카드 하나의 오류는 행 단위로 처리한다**(`resolveTrendSectionState`).
  - 값이 있는 지표가 하나도 없을 때만 섹션 오류로 올린다.
  - 섹션 오류는 재시도 가능한 오류를 먼저 고른다.
- **스파크라인은 축이 없다.** 그래서 세로 범위가 평균의 10% 보다 좁으면 넓힌다(`sparklineDomain`).
- **스택 PR 도 base 는 항상 `develop` 이다**(frontend/CLAUDE.md). 머지는 rebase merge 이고, 머지 뒤 위 브랜치는 `origin/develop` 으로 옮겨 탄다.

### 남은 작업

1. **#481 리뷰·머지.** 머지 전에 develop 이 움직였으면 `feature/fe/analysis-result-chart-forms` 를 `origin/develop` 위로 rebase 한다.
2. **#482 착수** (#481 머지 뒤). 브랜치는 `feature/fe/analysis-result-summary-grid` 같은 이름으로 develop 에서 새로 판다. 체크리스트는 이슈 본문이 정본이다. 요약하면 다음과 같다.
   - 요약 탭 재구성
     - 중복 카드 「점포 현황」·「생활권·시설」을 제거한다.
     - 인사이트 3줄을 넣고, 누르면 탭으로 이동하게 한다.
     - 정책 목록은 2개만 보이고 「모두 보기」로 펼친다.
   - 그리드
     - `DashboardGrid` 열 전환을 container query 로 바꾼다.
     - 2열 구간에서 마지막 카드가 혼자 남는 문제를 없앤다.
     - 「지역별 소비」 `ComparisonGrid` 타일의 배지·값 넘침을 고친다.
   - 모바일
     - 핵심 지표를 2×2 로 바꾼다(`analysis-summary-cards.tsx` ≤460 1열).
     - `ContextHero` 버튼을 정리한다.
     - 탭 바에 페이드를 넣고 활성 탭을 자동 스크롤한다.
   - 스켈레톤 높이를 차트 높이에 맞춘다(지금 96px 고정).
3. **「지역 평균 대비」 재정의.** 지금은 요약 「지역별 월 매출 비교」와 같은 총액 3개를 반복한다.
   - 점포당 평균 매출 지수(구 평균 = 100)가 필요하다. BE 데이터가 없으면 **BE 이슈만** 남긴다(메모리 fe-only-be-issue-only).
4. (검토 후보) 시간대 막대의 **시간당 환산**. 원천이 구간 합계인지 확인한 뒤 정한다.
   - 실데이터로 시간당 환산하면 구간별 차이가 거의 없어졌다(유동인구 약 6.1~7.2만/시간).
   - 지금은 각주로만 알린다.

### 주의사항

- **앱 Browser pane 이 숨겨지면 결과 모달이 렌더되지 않는다**(`document.hidden`, 메모리 fe-dev-server-pitfalls). 이번 세션은 Playwright 헤드리스로 우회했다.
  - dev 서버(5173)를 띄운 상태에서 `frontend/` 안에 임시 `.mjs` 를 두고 `import { chromium } from '@playwright/test'` 로 375/768/1440 을 캡처한 뒤 파일을 지웠다.
  - `playwright` 패키지 직접 import 는 안 된다. `@playwright/test` 를 쓴다.
  - 헤더는 `document.querySelector('[role=dialog] header')` 로 잡는다. 그냥 `header` 는 사이트 헤더가 잡힌다.
- **dev 서버를 띄운 채 `pnpm qa:verify`(build)를 돌리지 않는다.** 서버를 먼저 멈춘다.
- 검증용 실데이터 상권: `districtCode=11350&administrationCode=11350600&commercialCode=3110438&serviceCode=CS100010&periodCode=20261` (노원구 공릉2동 경춘선숲길 우측, 커피-음료).
- 실측한 결과 헤더 높이: 375px 134px · 768px 102px · 1440px 63px. 섹션 `scroll-margin-top` 은 ≤640 148px · ≤1024 116px · 데스크탑 76px 이다.
- `DonutChart` 는 결과 화면에서 빠졌다. 상권현황(`/status`)과 시뮬레이션 리포트에서는 여전히 쓴다. `LineChart` 는 이제 `/status` 에서만 쓴다(방향 배지 prop 은 삭제).
- zsh 에서 `grep --include=*.tsx` 같은 글롭은 매치가 없으면 **명령 줄 전체가 중단된다.** `grep -rn ... src` 로 쓴다.
