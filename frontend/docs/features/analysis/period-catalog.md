[//]: # '저장 경로: docs/features/analysis/period-catalog.md'

# analysis — 분석 기준 분기를 서버 카탈로그(`/periods`)로 정하기 세부 명세서

> **작성일**: 2026-10-02
> **공통 명세**: [analysis 공통 명세](./analysis.md) — 기간 선택 · [status](../status/status.md) 1.6 · [recommend](../recommend/recommend.md)
> **이슈**: #493 (BE 선행 #464 · PR #489)
> **작성자**: Claude Code
> **상태**: 승인 — 단계별 구현 중

---

## D0. 배경 / 기획 의도

| 항목              | 내용                                                                                                                                                                                                                        |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 해결하려는 문제   | 분석 기준 분기가 FE 상수(`ANALYSIS_PERIOD_CODE = '20261'`, `RECOMMENDATION_PERIOD_CODE`)다. 새 분기가 적재돼도(#445 자동 최신화) 화면은 상수를 손으로 올릴 때까지 옛 분기를 본다. 드롭다운 상한도 같은 상수다               |
| 목표 동작 (to-be) | 「최신 분기」는 BE `GET /commercials/periods` 의 `defaultPeriodCode` 가 정한다. 상수를 올리는 배포가 없어진다. 사용자가 고른 분기·저장된 분기는 그대로다                                                                    |
| 사용자 결정       | 2026-10-02 — 드롭다운 범위는 **2021년 1분기 ~ 서버 기본 분기**(지금과 같은 범위, 상한만 서버). `availablePeriodCodes`(핵심 14종 교집합, dev 기준 20234~20261)로 좁히지 않는다 — 옛 공유 링크(20233 등)가 계속 열려야 한다   |
| 채택하지 않은 안  | ① `availablePeriodCodes` 만 열기 — 2021~2023년 3분기를 잃고 옛 링크가 최신 분기로 바뀐다 ② 카탈로그 실패 시 예시 상수로 폴백 — BE 와 같은 이유로 두지 않는다(적재 안 된 분기를 기본으로 내보내 화면 전체가 「데이터 없음」) |
| 구현 제외 범위    | BE 계약 변경 · `datasets[]` 를 화면에 표시 · 데이터셋별로 드롭다운을 다르게 여는 것 · 공유 링크 재작성                                                                                                                      |

## D1. 기능 개요

```
GET /api/bff/commercials/periods  ──►  useAnalysisPeriodCatalog()  (staleTime 5분)
                                          │
                                          ▼
                        toAnalysisPeriodRange(defaultPeriodCode)
                          { latest, years, quartersOf, isSupported, clamp }
                                          │
       ┌──────────────────────────────────┼─────────────────────────────────┐
       ▼                                  ▼                                 ▼
 URL 에 분기가 있다                 URL 에 분기가 없다                 홈(첫 페인트)
 → 그 분기를 바로 쓴다              → latest 로 해석한 뒤 요청          → 분기를 **생략**해 요청,
   (카탈로그를 기다리지 않는다)       (카탈로그 도착 전엔 대기)          응답의 currentPeriodCode 로 표시
```

### D1-1. 분기의 세 가지 출처

| 출처                 | 예                                          | 규칙                                                                       |
| -------------------- | ------------------------------------------- | -------------------------------------------------------------------------- |
| 사용자가 고른 분기   | 결과·현황 드롭다운, URL `?periodCode=`      | 형식이 맞고 범위 안이면 그대로. 카탈로그 없이도 요청한다                   |
| 저장된 분기          | 공유 링크·북마크·커뮤니티 첨부 payload      | 저장 당시의 **해석된** 분기다. 열 때 위 규칙으로 읽는다                    |
| 최신(지정 없음)      | 탐색 화면·현황 첫 진입·추천·비교·시뮬레이션 | 카탈로그 `defaultPeriodCode`. 저장·공유할 때는 해석된 값을 싣는다(BE 규약) |
| 최신(첫 페인트 예외) | 홈 Top10·툴팁 상세                          | 분기를 생략하고 서버가 해석. 응답 `currentPeriodCode` 를 표시에 쓴다(D3-3) |

## D2. 동작 요구사항

| #   | 요구사항                                                                                                                                                         | 상세 |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| 1   | `/periods` 를 BFF 경로(`/api/bff/commercials/periods`, 기존 catch-all)와 조회 훅 하나로 붙인다. 캐시는 BE 갱신 주기에 맞춰 `staleTime` 5분                       | D3-1 |
| 2   | 드롭다운 연도 = 2021 ~ `latest` 의 연도, 분기 = 최신 연도는 `latest` 분기까지. 지금의 `analysisPeriodQuartersOf` 규칙을 그대로 두고 상한만 카탈로그에서 받는다   | D4-1 |
| 3   | URL 분기가 형식(`YYYYQ`)에 맞고 2021년 이상이면 **카탈로그를 기다리지 않고** 요청한다. 카탈로그가 와서 `latest` 보다 새 분기로 판명되면 `latest` 로 바꾼다       | D5-1 |
| 4   | URL 에 분기가 없으면 「최신」이다. 카탈로그가 오기 전에는 분기 종속 쿼리를 열지 않는다(스켈레톤 유지). URL 에 해석값을 써 넣지 않는다 — 「최신」 링크로 남는다   | D5-1 |
| 5   | 공유·북마크·커뮤니티 초안·AI 리포트 제출에는 **해석된 분기**를 싣는다. 해석 전에는 저장 버튼을 막는다                                                            | D5-2 |
| 6   | 홈 첫 페인트는 BFF 호출 수를 늘리지 않는다(감사 기준선 2). Top10·툴팁 상세는 분기를 생략해 보내고, 데이터 출처 라벨은 Top10 응답의 `currentPeriodCode` 로 적는다 | D3-3 |
| 7   | 카탈로그 503(`ANALYSIS_PERIOD_001`, 기동 직후)은 3회까지 지수 백오프로 재시도한다. 끝내 실패하면 「최신」이 필요한 화면은 기존 오류 상태(재시도 버튼)로 둔다     | D5-3 |
| 8   | 카탈로그가 실패해도 **URL 에 분기가 있는 화면은 그대로 동작**한다. 드롭다운은 현재 분기 하나만 보이고 비활성                                                     | D5-3 |
| 9   | 시뮬레이션은 분기를 생략하지 않는다 — 해석된 분기를 명시해 보내고, 리포트 쿼리 키에 분기를 넣는다. 화면 표시는 응답 `condition.periodCode` 를 쓴다(지금과 같다)  | D4-4 |
| 10  | AI 리포트 제출은 **선택한 분기**를 보낸다(지금은 늘 상수를 보낸다 — 버그). 쿼리 키에도 분기를 넣는다                                                             | D4-3 |
| 11  | 상수 `ANALYSIS_PERIOD_CODE`·`RECOMMENDATION_PERIOD_CODE` 를 지운다. 남는 상수는 하한 `ANALYSIS_PERIOD_FIRST_YEAR`(2021)와 형식 정규식뿐이다                      | D3-2 |

## D3. 아키텍처 / 시스템 설계

### D3-1. 구성

| 단위                                        | 종류      | 역할                                                                                                                     |
| ------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------ |
| `src/lib/api/analysis-period.ts`            | fetcher   | `fetchAnalysisPeriods()` → `GET /commercials/periods`                                                                    |
| `src/types/analysis-period.ts`              | 타입      | 응답 `dataBody`(`defaultPeriodCode`·`availablePeriodCodes`·`firstPeriodCode`·`spatialVersion`·`resolvedAt`·`datasets[]`) |
| `src/lib/analysis/period-catalog.ts`        | 순수 함수 | `toAnalysisPeriodRange(latest)` — 연도·분기 목록, `isSupported`, `clamp`. `resolveAnalysisPeriod(url, range)`            |
| `src/hooks/use-analysis-period-catalog.ts`  | 훅        | React Query `['analysis', 'periods']`, `staleTime` 5분, 503 재시도. `range`·`latest`·`status` 를 낸다                    |
| `src/hooks/use-resolved-analysis-period.ts` | 훅        | URL 분기 + 카탈로그 → 요청에 쓸 분기(`string \| null`) · 드롭다운 범위                                                   |

### D3-2. 바뀌는 것

| 지금                                                            | 바뀐 뒤                                                                                      |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `AnalysisSelection.periodCode: string`(빈 URL → 상수)           | `string \| null` — `null` 은 「URL 에 없음 = 최신」                                          |
| `ANALYSIS_PERIOD_YEARS`·`analysisPeriodQuartersOf` 모듈 상수    | `toAnalysisPeriodRange(latest)` 가 만든 값. `AnalysisPeriodSelect` 가 `range` prop 을 받는다 |
| `isSupportedAnalysisPeriod(value)`                              | 읽을 때는 형식 + 하한만(`isWellFormedAnalysisPeriod`), 상한은 범위가 판정                    |
| `createAnalysisExplorerHref` — 기본 분기면 생략                 | `periodCode === null` 이면 생략(최신 링크). 값이 있으면 싣는다                               |
| `status-state` `parseStatusPeriod` — 빈 값 → 상수               | 빈 값 → `null`(최신). `createStatusQuery` 도 `null` 이면 생략                                |
| `status.ts`·`ai-report.ts`·`commercial-comparison.ts` 기본 인자 | 기본 인자 제거. 홈 경로는 분기 생략 오버로드(`currentPeriodCode?: string`)                   |
| `HOME_TOP_TEN_QUERY_KEY`(분기 포함 상수 배열)                   | `['home', 'districtTopTen', 'latest']` — 분기 생략 요청과 짝                                 |

### D3-3. 홈 첫 페인트 예외

홈은 감사 지표에 「첫 페인트 BFF 호출 수」(기준선 2)가 있다. `/periods` 를 먼저 부르면 3이 되고, Top10 이 그 응답을 기다리는 폭포가
생긴다. 그래서 홈 Top10·툴팁 상세는 분기를 **생략**해 보내고(BE 가 같은 카탈로그로 해석), 데이터 출처 라벨(`data-sources.tsx`)은
Top10 응답의 `currentPeriodCode` 로 적는다. 응답이 오기 전에는 「기준」 줄을 비워 두되 자리는 잡는다.

홈에서 나가는 링크(탐색 화면)는 분기를 싣지 않는다 — 「최신」이다.

**현황(`/status`)도 같은 방식이다**(2단계 구현 중 결정). Top10·상세·자치구 목록 세 API 모두 분기 생략을 받고 응답에
`currentPeriodCode` 를 싣는 것을 dev 에서 확인했다. URL 에 분기가 없으면 Top10 을 분기 없이 부르고(키 `'latest'`), 상세와
드롭다운은 Top10 응답의 분기를 쓴다. 카탈로그는 드롭다운 범위와 「최신보다 새 분기」를 내리는 데만 쓴다 — 카탈로그를 기다리는
폭포가 없고, 카탈로그가 실패해도 현황은 열린다.

## D4. 상세 동작 정의

### D4-1. 드롭다운(`AnalysisPeriodSelect`)

- props 에 `range: AnalysisPeriodRange | null` 을 더한다. `null`(카탈로그 대기·실패)이면 현재 값 하나만 옵션으로 두고 비활성.
- 연도를 바꾸면 고르던 분기가 그 연도에 없을 때 마지막 분기로 내린다(지금 규칙).
- 결과 화면·현황 두 곳이 쓴다.

### D4-2. 결과 화면 · 탐색 지도 셸

- `periodCode = useResolvedAnalysisPeriod(selection.periodCode)`. `null` 이면 분기 종속 쿼리를 열지 않는다.
- 탐색 셸의 자치구 목록(`fetchDistricts`)은 표시용 「최신」이라 분기를 생략해 보낸다(키 `'latest'`).
- 선택 패널 안내 「{분기} 기준으로 분석해요」는 **해석된 분기**로 적는다 — 결과에서 고른 분기로 돌아오면 그 분기다. 카탈로그 대기 중에는 「최신 분기 기준으로 분석해요」로 적는다(문장을 비우면 버튼 아래 줄이 튄다).
- 결과 → 탐색으로 돌아갈 때 사용자가 고른 분기는 URL 로 이어진다(지금과 같다).

### D4-3. AI 리포트

- `submit*AiReport` 의 기본 인자를 지우고 선택(해석)된 분기를 넘긴다. 쿼리 키에 분기를 넣는다.
- 분기를 해석하는 동안 카드·차트·인사이트는 「불러오는 중」이다(꺼진 쿼리는 `isLoading` 이 false 라 그대로 두면 「값 없음」으로 그려진다). 카탈로그를 끝내 못 받으면 인사이트 자리에 재시도 가능한 오류를 둔다.

### D4-4. 시뮬레이션

- 입력 화면이 카탈로그 `latest` 를 요청 `periodCode` 로 명시한다. `simulationReportQueryKey` 에 분기를 넣는다.
- 비교 화면 두 조건도 같은 해석 분기를 쓴다. 표시는 응답 `condition.periodCode`(지금과 같다).
- 낡은 「서버 기본값(20233)」 주석을 고친다(`types/simulation.ts`, `simulation-condition-compact-editor.tsx`, `lib/simulation/conditions.ts`, `lib/api/simulation.ts`, `simulation.test.ts`).

### D4-5. 추천 · 비교 · 커뮤니티 초안

- 추천 결과·프로필·미리보기, 비교, 커뮤니티 비교 초안 POST 는 카탈로그 `latest` 를 명시한다. 미리보기 쿼리 키에 분기를 넣는다.
- 추천 패널의 분석 딥링크는 분기를 싣지 않는다(최신). 응답 `periodCode` 를 읽는 기존 표시 경로는 그대로다.

## D5. 비즈니스 로직

### D5-1. 해석 규칙

```
read(url):  YYYYQ 이고 연도 ≥ 2021 이면 그 값, 아니면 null
resolve(url, range):
  url !== null && range === null            → url        (카탈로그 대기 — 먼저 요청)
  url !== null && range.isSupported(url)    → url
  url !== null && url > range.latest        → range.latest (아직 없는 분기 — 낡은 클라이언트·손편집)
  url === null && range !== null            → range.latest
  url === null && range === null            → null       (대기)
```

### D5-2. 저장

- 공유·북마크 payload(`buildCommercialAnalysisPayload`)는 해석된 분기를 요구한다(지금도 빈 값이면 null). 해석 전에는 버튼을 비활성.
- 커뮤니티 비교 초안은 비교 화면이 쓴 해석 분기를 그대로 넘긴다.

### D5-3. 실패

| 상황                               | 동작                                                                  |
| ---------------------------------- | --------------------------------------------------------------------- |
| 카탈로그 503(기동 직후)            | 1s·2s·4s 재시도. 그동안 스켈레톤                                      |
| 카탈로그 최종 실패 + URL 분기 있음 | 정상 동작. 드롭다운만 현재 값 하나로 비활성                           |
| 카탈로그 최종 실패 + 최신 필요     | 화면의 기존 오류 상태(재시도)로. 재시도는 카탈로그 쿼리를 다시 부른다 |
| `defaultPeriodCode: null`          | 최종 실패와 같다(BE 도 분기 생략 요청을 503 으로 돌린다)              |

## D6. 주의사항

- **SSR 첫 렌더와 클라이언트 첫 렌더가 같아야 한다**(`analysis-result-view-ssr.test.ts`). 카탈로그는 서버에서 prefetch 하지 않으므로
  양쪽 다 「대기」로 시작한다.
- 결과 화면에서 URL 이 없는 상태로 연 뒤 분기를 고르면 그때부터 URL 에 분기가 실린다(사용자 선택).
- `datasets[].publishedAt`·`schemaVersion` 은 아직 null 이다(BE 후속). 타입에는 두되 쓰지 않는다.

## D7. 테스트케이스

| #   | 종류         | 검사                                                                                  |
| --- | ------------ | ------------------------------------------------------------------------------------- |
| 1   | vitest(순수) | `toAnalysisPeriodRange` — 연도·분기 목록, 최신 연도 분기 상한, `isSupported`, `clamp` |
| 2   | vitest(순수) | `resolveAnalysisPeriod` — D5-1 다섯 갈래                                              |
| 3   | vitest       | fetcher 경로·응답 정규화(분기 형식이 아닌 값·null 방어), 훅 재시도 판정               |
| 4   | vitest(SSR)  | 결과 화면: URL 분기 있음 → 카탈로그 없이 쿼리 키에 그 분기 / 없음 → 대기              |
| 5   | vitest       | `createAnalysisExplorerHref`·`createStatusQuery` — `null` 이면 분기 생략              |
| 6   | vitest       | AI 리포트 제출이 선택 분기를 보낸다, 시뮬레이션 요청·키에 분기가 있다                 |
| 7   | e2e          | 홈 첫 페인트 BFF 호출 수 불변(감사 래칫)                                              |

## D8. 구현 단계

| 단계 | PR 범위                                                                                                                                                                 |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | 이 명세 · fetcher · 타입 · `period-catalog.ts` · 훅 2개 · 테스트. **화면 동작 변화 없음**                                                                               |
| 2    | 분석(선택 모델·지도 셸·결과·기간 선택·AI 리포트) · 현황                                                                                                                 |
| 3    | 홈 · 추천 · 비교 · 커뮤니티 · 시뮬레이션 · 상수 삭제 · 문서 정리(`analysis.md`·`explorer.md`·`result.md`·`status.md`·`recommend.md`·`simulation*.md`·`data-sources.md`) |

## 변경 이력

| 버전 | 날짜       | 내용                                                                                              |
| ---- | ---------- | ------------------------------------------------------------------------------------------------- |
| 1.0  | 2026-10-02 | 작성. 드롭다운 범위는 2021 ~ 서버 기본 분기(사용자 결정)                                          |
| 1.1  | 2026-10-02 | 2단계 구현: 현황도 분기 생략 방식(D3-3), 탐색 자치구 목록 분기 생략, 선택 패널 안내는 해석된 분기 |
