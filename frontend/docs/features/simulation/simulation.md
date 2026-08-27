# simulation — 공통 개발 명세서

> **작성일**: 2026-07-28
> **최종 갱신**: 2026-08-26
> **대상**: 웹 (Next.js App Router)
> **작성자**: Codex
> **상태**: 확정 (V2 계약 정렬 완료 · UI 구현 진행 중)

[[_TOC_]]

---

## S0. 배경 / 기획 의도

| 항목               | 내용                                                                                                                                                                                                                                                                                                                                                     |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 요청자 / 요청팀    | BossPickSeoul 프런트엔드 마이그레이션                                                                                                                                                                                                                                                                                                                    |
| 요청일             | 2026-07-28 (V2 계약 확보: 2026-08-26)                                                                                                                                                                                                                                                                                                                    |
| 원본 기획 문서     | `backend/docs/simulation-frontend-guide.md` (정본), `backend/docs/simulation-data-sources.md`, Swagger `commercial-service/v3/api-docs`의 `Simulation*` 스키마, `DESIGN.md` S-SIM-1~4                                                                                                                                                                    |
| 요청 배경          | 1.0 시점에는 V2 백엔드에 시뮬레이션 도메인이 없어 6개 라우트를 "준비 중" 안내로 막아 두었다. 2026-08 백엔드에 `/api/v1/simulations/**`가 신설되면서 계약이 확정됐고, FE는 아직 V1 경로(`/simulation/store`, `POST /simulation`, `/simulation/save`)와 V1 필드명을 쓰고 있어 **호출하면 전부 404**다. 계약을 V2로 정렬한 뒤 화면을 순차 복원한다.         |
| 기존 동작 (as-is)  | `/simulation`, `/simulation/report`, `/simulation/compare`와 `/analysis/simulation/*` 6개 라우트가 `SimulationUnavailablePage`(준비 중 안내)만 렌더한다. 레거시 V1 컴포넌트 3종(form/report/compare)은 어떤 라우트에서도 마운트되지 않는 죽은 코드이며, `simulation-report-view`와 `shared-simulation-report-page`만 `/share/[token]`(V1)에서 살아 있다. |
| 목표 동작 (to-be)  | 입력 마법사(프랜차이즈 → 자치구 → 업종 → 매장 크기·층)로 조건을 받아 `POST /simulations/reports`로 **동기 계산**한 리포트를 렌더하고, 로그인 사용자는 결과를 저장·조회한다. 비로그인도 계산까지는 가능하다.                                                                                                                                              |
| 구현 제외 범위     | **시뮬레이션 공유** (V2 `ShareTargetType` 5종에 시뮬레이션이 없다 — 백엔드 미지원), **이력 삭제** (삭제 API 없음), 서버 측 비교 API(존재하지 않음), `/share/[token]` V1 처리(share Feature 소관), FE 임의 계산식·목업 결과                                                                                                                               |
| 연관 기능 / 의존성 | auth middleware와 BFF 세션, `/analysis`, `src/data/districts.ts`(자치구 코드 25종), `src/lib/api/api-error.ts`(오류 분류 공통 유틸)                                                                                                                                                                                                                      |

---

## S1. 기능 개요

simulation은 창업 조건(프랜차이즈 여부·자치구·업종·매장 크기·층)을 받아 **예상 창업 비용과 상권 참고 지표**를 계산해 보여준다. AI 리포트와 달리 **폴링·SSE가 없는 단일 POST 동기 계산**이다.

```
입력 마법사 → POST /simulations/reports (동기) → 리포트 렌더 → (로그인) 저장 → 이력 목록
```

**단위 규약**: 금액 응답은 전부 **만원**, 면적 입력은 **㎡**다. 원 단위로 오인하지 않는다.

---

## S2. 공통 요구사항

