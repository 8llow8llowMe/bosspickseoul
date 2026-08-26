# simulation — 계산·저장 흐름 세부 명세서

> **작성일**: 2026-08-26
> **공통 명세**: [simulation 공통 명세](./simulation.md)
> **대상**: 웹 (Next.js App Router)
> **작성자**: Codex
> **상태**: 확정 (계약 계층 구현 완료 · UI 미구현)

이 문서는 [simulation 공통 명세](./simulation.md)의 **입력 마법사 → 리포트 계산 → 저장/이력** 흐름을 구현 수준으로 상세화한 세부 명세입니다.

- 공통 명세에 이미 기술된 전체 흐름·요구사항(S2)은 반복하지 않고 참조합니다.
- 엔드포인트·요청/응답 전체 스펙·오류 코드의 정본은 `backend/docs/simulation-frontend-guide.md`와 Swagger이며, 이 문서는 **호출 순서와 내부 모델 매핑**만 정의합니다.

[[_TOC_]]

---

## D0. 배경 / 기획 의도

| 항목              | 내용                                                                                                                                                                  |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 충족 요구사항     | 공통 명세 S3 #1(계약 정렬), #2(입력 마법사), #3(리포트), #4(비교), #5(저장/이력)                                                                                      |
| 해결하려는 문제   | FE가 V1 경로·필드명을 그대로 쓰고 있어 모든 시뮬레이션 호출이 404다. 또한 V1 리포트는 보증금을 "월 최소 목표 매출"로 잘못 표기했고, 기준 데이터 연도를 밝히지 않았다. |
| 목표 동작 (to-be) | V2 계약으로 조건을 만들어 단일 POST로 동기 계산하고, 결측 섹션은 숨기며, 기준 연도를 명시한 리포트를 렌더한다.                                                        |
| 구현 제외 범위    | 시뮬레이션 공유, 이력 삭제, 서버 비교 API (모두 백엔드 미지원). 이 문서는 UI 시각 디자인을 정의하지 않는다.                                                           |
| 연관 세부 기능    | 없음 (simulation Feature 내 단일 세부 명세)                                                                                                                           |

---

## D1. 기능 개요

창업 조건 5개(프랜차이즈 여부·자치구·업종·매장 면적·층 구분)를 단계적으로 수집해 단일 POST로 예상 창업 비용을 계산하고, 비용 구성·권리금·유사 프랜차이즈·상권 참고 지표를 렌더한다. 로그인 사용자는 결과를 저장해 이력으로 다시 볼 수 있다.

```
마법사 입력 → 요청 정규화 → POST /simulations/reports (동기) → 리포트 렌더 → (인증) 저장 → 이력 목록
```

### D1-1. UI 진입점 / 기능 연결

> **Figma 디자인**: 미확정 — `DESIGN.md` S-SIM-1~4 참조

| UI 요소                      | 사용자 동작   | 트리거 기능 | 결과 / UI 반영 상태                                     |
| ---------------------------- | ------------- | ----------- | ------------------------------------------------------- |
| 프랜차이즈 여부 토글         | 선택          | D4-1 ①      | "예" 선택 시 브랜드 검색 단계가 활성화된다              |
| 자치구 선택                  | 선택          | D4-1 ②      | `districtCode` 확정                                     |
| 업종 선택 (지원 30종)        | 선택          | D4-1 ③      | `serviceCode` 확정 → `store-sizes`·`franchisees` 활성화 |
| 브랜드 검색 입력 / 더 보기   | 입력 / 스크롤 | D4-2        | 커서 페이징으로 10건씩 누적                             |
| 매장 크기 프리셋 / 직접 입력 | 선택 / 입력   | D4-1 ④      | `storeSize`(㎡) 확정                                    |
| 층 구분 선택                 | 선택          | D4-1 ④      | `floorType` enum 확정                                   |
| "계산하기"                   | 클릭          | D4-3        | 리포트 렌더 (동기, 로딩 스피너 1회)                     |
| "저장"                       | 클릭          | D4-4        | 비로그인이면 로그인 유도, 로그인이면 저장 후 확인 표시  |

---

## D2. 동작 요구사항

