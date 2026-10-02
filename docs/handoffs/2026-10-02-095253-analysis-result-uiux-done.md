---
project: bosspickseoul
cwd: frontend/
branch: none — #482 의 PR 3개(#484 · #486 · #487)가 develop 에 머지됐고 작업 브랜치는 지웠다
timestamp: 2026-10-02T09:52:53+09:00
title: 상권분석 결과 UI/UX 개편 완료(#482) — 남은 것은 BE #485 · 모바일 높이 · 프랜차이즈 분모
files:
  - frontend/src/components/analysis/analysis-result-view.tsx
  - frontend/src/components/analysis/analysis-result-section.tsx
  - frontend/src/components/analysis/analysis-summary-insights.tsx
  - frontend/src/components/analysis/analysis-summary-cards.tsx
  - frontend/src/components/analysis/analysis-policy-list.tsx
  - frontend/src/lib/analysis/chart-insights.ts
  - frontend/DESIGN.md
  - frontend/docs/features/analysis/result.md
---

## 작업 주제: 상권분석 결과 UI/UX 개편 완료(#482) — 남은 것은 BE #485 · 모바일 높이 · 프랜차이즈 분모

### 요약

2026-10-01 인계(`2026-10-01-224515-analysis-result-uiux.md`)의 4단계 「요약 재구성·그리드·모바일」(#482)을 PR 3개로 끝냈다. 모두 develop 에 rebase 머지됐고, #482 는 닫혔으며 체크리스트 18개를 모두 체크했다. 결과 화면 개편 1~4단계가 모두 끝났다.

| PR | 내용 | develop 커밋 |
|---|---|---|
| #484 | 카드 그리드 열 수를 콘텐츠 폭(container query)으로 정함 · 2열 빈칸 해소 · 「지역별 소비」 타일 넘침 · 로딩 자리 높이 | `3d602c91` |
| #486 | 요약을 결론 화면으로 재구성 — 중복 카드 3장 제거 · 인사이트 세 줄 · 결론 설명 문장 · 지원 정책 접기 | `c34e08f3` |
| #487 | 모바일 — 핵심 지표 2×2·태블릿 4열 · 맥락 카드 액션 배치 · 가로 탭 끝 흐림·활성 탭 자동 스크롤 | `1a7ad07c` |

BE 이슈 #485(「지역 평균 대비」 재정의용 점포당 평균 매출 지수)를 새로 남겼다.

### 내린 결정

- **카드 그리드 열 수는 뷰포트가 아니라 놓인 폭으로 정한다.** `ReportSection` 이 `analysis-report` 컨테이너다. 1열 <640 · 2열 · 3열 ≥1080 이다.
  - 1280px 뷰포트는 사이드바를 빼면 콘텐츠가 990px 라, 3열이면 칸이 317px 였다.
  - 3열 기준값 `REPORT_THREE_COLUMN_MIN` 은 `DashboardGrid` 와 `PairSpanItem` 이 함께 쓴다. 어긋나면 셋째 카드가 다시 혼자 남는다.
- **3장 그룹은 2열에서 넓어질수록 좋아지는 카드 하나가 한 줄을 쓴다**(`PairSpanItem`).
  - 해당 카드: 유동인구·매출 시간대 막대, 생활권 「지역별 소비」
  - 가로 막대·피라미드는 고르지 않는다.
  - 점포 그룹은 가로 막대 두 장이라 `$maxColumns={2}` 다.
- **요약은 결론 화면이다.** 구성은 핵심 지표 4개 + 인사이트 세 줄 + 지원 정책(2건만 보이고 펼침)이다.
  - 걷어낸 카드에만 있던 값은 옮겼다.
    - 프랜차이즈 수·비중, 개업률·폐업률 → 점포 탭 「점포 분석」 맥락 줄
    - 상주인구 성별 → 핵심 지표 「상주인구」
  - `SalesComparisonBars` 는 지웠다.
- **매출(`/sales`)은 첫 화면에서 부른다**(사용자 결정, D4-2 의 지연 조회 예외). 인사이트의 피크 시간·주 고객층이 이 응답에서 나온다.
  - 실측한 profile `keyMetrics` 에는 `peakSalesTimeSlot`·`dominantSalesAgeGroup` 이 없다. `backend/docs/api-screens.md` 예시에는 있지만 실제 응답에는 없다.
- **시설(`/facilities`)은 생활권 탭에서 부른다.** 요약에서 쓰지 않게 되었기 때문이다.
- **개·폐업 건수의 분모는 유사 업종 점포 수다.** 실측: `similarStoreCount` 20, `openedStoreCount` 1, `openingRate` 5.
  - 그래서 경쟁 줄 주어를 유사 업종 점포로 맞췄다(`describeStoreCompetition`).
  - 선택 업종 「점포 수」 카드에서는 순증 맥락을 뺐다.
  - 문장은 「이번 분기」가 아니라 「이 분기」로 쓴다. 헤더에서 지난 분기를 고를 수 있다.
- **업종 이름을 아직 못 받았으면 결론 문장을 비운다.** 코드(「CS100010」)를 문장에 넣지 않는다.
- **숫자 카드는 1열로 내리지 않는다.** 카드 묶음(`summary-cards` 컨테이너) 폭으로 4열 ≥640 · 2열이다.
  - 좁은 구간(640~799 · <400)에서만 값 글자를 21→20px 로 줄인다(타이포 스케일 30·26·22·20·16·14·13·12 안).
  - `overflow-wrap: anywhere` 를 안전망으로 둔다.
- **맥락 카드 액션은 DOM 순서로 시뮬레이션을 첫 자리에 둔다.** `order` 를 쓰면 키보드 순서와 보이는 순서가 갈린다.
  - ≤760px 은 [시뮬레이션] 한 줄 + 세 칸이다.
  - 카드가 340px 보다 좁으면 세 칸에서 아이콘 칸(`IconSlot`)째 뺀다. svg 만 숨기면 빈 칸이 남아 글자가 밀린다.
- **가로 탭 바는 가려진 쪽 끝만 흐린다**(mask-image). 활성 탭은 탭 바만 `scrollTo` 로 가운데에 맞춘다.
  - `scrollIntoView` 는 세로 컨테이너까지 움직여서 쓰지 않는다.
  - 이 규칙을 DESIGN.md Navigation 에도 일반 규칙으로 적었다.

### 남은 작업

1. **BE #485 대기 → 「지역 평균 대비」 화면 교체.** BE 가 점포당 평균 매출 지수를 내리면 FE 이슈를 새로 판다. 「비교 분석」의 총액 3개를 지수 표현으로 바꾼다.
2. **점포 「프랜차이즈 10개 · 100%」 분모 확인.** 실측 상권(아래)에서 `franchiseStoreCount` 10, 선택 업종 `totalStoreCount` 10 이다.
   - 계산은 걷어낸 요약 카드와 같다(프랜차이즈 / 선택 업종 점포).
   - 값이 의심스럽다. 분모가 유사 업종(20)일 수 있으니 BE 에 확인하거나 BE 이슈로 묻는다.
3. **모바일 높이.** 375px 전체 스크롤: 11,026(착수 전) → 8,727(#486) → 7,751px(#487). 목표 6,500px 안팎에는 못 미친다.
   - 남은 높이는 대부분 차트 카드 11장의 1열 스택이다(본문 260~348px).
   - 후보: 모바일에서 차트 카드 접기(첫 카드만 펼침), 또는 시간대·요일 막대를 한 카드의 토글로 합치기. 정하기 전에 사용자에게 묻는다.
4. (이전 인계에서 이어짐) 시간대 막대의 **시간당 환산**. 원천이 구간 합계인지 확인한 뒤 정한다.
5. (이전 인계에서 이어짐) 증감 「거의 같아요」 기준을 서버 `trendDirection` ±1% 보합 기준과 맞출지. 아직 사용자에게 묻지 않았다.

### 주의사항

- **브라우저 검증은 gstack browse 헤드리스로 했다**(`~/.claude/skills/gstack/browse/dist/browse`). 측정·스크린샷 절차는 스크래치패드 `.sh` 로 뺐다.
  - dev 는 `PORT=5173 nohup pnpm dev &` 로 띄웠다.
  - `qa:verify` 전에는 반드시 dev 서버를 내린다(`lsof -ti tcp:5173 -sTCP:LISTEN | xargs kill`).
- 결과 화면 스크롤 컨테이너는 `[role=dialog]` 안에서 `overflowY auto` 이고 `scrollHeight > clientHeight` 인 요소다. 탭 섹션은 `#report-<tab>` 이다.
- **스켈레톤은 로딩 중 화면으로 잡기 어렵다.** 기간을 바꿔도 이전 데이터가 남고, 탭 쿼리는 캐시돼 있다. 그래서 `ServerStyleSheet` 로 CSS 를 검사하는 단위 테스트로 대신했다.
- **탭 클릭 뒤 smooth scroll 은 3초 넘게 걸린다.** 바로 읽으면 scroll-spy 활성 탭이 직전 탭으로 보인다. 몇 초 기다린 뒤 다시 읽는다.
- **Jenkins `continuous-integration/jenkins/pr-merge` 가 ERROR 였던 #487** 은 커밋을 내용 변경 없이 amend 하고 force-push 해서 다시 돌렸다.
  - 이렇게 하면 SHA 가 바뀌고 빌드가 새로 돈다. rebase 머지라 빈 커밋을 쌓지 않는다.
  - Jenkins 쪽 장애는 사용자가 「고쳤다」고 전했다.
- `git fetch` 가 다른 워크트리의 동시 fetch 와 부딪혀 `cannot lock ref` 로 실패한 적이 있다. 다시 돌리면 된다.
- 검증용 실데이터 상권: `districtCode=11350&administrationCode=11350600&commercialCode=3110438&serviceCode=CS100010&periodCode=20261` (노원구 공릉2동 경춘선숲길 우측, 커피-음료).
