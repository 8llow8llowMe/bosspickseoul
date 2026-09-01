# 후보 상권 비교 화면 — 설계 명세

- 작성일: 2026-09-01
- 브랜치: `feature/fe/commercial-compare` (base `develop` `95a890ce`)
- 이슈: [#175](https://github.com/8llow8llowMe/bosspickseoul/issues/175)
- 범위: 프론트엔드 전용. **백엔드 API 계약 변경 없음** — 기존 엔드포인트 세 개만 쓴다.
- 선행: [2026-09-01 과업 흐름 감사](./2026-09-01-task-flow-audit.md) (J1-4)

---

## 0. 왜 만드는가

과업 흐름 감사에서 확인된 것: **「강남에서 카페 하려는데 어디가 좋을까」는 가장 흔한
진입 의도인데, 후보 상권 여럿을 나란히 견주는 화면이 제품에 없다.**

`/analysis/result` 의 「비교」 탭은 상권끼리 비교하지 않는다. 자치구·행정동 **평균과만**
비교한다. 탭 이름이 기대를 만들고 그 기대를 배신한다.

실측한 대가: 홈 히어로 CTA 를 따라가면 `/analysis` 에서 역삼역 4번을 고르게 되는데,
같은 조건으로 `/recommend` 를 돌리면 그 상권은 **커피-음료 5위/5위, 기회도 낮음(21점)**
으로 5개 후보 중 꼴찌다. 상권분석은 그 사실을 끝까지 알려주지 않는다.

## 1. 승인된 결정 (2026-09-01, 사용자 확정)

| 쟁점      | 결정                                                                                    |
| --------- | --------------------------------------------------------------------------------------- |
| 비교 개수 | **N개, 2~4** (A/B 아님 — `/recommend` 가 Top 5 를 주고 실제 과업은 「3곳 중 고르기」다) |
| 수집 동선 | **`/recommend` Top 5 에서만** 담는다. `/analysis` 누적·화면 내 피커는 이번 범위 밖      |
| 표 내용   | **추천 점수 + 원지표 둘 다**                                                            |
| 승자 표시 | **점수만 색, 원지표는 사실만**                                                          |
| 화면 위치 | **전용 라우트 `/recommend/compare`** (접근안 A)                                         |

접근안 B(`/recommend` 안의 네 번째 뷰)를 버린 이유: 좌측 패널이 ~460px 라 지표 14행 ×
상권 4열이 들어가지 않는다. 지표 수를 줄이면 위 「점수+원지표」 결정과 충돌한다.
접근안 C(결과 다이얼로그 오버레이)는 모바일에서 시트 위에 시트가 겹치는 문제를
기존 condition-selector 명세(D4-2)가 이미 배제했다.

## 2. 제약

- `DESIGN.md` 토큰만 사용. 새 색·radius·shadow 토큰 금지.
- 백엔드 계약 변경 금지. `fetchCommercials` · `fetchCommercialRecommendations` ·
  `fetchCommercialProfile` 세 개만 쓴다.
- 테스트는 저장소 방식(node 환경 + `renderToStaticMarkup` 문자열 단언)을 따른다.
  jsdom·testing-library 를 새로 들이지 않는다.
- 완료 전 `pnpm qa:verify` 통과.

---

## 3. 라우트와 URL 계약

신규 라우트 `/recommend/compare`. **URL 이 정본이고 이것만으로 화면이 복원된다.**

```
/recommend/compare
  ?districtCode=11680
  &administrationCode=11680640
  &serviceCode=CS100010
  &commercialCodes=3120197,3120192,3110958
```

파라미터 이름은 `RECOMMEND_URL_PARAMS` 와 같은 것을 쓴다 — `/analysis` 와도 같다
(`recommend-url.ts` 의 기존 결정).

### `a.` / `b.` 접두사를 쓰지 않는다

`simulation/compare` 는 좌우가 **서로 다른 조건**을 갖기 때문에 접두사가 필요했다.
여기서는 자치구·행정동·업종이 **전 열 공통**이다(프로필 API 가 `serviceCode` 를 요구하고,
같은 업종으로 상권을 견주는 것이 이 화면의 목적이다). 풀 문제가 없는 곳에 접두사를
들이면 URL 만 길어지고 파서가 복잡해진다.

### 점수를 URL 에 싣지 않는다

`recommend-url.ts` 가 이름을 싣지 않는 것과 같은 이유다 — 링크가 낡은 값을 들고
되살아난다. 점수는 §4 의 절차로 매번 다시 얻는다.

### 개수 범위

**2~4개.** 1개는 비교가 아니고, 5개는 표가 가로로 넘친다(모바일에서 이미 스크롤이다).

- 2 미만 → 표를 그리지 않고 §7 의 안내 상태
- 4 초과 → **앞 4개만 남기고 잘라낸 사실을 화면에 말한다.** 조용히 자르지 않는다
- 중복 코드는 첫 등장만 남기고 제거하되 **순서는 URL 순서를 지킨다**
  (`createStableCommercialCodes` 는 정렬하므로 여기서는 쓰지 않는다 — 그것은 요청
  캐시 키용이고, 열 순서는 사용자가 고른 순서여야 한다)

---

## 4. 데이터 흐름 — 점수를 `/recommend` 와 어긋나지 않게 되살린다

이 화면에서 **가장 깨지기 쉬운 지점**이다. 여기가 틀리면 두 화면이 같은 상권에 다른
점수를 말한다.

### 🔴 선택된 코드만으로 추천을 재요청하면 안 된다

```
❌ fetchCommercialRecommendations({ commercialCodes: ['3120197','3120192','3110958'], topN: 5 })
```

두 가지가 깨진다.

1. `clampRecommendationTopN` 이 `topN` 을 **최소 5로 올린다**(백엔드 허용 5~30).
2. 점수·순위가 **그 3개 안에서** 다시 계산된다. `/recommend` 는 행정동 전체를 놓고
   매긴 값을 보여 줬으므로 두 화면의 숫자가 달라진다.

### ✅ 추천 입력을 그대로 재현한다

`/recommend` 의 추천 요청 입력은 **행정동의 전체 상권 목록**이다
(`recommend-page.tsx` 의 `commercials.map(...)` → `createStableCommercialCodes`).
그 목록은 `(districtCode, administrationCode)` 만으로 결정적으로 다시 얻을 수 있다.

1. `fetchCommercials(districtCode, administrationCode)` → 행정동 전체 상권
2. `createStableCommercialCodes(codes)` → `/recommend` 와 동일한 정렬·중복제거
3. `fetchCommercialRecommendations({ serviceCode, commercialCodes: 전체, periodCode: RECOMMENDATION_PERIOD_CODE, topN: RECOMMENDATION_TOP_N })`
4. 응답에서 **URL 이 고른 코드만** 골라 열로 세운다 (순서는 URL 순서)
5. 열마다 `fetchCommercialProfile(code, serviceCode, periodCode)`

### 캐시 공유 — 추천에서 넘어오면 네트워크 0회

`QueryClientProvider` 가 루트 `app/layout.tsx` 에 있어 클라이언트 내비게이션으로
라우트를 옮겨도 캐시가 살아 있다(`staleTime` 5분). 아래 키를 `/recommend` 와
**똑같이** 쓰면 3·5단계가 캐시 적중한다.

`recommend-page.tsx` 에서 실제로 쓰는 키는 아래와 같다. **이대로 맞춘다.**

| 쿼리             | 키                                                                                                       |
| ---------------- | -------------------------------------------------------------------------------------------------------- |
| 행정동 상권 목록 | `['recommend','regions','commercials', districtCode, administrationCode]`                                |
| 추천             | `['recommend','results', districtCode, administrationCode, serviceCode, periodCode, commercialCodesKey]` |
| 프로필           | `['recommend','profile', commercialCode, serviceCode, periodCode]`                                       |

`commercialCodesKey` 는 `createStableCommercialCodes(...).join(',')` 형태다
(`SubmittedRecommendation.commercialCodesKey`). 새 화면도 같은 방식으로 만든다 —
문자열이 한 글자라도 다르면 캐시가 갈라진다.

> 키를 새로 지어내면 캐시가 갈라져 같은 데이터를 두 번 받는다. **`recommend-page.tsx`
> 의 키를 읽어 그대로 맞춘다.** 키 모양이 두 곳에 흩어지지 않게 상수/헬퍼로 뽑는다.

공유 링크로 콜드 진입하면 1~5를 전부 탄다. 그때도 같은 절차라 같은 점수가 나온다.

---

## 5. 화면 구성

### 5.1 머리말

- 제목: `{업종명} 상권 비교`
- 부제: `{자치구} {행정동} · {기간}` — `/recommend` 의 요약 줄과 같은 문구를 쓴다
- 「추천으로 돌아가기」 링크 (URL 조건 그대로 `/recommend?...&view=results`)

### 5.2 표 — 행=지표, 열=상권

열 머리에 상권명과 추천 순위(`3위`)를 적는다. 순위는 `/recommend` 가 매긴 값 그대로다.

**상단: 추천 점수 5행 — 색 있음**

| 행        | 출처                                     |
| --------- | ---------------------------------------- |
| 종합 점수 | `CandidateCommercial.compositeScore`     |
| 기회도    | `metricBreakdown` 의 `OPPORTUNITY_SCORE` |
| 위험도    | `RISK_SCORE`                             |
| 혼잡도    | `CONGESTION_SCORE`                       |
| 거주 수요 | `RESIDENT_POPULATION_SCORE`              |

색은 **기존 `resolveMetricPolarity` → `resolveScoreQuality` → `getScoreQualityColor`
를 그대로 쓴다.** 위험도·혼잡도의 `lower-is-better` 뒤집기가 이미 들어 있다.
직접 임계값을 다시 쓰지 않는다.

종합 점수는 `metricType` 이 없으므로 `COMPOSITE_SCORE_POLARITY` 를 쓴다.

**하단: 원지표 9행 — 색 없음**

`CommercialProfile.keyMetrics` 전부: 월 매출 · 유동인구 · 점포 수 · 동일 업종 점포 수 ·
개업률 · 폐업률 · 상주인구 · 월 평균 소득 · 집객시설 수.

> 현재 `/analysis/result` 의 「핵심 지표」 카드는 이 9개 중 4개만 쓴다. 비교 화면이
> 더 많이 보여 주는 것은 **추가 호출 없이** 얻어지는 것이다(같은 응답).

각 행의 최댓값 셀에 **「가장 높음」 사실 배지**만 붙인다. 좋다/나쁘다 색은 **쓰지
않는다** — `METRIC_POLARITY` 에 이 9개의 방향이 없고, 그 모듈 자신이 이렇게 못 박고 있다:

> 모르는 코드는 `null` 이다. 백엔드가 지표를 추가했을 때 **아무 방향이나 가정하지
> 않기 위해서다** — 잘못 가정하면 화면이 조용히 반대로 말한다.

실제로 방향이 모호하다: 점포 수가 많은 것은 상권이 활발하다는 뜻인가 경쟁이 심하다는
뜻인가. 동일 업종 점포 수는 수요가 검증됐다는 뜻인가 자리가 없다는 뜻인가. 개업률이
높으면 기회인가 과열인가. 제품이 답을 갖고 있지 않으므로 색으로 답하는 척하지 않는다.

값이 모두 같거나 하나뿐이면 배지를 붙이지 않는다(「가장 높음」이 무의미하다).
`null` 값은 `—` 로 두고 최댓값 계산에서 제외한다.

### 5.3 중립 문구 — 화면에서 빼지 않는다

`SIMULATION_COMPARE_NEUTRAL_NOTICE` 와 같은 역할이다.

> 점수는 추천 기준으로 매긴 것이고, 아래 지표는 값 그대로예요.
> 어느 상권이 더 나은지는 업종과 계획에 따라 달라져요.

**종합 1위를 따로 선언하지 않는다.** 순위는 열 머리에 이미 있고, `/recommend` 가
순서로 보여 준 것이다. 여기서 다시 강조하면 「사실이지 추천이 아니다」 원칙과 충돌한다.

### 5.4 열 하단 행동

각 열 아래 **「상권 분석 보기」** — `createAnalysisResultHref` 로 만든 `/analysis/result`
딥링크. PR #178 에서 추천 카드에 붙인 것과 같은 함수를 쓴다.

### 5.5 반응형

표는 `overflow-x: auto` 컨테이너 안에서 가로 스크롤하고 **첫 열(지표 이름)을
`position: sticky; left: 0`** 으로 고정한다. 지표 이름이 사라지면 숫자만 남아 표가
의미를 잃는다. 페이지 본문 자체는 가로로 스크롤하지 않는다.

---

## 6. 수집 동선

### 6.1 `/recommend` 결과에서 고르기

- 결과 카드에 체크박스를 단다. 기존 카드 선택(지도 연동 `onSelect`)과 **다른 행동**이므로
  시각적으로 구분한다 — 카드 본문 클릭은 지금처럼 지도 포커스, 체크박스는 비교 담기.
- 결과 목록 하단에 고정 바: **「비교하기 (2/4)」**
- 1개 이하면 비활성이고 **무엇이 필요한지 말한다** — 「비교할 상권을 2개 이상 골라
  주세요」. PR #178 에서 세운 규약(빈 비활성 CTA 금지)을 따르고 `aria-describedby` 로 묶는다.
- 4개를 채운 뒤 추가 선택은 막고 이유를 말한다 — 「한 번에 4개까지 비교할 수 있어요」
- 선택 상태는 **URL 에 넣지 않는다.** 화면 안의 일시 상태다(추천 결과를 공유한 링크가
  받는 사람의 체크 상태까지 옮길 이유가 없다).

### 6.2 곁들이는 정리 — 「비교」 탭 이름

`/analysis/result` 의 `benchmark` 탭 이름이 **「비교」**다. 내용은 자치구·행정동 평균
대비인데 이름은 상권 비교를 약속한다(J1-4). 새 화면이 생기면 같은 제품에 「비교」가
두 개가 되어 더 헷갈린다.

**「지역 평균 대비」** 로 바꾼다. `tab=benchmark` 쿼리 값은 **바꾸지 않는다** — 공유된
링크가 깨진다. 바꾸는 것은 사람이 읽는 라벨과 섹션 제목뿐이다.

---

## 7. 오류·빈 상태

| 상황                                      | 화면                                                                    |
| ----------------------------------------- | ----------------------------------------------------------------------- |
| 조건 누락(자치구·행정동·업종 중 하나라도) | 표 대신 안내 + 「추천으로 돌아가기」                                    |
| 상권 코드 2개 미만                        | 같은 안내. 「비교할 상권을 2개 이상 골라 주세요」                       |
| 코드 4개 초과                             | 앞 4개로 자르고 **잘랐다는 사실을 말한다**                              |
| 선택 코드가 Top 5 에 없음(낡은 링크)      | 그 열만 빼고 **뺐다는 사실을 말한다.** 남은 열이 2개 미만이면 위 안내로 |
| 추천 API 실패                             | **점수 블록만** 오류 + 재시도. 원지표는 그대로 보여 준다                |
| 프로필 일부 실패                          | **그 열의 원지표만** 「불러오지 못했어요」. 다른 열은 유지              |
| 프로필 전부 실패                          | 원지표 블록 오류 + 재시도. 점수는 그대로                                |

재시도 버튼 노출은 `isRetryable(kind)` 로만 판단한다(404 는 재시도해도 같다).
저장소의 기존 규약이다.

**부분 실패에서 화면을 통째로 버리지 않는 것이 요점이다.** 4열 중 1열의 프로필이
실패했다고 나머지 3열의 비교를 못 하게 할 이유가 없다.

---

## 8. 파일 구성

새 파일은 한 가지 일만 하게 나눈다.

```
app/(shell)/recommend/compare/page.tsx        라우트. searchParams → 화면
src/lib/recommend/compare-url.ts              URL 코덱 (파싱·생성·개수 제한)
src/lib/recommend/compare-presentation.ts     표 모델 (행 정의, 최댓값 판정, 포매팅)
src/components/recommend/compare/
  recommend-compare-page.tsx                  데이터 조립 (쿼리 3종 + 상태 분기)
  recommend-compare-table.tsx                 표 렌더 (네트워크 모름)
```

기존 파일 수정:

```
src/components/recommend/recommend-result-list.tsx        체크박스
src/components/recommend/recommend-panel.tsx              고정 바 + 선택 상태 전달
src/lib/analysis/presentation.ts:15                       탭 라벨 '비교' → '지역 평균 대비'
src/components/analysis/analysis-result-view.tsx:1946     섹션 제목 renderGroupHeading('비교')
```

라벨이 **두 곳**에 있다. 한쪽만 고치면 탭과 본문 제목이 서로 다른 말을 한다.

`recommend-page.tsx` 는 이미 1897줄이다. **여기에 비교 상태를 더 얹지 않는다** —
선택 상태는 결과 뷰를 소유한 `recommend-panel` 쪽에 두고, 페이지는 전달만 한다.

쿼리 키는 `recommend-page.tsx` 와 새 화면 두 곳에서 쓰이므로 **헬퍼로 뽑아 한 곳에서
만든다**(§4 의 표). 지금 흩어져 있는 것을 이번에 정리한다 — 이 작업이 직접 의존하는
부분에 한한다.

---

## 9. 테스트

저장소 방식: node 환경 + `renderToStaticMarkup` 문자열 단언.

**`compare-url.test.ts`**

- 왕복: 생성 → 파싱이 같은 값
- 2 미만 → 빈 결과로 판정
- 4 초과 → 앞 4개 + `truncated` 플래그
- 중복 제거하되 **URL 순서 유지**(정렬하지 않음을 단언)

**`compare-presentation.test.ts`**

- 최댓값 판정: 동점이면 배지 없음, `null` 제외, 값이 하나뿐이면 배지 없음
- 위험도가 높은 열이 `good` 으로 판정되지 않는다(극성 회귀 방지)

**`recommend-compare-table.test.ts`**

- 원지표 행에 품질 색 토큰이 **붙지 않는다** — **부재 단언이므로 구현을 되돌려
  빨간불을 확인하고 커밋한다**(저장소 규약)
- 중립 문구가 항상 그려진다
- 열마다 `/analysis/result` 링크가 올바른 코드를 싣는다
- 열 하나의 프로필이 실패해도 나머지 열이 남는다

**`recommend-compare-page.test.ts`** (또는 데이터 조립 함수 단위)

- 🔴 **추천 요청이 「선택된 코드」가 아니라 「행정동 전체 코드」로 나간다** —
  §4 의 함정. 회귀하면 두 화면이 어긋나므로 단언으로 못 박는다
- 선택 코드가 Top 5 에 없으면 그 열을 빼고 사실을 말한다

**`recommend-panel.test.ts`** (기존 파일 보강)

- 1개 선택에서 「비교하기」가 비활성이고 이유 문구 + `aria-describedby` 가 붙는다
- 4개 선택 뒤 5번째가 막히고 이유를 말한다

---

## 10. 범위 밖 (이번에 하지 않는다)

- `/analysis` 결과에서 비교 담기 — 수집 동선을 `/recommend` 하나로 좁혔다
- 비교 화면 안에서 상권 추가·교체 피커 — 바꾸려면 추천으로 돌아간다
- 다른 행정동·자치구의 상권을 섞어 비교 — 추천이 행정동 단위라 점수 재현이 성립하지 않는다
- 비교 결과 저장·공유 카드 — URL 공유로 충분한지 먼저 본다
- 지도 위 후보 하이라이트

## 11. 열린 질문

없다. 열리면 여기에 적고 사용자에게 묻는다.