| #   | 요구사항                                                                                          | 상세 참조 |
| --- | ------------------------------------------------------------------------------------------------- | --------- |
| 1   | 업종 선택이 브랜드 검색보다 먼저 완료돼야 한다 (`franchisees`가 `serviceCode` 필수).              | D4-1, D5  |
| 2   | 비프랜차이즈면 요청 본문에서 `franchiseeId` 키를 제거한다.                                        | D4-1      |
| 3   | 빈 `periodCode`는 키째 제거해 서버 기본값(20233)을 쓴다. `''` 전송은 400 `SIMULATION_106`이다.    | D4-1      |
| 4   | 브랜드 검색 첫 조회에는 `lastId`를 싣지 않는다. `lastId: 0`은 "0번 다음부터"라는 다른 의미다.     | D4-2      |
| 5   | 응답 `lastId`가 `null`이면 다음 페이지를 요청하지 않는다.                                         | D4-2      |
| 6   | `dataBaseYear`를 리포트에 노출한다.                                                               | D4-3      |
| 7   | `genderAgeAnalysis`/`seasonAnalysis`가 null이면 해당 섹션만 숨기고 오류 UI를 띄우지 않는다.       | D6        |
| 8   | 권리금은 총비용과 분리해 표기한다.                                                                | D4-3      |
| 9   | `levy`가 null(비프랜차이즈)이면 가맹 부담금 항목을 감춘다. `levy: 0`은 값이 있는 것으로 본다.     | D6        |
| 10  | 비교는 두 요청을 병렬 호출하고 한쪽 실패 시 함께 실패시킨다.                                      | D5        |
| 11  | 저장·이력은 인증이 필요하다. 비로그인은 계산까지만 허용하고 저장 시점에만 로그인을 유도한다.      | D4-4      |
| 12  | `size`는 1~50만 허용한다 (초과 시 400 `SIMULATION_109`).                                          | D4-4      |
| 13  | `topAgeGroups`는 **자치구×업종 전체 매출**이다. 범위를 라벨에 드러내고 수치는 억 단위로 축약한다. | D4-3-1    |
| 14  | `periodCode`를 입력 단계에 노출하지 않는다. 리포트에 기준 분기만 표기한다.                        | D4-3      |

---

## D3. 아키텍처 / 시스템 설계

### D3-1. 시스템 구성

| 모듈 / 컴포넌트                         | 책임                                                       | 비고                       |
| --------------------------------------- | ---------------------------------------------------------- | -------------------------- |
| `src/types/simulation.ts`               | V2 계약 타입 (요청·응답·봉투). nullable을 타입으로 강제    | 구현 완료                  |
| `src/lib/api/simulation.ts`             | V2 엔드포인트 호출 + 요청 정규화/쿼리스트링 빌더           | 구현 완료                  |
| `src/data/simulation-service-types.ts`  | 지원 업종 30종·층 구분 선택지 상수                         | 구현 완료                  |
| `src/lib/simulation/report-sections.ts` | 결측 섹션 표시 판정, 기준 연도 안내 문구                   | 구현 완료                  |
| `src/data/districts.ts`                 | 자치구 코드 25종 (`gooCode`) — 마법사 자치구 단계 데이터원 | 기존 자산 재사용           |
| `src/lib/api/api-error.ts`              | HTTP 상태 기반 오류 분류·재시도 판정                       | 공통 유틸 (읽기 전용)      |
| `src/components/simulation/**`          | 마법사·리포트·비교·이력 UI                                 | **미구현** (다음 슬라이스) |
| `src/types/simulation-v1-legacy.ts` 외  | V1 잔재 격리 지대                                          | 삭제 예정                  |

:::mermaid
flowchart LR
A[마법사 상태] --> B[buildSimulationReportRequest]
B --> C[apiClient POST /simulations/reports]
C --> D[SimulationReport]
D --> E[report-sections 판정]
E --> F[리포트 뷰]
D --> G[buildSimulationHistorySaveRequest]
G --> H[POST /simulations/histories]
:::

### D3-2. 데이터 흐름