| #   | 요구사항                                                                                                                                                              | 상세 참조                                  |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| 1   | 모든 시뮬레이션 호출은 V2 경로 `/simulations/**`를 쓴다. V1 경로(`/simulation`, `/simulation/store`, `/simulation/franchisee`, `/simulation/save`)를 호출하지 않는다. | S3 #1                                      |
| 2   | 브라우저는 BFF(`/api/bff`)만 호출한다. FE 코드상 경로에는 `/api/v1` 접두사를 붙이지 않는다.                                                                           | `docs/engineering/data-fetching.md`        |
| 3   | 계산·조회(`store-sizes`, `franchisees`, `reports`)는 비로그인도 수행할 수 있고, **저장·이력(`histories`)에서만 로그인을 유도**한다. 기능 전체를 잠그지 않는다.        | S3 #2                                      |
| 4   | 업종 선택은 **시뮬레이션 지원 업종 30종**으로 제한해 `SIMULATION_001`(404 미지원 업종)을 선택 단계에서 예방한다.                                                      | [세부: 업종 상수](#s3-1) · S3 #1           |
| 5   | 업종 선택이 브랜드 검색보다 **먼저** 와야 한다 — 프랜차이즈 검색이 `serviceCode`를 필수로 받는다.                                                                     | [세부 명세](./simulation-report.md) D5     |
| 6   | 리포트는 `dataBaseYear`를 **반드시 화면에 노출**한다("2024년 기준 데이터로 계산된 결과입니다"). 밝히지 않으면 최신 시세로 오인된다.                                   | [세부 명세](./simulation-report.md) D4-3   |
| 7   | `genderAgeAnalysis` / `seasonAnalysis`가 `null`인 것은 **오류가 아니라 섹션 숨김**이다. 오류 화면이나 재시도 버튼을 띄우지 않는다.                                    | [세부 명세](./simulation-report.md) D6     |
| 8   | 권리금(`keyMoney`)은 **총비용에 포함되지 않는다**. 별도 참고 정보로 표기한다.                                                                                         | [세부 명세](./simulation-report.md) D4-3   |
| 9   | 오류는 `@/lib/api/api-error`의 `resolveApiError`/`isRetryable`로만 분류한다. **404에는 재시도 버튼을 띄우지 않고** 서버 `resultMessage`를 그대로 보여준다.            | [S5 오류 표](#s4-1-오류-처리)              |
| 10  | 프랜차이즈 검색은 커서 페이징이다. 첫 조회에 `lastId`를 싣지 않고, 응답 `lastId`가 `null`이면 더 부르지 않는다.                                                       | [세부 명세](./simulation-report.md) D4-2   |
| 11  | 비교 화면은 서버 비교 API가 없으므로 `POST /simulations/reports`를 **2회 호출해 클라이언트에서 나란히** 둔다.                                                         | S3 #4                                      |
| 12  | 시뮬레이션 **공유**와 **이력 삭제** 기능을 만들지 않는다 (백엔드 미지원).                                                                                             | S0 구현 제외 범위                          |
| 13  | 성별·연령 매출은 **자치구×업종 전체** 집계다. 사용자 점포 예상 매출로 읽히지 않도록 범위를 라벨에 드러내고 수치는 억 단위로 축약한다.                                 | [세부 명세](./simulation-report.md) D4-3-1 |
| 14  | `periodCode`를 입력 단계에 노출하지 않는다. 서버 기본값(20233)을 쓰고 리포트에 기준 분기만 표기한다.                                                                  | [세부 명세](./simulation-report.md) D8-1   |

---

## S3. 필수 기능

| #   | 기능명                | 한 줄 설명                                                                                                     | 세부 명세                                  | 상태      |
| --- | --------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | --------- |
| 1   | V2 계약 정렬          | 타입·API 클라이언트·지원 업종 상수를 V2 계약으로 교체하고 V1 잔재를 격리한다.                                  | [계약 정렬](#s4-1-계약-정렬)               | 구현 완료 |
| 2   | 입력 마법사           | 프랜차이즈 여부 → 자치구 → 업종 → 매장 크기·층을 단계로 받아 리포트 요청을 만든다.                             | [세부 명세](./simulation-report.md) D4-1~2 | 미구현    |
| 3   | 리포트 화면           | 총비용·비용 구성·권리금·유사 프랜차이즈·성별연령·성수기를 렌더한다. 결측 섹션은 숨긴다.                        | [세부 명세](./simulation-report.md) D4-3   | 미구현    |
| 4   | 비교 화면             | 조건이 다른 두 리포트를 병렬 계산해 나란히 비교한다. 한쪽이 실패하면 비교가 성립하지 않으므로 함께 실패시킨다. | [세부 명세](./simulation-report.md) D5     | 미구현    |
| 5   | 결과 저장 / 이력 목록 | 로그인 사용자가 결과를 저장하고 최신순 목록을 페이지네이션으로 본다.                                           | [세부 명세](./simulation-report.md) D4-4   | 미구현    |

### S3-1. 지원 업종 30종을 상수로 두는 이유

백엔드에 **지원 업종 목록 조회 API가 없다.** 지원 여부는 `GET /simulations/store-sizes`를 실제로 호출해야만 알 수 있고 미지원이면 404 `SIMULATION_001`이다. 사용자가 고른 뒤에야 404를 보는 흐름을 막기 위해 백엔드 시드(`simulation-seed.sql`의 `simulation_service_type`, `base_year='2024'`)를 `src/data/simulation-service-types.ts`로 옮겨 **선택 단계에서 차단**한다.

- **깨지는 시점**: 기준 연도 전환(2024 → 다음 수집분)으로 시드가 재적재되면 업종 구성이 바뀔 수 있다.
- **여기 있는데 서버엔 없을 때**: `store-sizes` 404 `SIMULATION_001` → 재시도 버튼 없이 서버 메시지를 보여주고 다른 업종을 고르게 안내한다.
- **서버엔 있는데 여기 없을 때**: 오류 없이 선택지에서 조용히 사라진다. 더 위험하므로 `simulation-service-types.test.ts`가 개수(30)·코드 형식·`simulation-catalog.ts`와의 정합을 지켜 시드 변경 시 테스트가 먼저 깨지게 했다.

---

## S4. 세부 명세

**세부 명세**

- [simulation-report — 계산·저장 흐름](./simulation-report.md) (D0~D8)

### S4-1. 계약 정렬

#### 엔드포인트

| 엔드포인트                                                   | 인증     | 비고                                            |
| ------------------------------------------------------------ | -------- | ----------------------------------------------- |
| `GET /simulations/store-sizes?serviceCode=`                  | 공개     | 소/중/대 프리셋(㎡·평) + `dataBaseYear`         |
| `GET /simulations/franchisees?serviceCode=&keyword=&lastId=` | 공개     | 커서 페이징 최대 10건, `lastId`가 `null`이면 끝 |
| `POST /simulations/reports`                                  | 공개     | **동기 계산** (SSE·폴링 아님)                   |
| `POST /simulations/histories`                                | **인증** | 서버가 명칭을 되채워 저장본을 반환              |
| `GET /simulations/histories?page=&size=`                     | **인증** | 본인 이력 최신순, `size` ≤ 50                   |

#### V1 → V2 필드 매핑

| V1                              | V2                                     | 비고                                                                                           |
| ------------------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `isFranchisee`                  | `franchisee`                           |                                                                                                |
| `brandName` (요청)              | `franchiseeId`                         | 문자열 브랜드명 → 검색 응답의 숫자 아이디                                                      |
| `gugun` (구 이름)               | `districtCode`                         | 코드 (`'11740'`). `src/data/districts.ts`의 `gooCode`                                          |
| `floor: string` (`'1층'`)       | `floorType: 'FIRST_FLOOR' \| 'OTHER'`  | **응답에서는 `{code,name,description}` 메타데이터** — 방향이 다름                              |
| `serviceCodeName`               | `serviceName`                          |                                                                                                |
| `detail`                        | `costDetail`                           |                                                                                                |
| `keyMoneyInfo.keyMoney`         | `keyMoney.keyMoneyAverage`             |                                                                                                |
| `franchisees`                   | `similarFranchisees` (+`franchiseeId`) |                                                                                                |
| `genderAndAgeAnalysisInfo`      | `genderAgeAnalysis`                    | `first/second/third` → **`topAgeGroups[]`**, `maleSalesPercent` → `malePercent`. **null 가능** |
| `monthAnalysisInfo.peakSeasons` | `seasonAnalysis.peakMonths`            | **null 가능**                                                                                  |
| —                               | `dataBaseYear`                         | 신규. **화면 노출 필수**                                                                       |
| —                               | `condition`                            | 신규. 요청 조건 + 조회된 명칭                                                                  |
| `"월 최소 목표 매출"`           | **제거됨**                             | V1이 보증금을 잘못 표기하던 필드. **되살리지 않는다**                                          |

- `historyId`는 AUTO_INCREMENT `int64`라 **number**로 안전하다 (다른 도메인의 Snowflake 문자열 아이디와 다름).
- `condition.floorType`/`SimulationHistoryItem.floorType`은 응답에서 메타데이터 객체지만, **요청의 `floorType`은 enum 문자열**이다.

#### 오류 처리

⚠️ 2026-08-26 백엔드 변경으로 V1 시절의 `SIMULATION_100`/`SIMULATION_101` 도메인 코드는 **삭제**됐다. 현재 코드 체계는 아래와 같다 (`SimulationErrorCode` / `SimulationValidationMessage` 실물 확인).

| 코드                   | HTTP | 상황                               | 화면 처리                                                              |
| ---------------------- | ---- | ---------------------------------- | ---------------------------------------------------------------------- |
| `SIMULATION_001`       | 404  | 시뮬레이션 미지원 업종             | 업종 선택 제한으로 예방. 발생 시 **재시도 버튼 없이** 서버 메시지 표시 |
| `SIMULATION_002`       | 404  | 임대료 데이터 없는 자치구          | 자치구 재선택 안내, **재시도 버튼 없음**                               |
| `SIMULATION_003`       | 404  | 존재하지 않는 `franchiseeId`       | 브랜드 재선택 유도, **재시도 버튼 없음**                               |
| `SIMULATION_004`       | 400  | 프랜차이즈인데 `franchiseeId` 누락 | 폼 검증으로 예방                                                       |
| `SIMULATION_101`~`109` | 400  | 요청 필드 검증 실패                | `resultMessage.errors[]`를 필드별로 매핑 (아래 표)                     |
| `COMMERCIAL_100`       | 400  | 검증 폴백                          | `resultMessage.message` 표시                                           |
| `COMMERCIAL_102`       | 400  | **쿼리·경로 파라미터** 타입 불일치 | `resultMessage.message` 표시                                           |
| `SECURITY_001`         | 401  | 미인증 (`histories`)               | 로그인 유도                                                            |
| 5xx / 무응답           | —    | 일시 장애                          | "잠시 후 다시 시도" + 재시도 버튼                                      |

필드 검증 코드(`SimulationValidationMessage` 단일 기준점):

| 코드             | 필드           | 메시지                                               |
| ---------------- | -------------- | ---------------------------------------------------- |
| `SIMULATION_101` | `franchisee`   | 프랜차이즈 여부는 필수입니다.                        |
| `SIMULATION_102` | `districtCode` | 자치구 코드는 필수입니다.                            |
| `SIMULATION_103` | `serviceCode`  | 서비스 업종 코드는 필수입니다.                       |
| `SIMULATION_104` | `storeSize`    | 매장 면적(㎡)은 1 이상이어야 합니다.                 |
| `SIMULATION_105` | `floorType`    | 층 구분은 필수입니다.                                |
| `SIMULATION_106` | `periodCode`   | 기준 분기 코드는 yyyyQ(예: 20233) 형식이어야 합니다. |
| `SIMULATION_107` | `totalPrice`   | 총 창업 비용(만원)은 0 이상이어야 합니다.            |
| `SIMULATION_108` | `page`         | 페이지는 0 이상이어야 합니다.                        |
| `SIMULATION_109` | `size`         | 페이지 크기는 1 이상 50 이하만 가능합니다.           |

> **주의 — 봉투 없는 400이 있다.** `COMMERCIAL_102`는 `MethodArgumentTypeMismatchException`(쿼리·경로 파라미터 바인딩)만 처리한다. **요청 본문 JSON의 enum 값이 잘못된 경우**는 `HttpMessageNotReadableException`이라 핸들러에 걸리지 않고 Spring 기본 400이 그대로 내려온다. dev 실측(2026-08-26):
>
> ```
> POST /api/v1/simulations/reports   body: { ..., "floorType": "BASEMENT" }
> → HTTP 400
> {"timestamp":"2026-08-26T03:22:54.417+00:00","status":400,"error":"Bad Request","path":"/api/v1/simulations/reports"}
> ```
>
> `dataHeader` 봉투가 없으므로 화면은 이 응답에서 서버 메시지를 얻을 수 없다 — `normalizeApiError`가 `kind: 'client'` 기본 문구로 흡수한다(크래시는 없다). **FE 완화책: `floorType`을 자유 입력으로 두지 말고 enum 선택지로만 제출해 이 경로에 들어가지 않게 한다.** 백엔드 후속 요청은 [세부 명세 D8-3](./simulation-report.md#d8-3-후속-요청-백엔드)에 분리해 두었다. 이 슬라이스에서 백엔드 코드는 수정하지 않았다.

---

## S5. 테스트케이스

### TC-001. API 클라이언트가 V2 경로·쿼리스트링을 만든다

| 항목      | 내용                                                                                                                    |
| --------- | ----------------------------------------------------------------------------------------------------------------------- |
| 검증 대상 | S2 #1, #2, #10                                                                                                          |
| 사전 조건 | `apiClient.get/post`를 스파이로 대체                                                                                    |
| 실행      | `fetchSimulationStoreSizes` / `fetchSimulationFranchisees` / `createSimulationReport` / `fetchSimulationHistories` 호출 |
| 기대 결과 | 모든 경로가 `/simulations/`로 시작하고, 커서·키워드가 없으면 해당 키를 싣지 않는다.                                     |
| 우선순위  | P1                                                                                                                      |
| 비고      | `src/lib/api/simulation.test.ts`                                                                                        |

### TC-002. 요청 본문 정규화

| 항목      | 내용                                                                                                           |
| --------- | -------------------------------------------------------------------------------------------------------------- |
| 검증 대상 | S2 #1, S4-1 필드 매핑                                                                                          |
| 사전 조건 | 마법사 입력 객체                                                                                               |
| 실행      | `buildSimulationReportRequest` / `buildSimulationHistorySaveRequest`                                           |
| 기대 결과 | 비프랜차이즈면 `franchiseeId` 키를 넣지 않고, 빈 `periodCode`는 제거하며, 저장 요청에서 `periodCode`를 버린다. |
| 우선순위  | P1                                                                                                             |
| 비고      | `''` periodCode 를 보내면 400 `SIMULATION_106`                                                                 |

### TC-003. 지원 업종 상수 정합

| 항목      | 내용                                                                                     |
| --------- | ---------------------------------------------------------------------------------------- |
| 검증 대상 | S2 #4, S3-1                                                                              |
| 사전 조건 | 없음                                                                                     |
| 실행      | `SIMULATION_SERVICE_TYPES` 개수·코드 형식·정렬, `simulation-catalog.ts`와 코드·이름 대조 |
| 기대 결과 | 30종이고 중복이 없으며 카테고리 그룹 데이터와 완전히 일치한다.                           |
| 우선순위  | P1                                                                                       |
| 비고      | 시드 변경 시 여기가 먼저 깨진다                                                          |

### TC-004. 결측 섹션 판정

| 항목      | 내용                                                                                             |
| --------- | ------------------------------------------------------------------------------------------------ |
| 검증 대상 | S2 #7, #8                                                                                        |
| 사전 조건 | `genderAgeAnalysis`/`seasonAnalysis`가 `null`인 리포트                                           |
| 실행      | `hasGenderAgeAnalysis` / `hasSeasonAnalysis` / `hasFranchiseeLevy`                               |
| 기대 결과 | null·빈 배열이면 false(섹션 숨김)이고 오류로 취급하지 않는다. `levy: 0`은 값이 있는 것으로 본다. |
| 우선순위  | P1                                                                                               |
| 비고      | `src/lib/simulation/report-sections.test.ts`                                                     |

### TC-005. 라우트가 준비 중 화면으로 되돌아가지 않는다

| 항목      | 내용                                                                                                   |
| --------- | ------------------------------------------------------------------------------------------------------ |
| 검증 대상 | S3 #2~#5 구현 완료 구간의 회귀 방어                                                                    |
| 사전 조건 | 6개 simulation 라우트                                                                                  |
| 실행      | route source가 실화면(빌더/리포트/비교)을 마운트하고 준비 중 안내를 쓰지 않는지 확인                   |
| 기대 결과 | 어느 라우트도 `SimulationUnavailablePage` 로 되돌아가지 않는다.                                        |
| 우선순위  | P1                                                                                                     |
| 비고      | `app/(shell)/simulation/simulation-routes.test.ts`. 컴포넌트 자체는 삭제됐고 단언은 회귀 방어로 남긴다 |

### 요약표

| TC ID  | 범위 | 구분 | 검증 대상              | 우선순위 | 결과(P/F) | 비고                           |
| ------ | ---- | ---- | ---------------------- | -------- | --------- | ------------------------------ |
| TC-001 | S    | 정상 | V2 경로·쿼리스트링     | P1       | P         | 커서 생략 포함                 |
| TC-002 | S    | 경계 | 요청 본문 정규화       | P1       | P         | 빈 periodCode / franchiseeId   |
| TC-003 | S    | 정상 | 지원 업종 30종 정합    | P1       | P         | 시드 드리프트 감지             |
| TC-004 | S    | 경계 | 결측 섹션 = 숨김       | P1       | P         | null은 오류 아님               |
| TC-005 | S    | 정상 | 준비 중 화면 회귀 방어 | P1       | P         | 컴포넌트 삭제 후에도 단언 유지 |

---

## 검증 결과 (2026-08-26 계약 정렬 슬라이스)

- Swagger 실물 대조: `Simulation*` 스키마 22종 전부 확인
- dev 실호출 확인 (`https://api-dev.bosspickseoul.com/api/v1/simulations/**`)
  - `store-sizes` 정상 / 미지원 업종 404 `SIMULATION_001`
  - `franchisees` 10건 + `lastId`, 결과 없음 시 `lastId: null`
  - `reports` 프랜차이즈·비프랜차이즈 양쪽 (`levy` null 여부 확인)
  - 오류: `SIMULATION_002`(404) / `SIMULATION_003`(404) / `SIMULATION_004`(400) / `SIMULATION_101~106`(400) / `SECURITY_001`(401)
  - 본문 enum 불일치는 봉투 없는 Spring 기본 400 (S4-1 주의 참고)
- `pnpm test`: 통과
- `pnpm qa:verify`(format:check / lint / typecheck / build): 통과

> `histories` 저장 API는 이 슬라이스에서 **호출하지 않았다** (인증 필요·쓰기 API). 계약은 Swagger로만 확인했다.

---

## 후속 작업

1. ~~**입력 마법사 UI** (S3 #2)~~ — 구현 완료(슬라이스 B1). 준비 중 안내 `SimulationUnavailablePage`는 삭제했다.
2. ~~**리포트/비교 화면** (S3 #3, #4)~~ — 구현 완료(슬라이스 B1·B3). 다만 비교 결과는 URL 로 복원되지 않는다(조건까지만) → [세부 명세 비교 화면](./simulation-report.md#비교-화면) 참조.
3. ~~**저장·이력** (S3 #5)~~ — 구현 완료(슬라이스 B2).
4. **V1 잔재 제거** — 도달 불가한 레거시 컴포넌트 3종(`simulation-form-page`, `simulation-report-page`, `simulation-compare-page`)은 **UI 슬라이스에서 삭제**한다. share Feature가 `/share/[token]`의 V1 시뮬레이션 공유 처리를 정하는 중이라 지금 지우면 충돌하므로 이번엔 그대로 둔다. 전체 삭제 목록은 [세부 명세 D8-1](./simulation-report.md#d8-1-확정-재론하지-않는다) 참조.
5. **백엔드 후속 요청** — 요청 본문 enum 불일치 시 봉투 없는 400 ([세부 명세 D8-3](./simulation-report.md#d8-3-후속-요청-백엔드)). FE에서 우회 가능하므로 차단 이슈는 아니다.

---

## 변경 이력

| 버전 | 날짜       | 변경 내용                                                                                                                                              | 작성자 |
| ---- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| 1.0  | 2026-07-28 | V2 API 계약 부재에 따른 프런트 안전 대기 상태와 재개 조건 확정                                                                                         | Codex  |
| 2.0  | 2026-08-26 | V2 계약(`/simulations/**`) 기준 전면 재작성. 필드 매핑·오류 표·지원 업종 상수 확정                                                                     | Codex  |
| 2.1  | 2026-08-27 | 슬라이스 B1~B3(입력·리포트·저장/이력·A/B 비교) 구현 완료 반영. 준비 중 안내 컴포넌트 삭제에 맞춰 TC-005 를 회귀 방어로 재정의                          | Claude |
| 2.1  | 2026-08-26 | 미결 3건 확정 반영 — 성별·연령 집계 범위 제약(S2 #13), `periodCode` 비노출(S2 #14), 레거시 삭제 시점. 봉투 없는 400 실측 응답 인용 + BE 후속 요청 분리 | Codex  |

> 세부 변경 이력은 Azure DevOps Wiki 페이지의 **Revisions** 탭에서 확인합니다.
