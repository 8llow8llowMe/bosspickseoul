# Simulation Frontend Guide

## Purpose

이 문서는 프론트엔드에서 창업 비용 시뮬레이션 화면을 구현할 때
`commercial-service`의 `/api/v1/simulations/**` API를 어떻게 조합해서 쓰는지 정리한다.

- 시뮬레이션은 **동기 계산**이다. AI 리포트와 달리 폴링/SSE 없이 `POST /reports` 한 번으로 결과를 받는다.
- 계산·조회는 공개, **결과 저장/목록만 인증 필수**다.
- 모든 금액 응답 단위는 **만원**, 면적 입력 단위는 **㎡**다.

## Authentication Policy

| API | 인증 |
|---|---|
| `GET /simulations/store-sizes`, `GET /simulations/franchisees`, `POST /simulations/reports` | 불필요 (공개) |
| `POST /simulations/histories`, `GET /simulations/histories` | **필수** (Bearer, 본인 데이터만) |

비로그인 사용자도 시뮬레이션을 돌릴 수 있고, "저장" 버튼에서만 로그인을 유도하면 된다
(AI 리포트 잠금 카드와 달리 기능 전체를 막을 필요 없음).

## 화면 플로우 (입력 마법사 → 리포트)

```
① 프랜차이즈 여부 선택
   └─ 예 → GET /simulations/franchisees?serviceCode=&keyword=&lastId=  (브랜드 검색, 업종 선택 후 호출)
② 자치구 선택 (districtCode — 서울 25개 구)
③ 업종 선택 (serviceCode — 시뮬레이션 지원 업종 30종)
④ 매장 크기 선택
   └─ GET /simulations/store-sizes?serviceCode=  → 소/중/대 (㎡·평) 버튼으로 제시
   └─ 층 구분 선택: FIRST_FLOOR(1층) / OTHER(1층 외)
⑤ POST /simulations/reports → 리포트 렌더
   └─ (로그인 시) 저장 버튼 → POST /simulations/histories
```

업종 선택이 브랜드 검색보다 먼저 와야 한다 — 프랜차이즈 검색이 `serviceCode`를 필수로 받는다.

## API 상세

### 1. 매장 크기 기준 — `GET /api/v1/simulations/store-sizes?serviceCode=CS100001`

```json
{ "serviceCode": "CS100001", "serviceName": "한식음식점", "dataBaseYear": "2024",
  "small": { "squareMeter": 36, "pyeong": 10 },
  "medium": { "squareMeter": 65, "pyeong": 19 },
  "large": { "squareMeter": 94, "pyeong": 28 } }
```

- 404 (`SIMULATION_001`) = 시뮬레이션 미지원 업종. 업종 선택 UI를 지원 업종으로 제한하면 발생하지 않는다.
- 사용자가 직접 면적을 입력하게 해도 된다 — 소/중/대는 프리셋일 뿐, `reports`의 `storeSize`는 임의 양수 허용.

### 2. 프랜차이즈 검색 — `GET /api/v1/simulations/franchisees?serviceCode=&keyword=&lastId=`

- 커서 페이징: 최대 10건, 응답의 `lastId`를 다음 요청에 넘기면 이어서 조회. `keyword`는 브랜드명 부분 일치(생략 시 전체).
- 응답 항목: `{ franchiseeId, brandName, serviceCode, serviceName }` — 선택한 `franchiseeId`를 리포트 요청에 사용한다.

### 3. 리포트 계산 — `POST /api/v1/simulations/reports`

요청:

```json
{ "franchisee": true, "franchiseeId": 101,
  "districtCode": "11740", "serviceCode": "CS100001",
  "storeSize": 66, "floorType": "FIRST_FLOOR", "periodCode": "20233" }
```

- `franchisee=false`면 `franchiseeId` 생략. `periodCode`는 생략 시 20233 (성별·연령/성수기 분석 기준 분기).
- `floorType`: `FIRST_FLOOR` / `OTHER` enum 문자열.

응답 구조와 화면 매핑:

| 필드 | 내용 | 화면 |
|---|---|---|
| `condition` | 요청 조건 + 조회된 명칭(자치구명/업종명/브랜드명), `floorType`은 `{code,name,description}` 메타데이터 | 리포트 상단 조건 요약 |
| `dataBaseYear` | 기준 데이터 연도 | **"2024년 기준 데이터로 계산된 결과입니다" 안내문 필수 노출 권장** |
| `totalPrice` | 예상 총 창업 비용 (만원) | 헤드라인 숫자 |
| `costDetail` | `rentPrice`(월 임대료)/`deposit`(보증금)/`interior`/`levy`(가맹 부담금, 비프랜차이즈면 null) | 비용 구성 차트/표 |
| `keyMoney` | `keyMoneyRatio`(%)/`keyMoneyAverage`(만원)/`keyMoneyLevel`(만원/㎡) | 권리금 카드 (총비용에 미포함 — 별도 참고 정보로 표기) |
| `similarFranchisees` | 예상 총비용과 근접한 프랜차이즈 Top 5 (항목별 비용 포함) | 비교 리스트 |
| `genderAgeAnalysis` | 남/여 매출 비중(%) + 연령 상위 3 (만원). **null 가능** | 도넛/막대 — null이면 섹션 숨김 |
| `seasonAnalysis` | `peakMonths`/`offPeakMonths` (월 배열). **null 가능** | 성수기 배지 — null이면 섹션 숨김 |

- `genderAgeAnalysis`/`seasonAnalysis`는 해당 자치구×업종의 매출 데이터가 없으면 null이다 — 오류가 아니므로 섹션만 숨긴다.

### 4. 결과 저장/목록 (인증)

- `POST /api/v1/simulations/histories` — body는 리포트 요청 조건 + `totalPrice`(만원). 서버가 명칭(자치구/업종/브랜드)을 다시 채워 저장하고 저장된 항목을 반환한다.
- `GET /api/v1/simulations/histories?page=0&size=10` — 본인 이력 최신순, `size` 최대 50.
  응답: `{ histories[], page, size, totalElements, totalPages }`, 각 항목에 `dataBaseYear` 포함
  (과거 저장본이 어떤 기준 연도로 계산됐는지 표시 가능).
- 삭제 API는 아직 없다 (백엔드 후속 과제).

## 에러 처리

`api-reference.md` "오류 처리 규약"을 따른다 — **404에는 다시 시도 버튼을 띄우지 않는다.**

| 코드 | 상황 | 화면 처리 |
|---|---|---|
| `SIMULATION_001` (404) | 미지원 업종 | 업종 선택 UI 제한으로 예방 |
| `SIMULATION_002` (404) | 임대료 데이터 없는 자치구 | 자치구 선택 안내 (`resultMessage` 표시) |
| `SIMULATION_003` (404) | 존재하지 않는 franchiseeId | 브랜드 재선택 유도 |
| `SIMULATION_004` (400) | 프랜차이즈인데 franchiseeId 누락 | 폼 검증으로 예방 |
| `SIMULATION_100`/`101` (400) | 요청 검증 실패 | `resultMessage.errors[]` 필드별 표시 |
| 5xx / 무응답 | 일시 장애 | "잠시 후 다시 시도" + 재시도 버튼 |

## 관련 문서

- 데이터 출처/기준 연도: `docs/simulation-data-sources.md`
- 상권 자체를 저장(북마크)하는 기능은 auth-service `POST /api/v1/members/me/bookmarks`
  (targetType: COMMERCIAL/ADMINISTRATION/DISTRICT) — 시뮬레이션 이력 저장과 별개 기능이다.