:::mermaid
flowchart LR
A([브라우저]) --> B[/api/bff/simulations/**] --> C[API Gateway /api/v1] --> D[commercial-service] --> E[(simulation_* 테이블)]
:::

브라우저는 절대 백엔드를 직접 호출하지 않는다. 토큰은 서버 세션 쿠키에만 있고 BFF가 유일한 `Authorization` 주입자다.

### D3-3. 데이터 모델

| 모델                          | 핵심 필드                                                                                             | 비고                                       |
| ----------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `SimulationReportRequest`     | `franchisee`, `franchiseeId?`, `districtCode`, `serviceCode`, `storeSize`, `floorType`, `periodCode?` | 면적 ㎡, `floorType`은 enum 문자열         |
| `SimulationCondition`         | 요청 조건 + `districtName`/`serviceName`/`brandName`, `floorType`은 메타데이터 객체                   | 리포트 상단 조건 요약                      |
| `SimulationCostDetail`        | `rentPrice`, `deposit`, `interior`, `levy \| null`                                                    | 만원. `deposit`은 월 임대료 10개월분       |
| `SimulationKeyMoney`          | `keyMoneyRatio`(%), `keyMoneyAverage`(만원), `keyMoneyLevel`(만원/㎡)                                 | **총비용 미포함**                          |
| `SimulationGenderAgeAnalysis` | `malePercent`, `femalePercent`, `topAgeGroups[]`                                                      | **null 가능**                              |
| `SimulationSeasonAnalysis`    | `peakMonths[]`, `offPeakMonths[]`                                                                     | **null 가능**                              |
| `SimulationHistoryItem`       | `historyId`(number), …, `dataBaseYear`, `createdAt`                                                   | `historyId`는 AUTO_INCREMENT — 문자열 아님 |

### D3-4. 사용 라이브러리 / 기술

| 역할          | 요구 사항                       | 구체 구현                                        |
| ------------- | ------------------------------- | ------------------------------------------------ |
| 네트워크 통신 | BFF 경유, 세션 쿠키             | axios (`src/lib/api/client.ts`)                  |
| 서버 상태     | 동기 계산 1회, 커서 페이징 누적 | React Query (`useMutation` / `useInfiniteQuery`) |
| 오류 분류     | HTTP 상태 기반 재시도 판정      | `@/lib/api/api-error`                            |
| 스타일        | 디자인 토큰 준수                | styled-components                                |

---

## D4. 상세 동작 정의

> **API 문서**: [simulation-frontend-guide](../../../../backend/docs/simulation-frontend-guide.md) · Swagger `commercial-service/v3/api-docs`

### D4-1. 입력 마법사 → 요청 정규화

| 사용 엔드포인트                             | 용도                 | 응답 → 내부 모델 매핑                                       | 비고                  |
| ------------------------------------------- | -------------------- | ----------------------------------------------------------- | --------------------- |
| `GET /simulations/store-sizes?serviceCode=` | 소/중/대 프리셋 제시 | `small/medium/large` → `SimulationSizeItem`, `dataBaseYear` | 공개. 404=미지원 업종 |

단계 순서: ① 프랜차이즈 여부 → ② 자치구 → ③ 업종 → ④ 매장 크기·층. ③이 ②보다 뒤에 오는 것은 화면 편의일 뿐이고, **③이 브랜드 검색보다 앞서는 것은 계약상 강제**다.

`buildSimulationReportRequest`가 화면 상태를 요청 본문으로 정규화한다.

```
franchisee === false            → franchiseeId 키 제거
periodCode 가 빈 문자열/공백    → periodCode 키 제거 (서버 기본값 20233)
storeSize                        → ㎡ 정수, 1 이상 (프리셋은 힌트일 뿐 임의 양수 허용)
```

### D4-2. 브랜드 커서 검색

| 사용 엔드포인트                                              | 용도        | 응답 → 내부 모델 매핑                                                      | 비고                 |
| ------------------------------------------------------------ | ----------- | -------------------------------------------------------------------------- | -------------------- |
| `GET /simulations/franchisees?serviceCode=&keyword=&lastId=` | 브랜드 검색 | `franchisees[]` → `SimulationFranchiseeSearchItem[]`, `lastId` → 다음 커서 | 공개, 최대 10건/요청 |

`buildFranchiseeSearchParams`가 쿼리를 만든다. **빈 `keyword`와 없는 `lastId`는 키 자체를 싣지 않는다.** 응답 `lastId`가 `null`이면 마지막 페이지다. 선택한 항목의 `franchiseeId`가 리포트 요청으로 넘어간다.

### D4-3. 리포트 계산·렌더

| 사용 엔드포인트             | 용도      | 응답 → 내부 모델 매핑           | 비고                |
| --------------------------- | --------- | ------------------------------- | ------------------- |
| `POST /simulations/reports` | 동기 계산 | `dataBody` → `SimulationReport` | 공개. 폴링·SSE 없음 |

화면 매핑:

| 응답 필드              | 화면                                                                                            |
| ---------------------- | ----------------------------------------------------------------------------------------------- |
| `condition`            | 상단 조건 요약 (`districtName`/`serviceName`/`brandName`/`floorType.name`)                      |
| `dataBaseYear`         | **"{연도}년 기준 데이터로 계산된 결과입니다." 안내문 (필수 노출)**                              |
| `totalPrice`           | 헤드라인 숫자 (만원)                                                                            |
| `costDetail`           | 비용 구성 차트/표. `levy`는 프랜차이즈일 때만                                                   |
| `keyMoney`             | 권리금 카드 — **총비용과 분리해 "참고" 표기**                                                   |
| `similarFranchisees`   | 유사 예산 프랜차이즈 Top 5 비교 리스트                                                          |
| `genderAgeAnalysis`    | 도넛/막대. **null이면 섹션 자체를 숨김**. 라벨·표기는 D4-3-1 제약을 따른다                      |
| `seasonAnalysis`       | 성수기 배지. **null이면 섹션 자체를 숨김**                                                      |
| `condition.periodCode` | 성별·연령/성수기 섹션에 **기준 분기 표기**(예: "2023년 3분기 기준"). 입력으로는 노출하지 않는다 |

> V1의 **"월 최소 목표 매출"** 항목은 보증금을 잘못 표기한 것이었다. V2에 대응 필드가 없고 **되살리지 않는다.**

#### D4-3-1. `topAgeGroups[].salesAmount` — 집계 단위 제약 (확정)

**단위는 만원이 맞다.** `SimulationReportProcessor.java:196`이 `info.salesAmount() / TEN_THOUSAND`로 나눠 내려보낸다.

문제는 단위가 아니라 **"누구의 매출인가"**다. 원천이 `sales_district`(`DistrictSalesQueryPort` — "데이터 원천은 district 컨텍스트의 sales_district 테이블이다")이므로 이 값은 **자치구 × 업종 전체의 분기 매출**이지 사용자 점포의 예상 매출이 **아니다**. dev 실측 `2,733,782만원`(= 273억원)은 강동구 한식음식점 **업계 전체**의 50대 고객 분기 매출이므로 정상값이다.

UI 슬라이스에서 반드시 지킬 제약 두 가지:

| #   | 제약                                                                                                                                                                                                                                |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **집계 범위를 라벨에 드러낸다.** "50대 273억원"처럼 두면 사용자가 자기 점포 예상 매출로 읽는다. 창업 비용을 계산하러 온 사용자에게 치명적인 오독이므로 "{자치구명} {업종명} 전체 기준" 같은 범위 문구를 섹션 제목·축 라벨에 붙인다. |
| 2   | **억 단위로 축약한다.** `2,733,782만원`을 축에 그대로 얹으면 읽히지 않는다. 저장소의 기존 억/만원 표기 관행(`src/lib/format.ts`의 `formatLargeWon`, `src/lib/status/status-formatters.ts`의 "N억 M만원" — 구별현황 Top10)을 따른다. |

> 주의: `formatLargeWon`은 **만원 단위 입력**을 받아 "N억 M만원"으로 만든다(`amount / 10000` = 억). `salesAmount`는 이미 만원이므로 그대로 넘기면 되고, `status-formatters`는 **원 단위 입력**을 받으니 둘을 바꿔 쓰면 1만 배 틀린다.

### D4-4. 저장 / 이력

| 사용 엔드포인트                          | 용도      | 응답 → 내부 모델 매핑                                | 비고                     |
| ---------------------------------------- | --------- | ---------------------------------------------------- | ------------------------ |
| `POST /simulations/histories`            | 결과 저장 | `history` → `SimulationHistoryItem`                  | **인증 필수**            |
| `GET /simulations/histories?page=&size=` | 이력 목록 | `histories[]` + `page/size/totalElements/totalPages` | **인증 필수**, size ≤ 50 |

`buildSimulationHistorySaveRequest(request, totalPrice)`가 리포트 요청 + 총비용을 저장 본문으로 옮긴다. **`periodCode`는 저장 계약에 없어 버린다.** 서버가 명칭(자치구/업종/브랜드)과 `dataBaseYear`를 되채워 저장본을 반환하므로 FE는 명칭을 보내지 않는다.

삭제 API가 없으므로 **이력 삭제 UI를 만들지 않는다.**

---

## D5. 비즈니스 로직

### 마법사 진행 분기

:::mermaid
flowchart LR
A([시작]) --> B{프랜차이즈?}
B -- 예 --> C[자치구 선택] --> D[업종 선택] --> E[브랜드 검색·선택]
B -- 아니오 --> C2[자치구 선택] --> D2[업종 선택]
E --> F[매장 크기·층]
D2 --> F
F --> G[POST /simulations/reports]
:::

브랜드 검색이 업종 선택 뒤에 있는 것이 핵심이다. `serviceCode` 없이 `franchisees`를 부르면 400이다.

### 비교 화면

V2에 비교 API가 없다. `createSimulationReportPair([left, right])`가 `POST /simulations/reports`를 **2회 병렬 호출**한다.

```
Promise.all([reports(left), reports(right)])
  성공 → 두 리포트를 나란히 렌더
  한쪽 실패 → 비교가 성립하지 않으므로 전체 실패로 처리하고 오류 UI 1개만 표시
```

부분 성공을 허용하지 않는 이유: 한쪽만 보이는 "비교"는 사용자를 오도한다.

### 오류 → 화면 분기

`@/lib/api/api-error`의 `kind`로만 분기한다. **상태 코드를 직접 비교하지 않는다.**

| `kind`         | 재시도 버튼 | 화면                                            |
| -------------- | ----------- | ----------------------------------------------- |
| `network`      | O           | 기본 문구 + 재시도                              |
| `server`       | O           | "잠시 후 다시 시도" + 재시도                    |
| `not-found`    | **X**       | 서버 `resultMessage` 그대로 + 조건 재선택 유도  |
| `unauthorized` | X           | 로그인 유도 (저장·이력에서만 발생)              |
| `client`       | X           | `fieldErrors[]`를 폼 필드에 매핑, 없으면 메시지 |

---

## D6. 주의사항

| 항목                      | 내용                                                                                                                                                  |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| null은 오류가 아니다      | `genderAgeAnalysis`/`seasonAnalysis`가 null인 것은 200 성공 응답 안의 **결측**이다. `api-error`의 `kind`와 섞지 말고 `report-sections`의 판정을 쓴다. |
| `levy: 0` vs `levy: null` | 0은 "부담금이 0원", null은 "비프랜차이즈라 해당 없음"이다. falsy 검사(`!levy`)로 판정하면 0이 사라진다.                                               |
| `floorType` 방향이 다르다 | 요청은 enum 문자열, 응답은 `{code,name,description}` 객체다. 응답 객체를 그대로 재요청에 넣으면 안 된다.                                              |
| 봉투 없는 400             | 요청 본문의 enum 값이 잘못되면 `dataHeader` 없는 Spring 기본 400이 온다. `floorType`을 자유 입력으로 두지 말고 선택지로만 제출한다. (아래 D6-1)       |
| 집계 범위 오독            | `topAgeGroups[].salesAmount`는 **자치구×업종 전체** 매출이지 사용자 점포 예상 매출이 아니다. 범위 라벨 없이 노출하지 않는다. (D4-3-1)                 |
| `periodCode` 비노출       | 입력 단계에 선택지로 얹지 않는다. 리포트에는 `condition.periodCode`로 기준 분기만 표기한다. (D8 확정 #2)                                              |
| `lastId: 0`               | 0은 유효한 커서다. "첫 조회"를 0으로 표현하면 안 되고 키를 빼야 한다.                                                                                 |
| 금액 단위                 | 전부 **만원**이다. `formatLargeWon` 같은 원 단위 포매터를 그대로 쓰면 1만 배 틀린다.                                                                  |
| 기준 연도 상수 드리프트   | `SIMULATION_SEED_BASE_YEAR`와 응답 `dataBaseYear`가 어긋나면 지원 업종 상수가 낡았다는 신호다. 화면에는 항상 **응답의** `dataBaseYear`를 쓴다.        |
| 반응형                    | 유사 프랜차이즈 5열 비교표와 비교 화면 2열은 모바일에서 가로 스크롤 컨테이너 또는 세로 스택으로 전환한다.                                             |

### D6-1. 백엔드 갭 — 요청 본문 enum 불일치 시 봉투 없는 400

`floorType`에 정의되지 않은 값을 넣어 dev에 실호출한 결과(2026-08-26, 코디네이터 재현 확인):

```
POST /api/v1/simulations/reports   body: { ..., "floorType": "BASEMENT" }
→ HTTP 400
{"timestamp":"2026-08-26T03:22:54.417+00:00","status":400,"error":"Bad Request","path":"/api/v1/simulations/reports"}
```

`dataHeader` 봉투가 **없다.** `CommercialExceptionHandler`의 `COMMERCIAL_102`는 `MethodArgumentTypeMismatchException`(쿼리·경로 파라미터 바인딩)만 잡는데, 요청 **본문** JSON의 enum 역직렬화 실패는 `HttpMessageNotReadableException`이라 핸들러에 걸리지 않고 Spring 기본 응답이 그대로 나간다.

- **영향**: 화면이 이 응답에서 서버 메시지를 얻을 수 없다. `normalizeApiError`가 봉투 없는 본문을 흡수해 `kind: 'client'` + 기본 문구로 처리하므로 크래시는 없지만, 사용자에게 원인을 알려줄 수 없다.
- **FE 완화책**: `floorType`을 자유 입력으로 두지 않고 `SIMULATION_FLOOR_TYPES` 피커에서만 제출해 이 경로에 애초에 들어가지 않게 한다. `buildSimulationReportRequest`의 타입이 `'FIRST_FLOOR' | 'OTHER'`로 좁혀져 있어 컴파일 단계에서도 한 번 막힌다.
- **BE 후속 요청**: 아래 "후속 요청 (백엔드)" 참조. **이 슬라이스에서 백엔드 코드는 건드리지 않았다.**

---

## D7. 테스트케이스

계약 계층 TC는 공통 명세 [S5](./simulation.md#s5-테스트케이스) TC-001~004에 통합했다 (`src/lib/api/simulation.test.ts`, `src/data/simulation-service-types.test.ts`, `src/lib/simulation/report-sections.test.ts`).

UI 슬라이스에서 추가할 TC:

| TC ID      | 검증 대상                                                                      | 우선순위 |
| ---------- | ------------------------------------------------------------------------------ | -------- |
| TC-SIM-101 | 마법사 단계 진행·되돌리기와 요청 본문 확정                                     | P1       |
| TC-SIM-102 | 결측 섹션이 숨겨지고 오류 UI가 뜨지 않는다                                     | P1       |
| TC-SIM-103 | 404 계열에 재시도 버튼이 없다                                                  | P1       |
| TC-SIM-104 | 비로그인 저장 시 로그인 유도, 계산은 계속 가능                                 | P1       |
| TC-SIM-105 | 비교 한쪽 실패 시 전체 실패로 처리                                             | P2       |
| TC-SIM-106 | 성별·연령 섹션에 "자치구 전체 기준" 범위 라벨이 붙고 수치가 억 단위로 축약된다 | P1       |
| TC-SIM-107 | 마법사 어디에도 `periodCode` 입력이 없고, 리포트에는 기준 분기가 표기된다      | P2       |

---

## D8. 확정 사항 / 미결 사항

### D8-1. 확정 (재론하지 않는다)

| #   | 항목                              | 결정                                                                                                                                         | 근거                                                                                                                                                                         |
| --- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `topAgeGroups[].salesAmount` 단위 | **만원이 맞다.** 단위 문제가 아니라 **집계 단위** 문제다 — 자치구×업종 전체 매출이다. UI는 ① 범위 라벨 명시 ② 억 단위 축약 두 제약을 지킨다. | `SimulationReportProcessor.java:196`의 `/ TEN_THOUSAND`, 원천 `sales_district` (D4-3-1)                                                                                      |
| 2   | `periodCode` 사용자 노출          | **노출하지 않는다.** 서버 기본값(20233)을 그대로 쓴다. 다만 리포트에는 `condition.periodCode`로 **기준 분기를 표시**한다.                    | 시뮬레이션의 주제는 창업 비용이고 `periodCode`는 보조 분석의 기준 분기일 뿐이다. 이미 4단계인 마법사에 사용자가 판단 근거를 갖기 어려운 5번째 선택지를 얹으면 이탈만 늘린다. |
| 3   | 죽은 레거시 컴포넌트 3종 처리     | **이번 슬라이스에서는 삭제하지 않는다.** 다음 UI 슬라이스의 삭제 대상으로만 남긴다.                                                          | 라우트에서 도달 불가한 것은 맞으나, share Feature가 `/share/[token]`(V1 시뮬 공유) 처리를 정하는 중이라 지금 지우면 충돌한다.                                                |

**다음 슬라이스 삭제 대상** (도달 불가 확인 완료 — 어떤 라우트도 import 하지 않는다):

- `src/components/simulation/simulation-form-page.tsx`
- `src/components/simulation/simulation-report-page.tsx`
- `src/components/simulation/simulation-compare-page.tsx`

share Feature가 `/share/[token]`의 V1 시뮬레이션 처리를 정리하면 아래도 함께 삭제한다:

- `src/components/simulation/simulation-report-view.tsx`, `src/components/simulation/shared-simulation-report-page.tsx`
- `src/types/simulation-v1-legacy.ts`, `src/lib/api/simulation-v1-legacy.ts`
- `src/types/simulation.ts` 하단의 share 타입 re-export 블록

### D8-2. 미결

| #   | 항목                                                             | 담당   | 기한 |
| --- | ---------------------------------------------------------------- | ------ | ---- |
| 1   | 마법사 화면 Figma 확정 (단계 UI·프리셋 버튼·직접 입력 허용 범위) | 디자인 | 미정 |
| 2   | 이력 삭제 API 제공 여부 (현재 없음 — 있으면 이력 화면 재설계)    | 백엔드 | 미정 |

### D8-3. 후속 요청 (백엔드)

FE에서 우회 가능하므로 차단 이슈는 아니다. **이 슬라이스에서 백엔드 코드는 수정하지 않았다.**

| #   | 요청                                                                                                                                                                                                 | 근거 |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| 1   | `HttpMessageNotReadableException` 핸들러 추가 — 요청 본문 enum/타입 불일치도 `dataHeader` 봉투(`COMMERCIAL_102` 등)로 내려주면 화면이 원인을 안내할 수 있다. 현재는 Spring 기본 400이 그대로 나간다. | D6-1 |

---

## 변경 이력

| 버전 | 날짜       | 변경 내용                                                                                                                                                   | 작성자 |
| ---- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 1.0  | 2026-08-26 | V2 계약 기준 계산·저장 흐름 세부 명세 최초 작성                                                                                                             | Codex  |
| 1.1  | 2026-08-26 | 미결 3건 확정 — `salesAmount` 집계 단위 제약(D4-3-1), `periodCode` 비노출, 죽은 컴포넌트 삭제 시점. 봉투 없는 400 실측 응답과 BE 후속 요청 분리(D6-1, D8-3) | Codex  |

> 세부 변경 이력은 Azure DevOps Wiki 페이지의 **Revisions** 탭에서 확인합니다.
