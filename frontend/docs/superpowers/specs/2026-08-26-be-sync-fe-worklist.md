# develop 동기화 보고서 — 백엔드 변경 분석과 FE 작업 도출

> **작성일**: 2026-08-26
> **대상 브랜치**: `develop` (`2c6209c` → `195fc1f`)
> **검증 방법**: 커밋/문서 리뷰 + dev Swagger 스냅샷 + 실제 dev API 호출
> **상태**: 조사 완료 (Specify 단계 산출물)

[[_TOC_]]

---

## 0. 요약

- `origin/develop` 을 `2c6209c` → `195fc1f` 로 갱신했다. **41 커밋** (BE 27 / FE 14), 기간 2026-08-13 ~ 08-24.
- 백엔드에 **창업 시뮬레이션(신규 도메인)**, **상권 추천 블루오션 업종**, **분석 화면 보관함(신규 도메인)** 이 들어왔고,
  **추천 500/404 결함 수정**과 **전 서비스 오류 처리 규약(404 vs 5xx)** 이 확정됐다.
- 내가 08-13~14에 올린 FE PR(#113 BFF 선재발급, #114 헤더/홈 반응형, #115 구별현황 반응형, #117 UI 폴리시)은 **전부 머지 완료**. 열린 PR 없음.
- FE 기준 신규 작업은 4건. 총평: **시뮬레이션 V2 구현이 압도적으로 큼**(placeholder 해제), 나머지 3건은 중소 규모.
- 로컬 `develop` 워크트리(`.worktrees/bosspick-develop`) 기준 **테스트 107 파일 / 786 케이스 전부 통과**. 회귀 없음.

---

## 1. develop 변경 내역

### 1.1 커밋 범위

```
2c6209c [FE] feat: 구별현황·헤더·상권분석 UI/UX 폴리시   ← 이전 기준점
   …41 commits…
195fc1f [BE] feat: 라벨 없는 머지 빌드에서 백엔드 JAR CI 생략  ← 현재 HEAD
```

### 1.2 머지된 PR

| PR   | 제목                                                                       | 머지일 |
| ---- | -------------------------------------------------------------------------- | ------ |
| #119 | [FE] 프론트 개발서버 배포 파이프라인 구축 (Next.js SSR)                    | 08-18  |
| #122 | [BE] 상권 추천 정상화·블루오션 업종 추가 및 창업 비용 시뮬레이션 신규 구축 | 08-21  |
| #124 | [BE] 분석 화면 보관함 구현 및 기본 패키지 `bosspickseoul` 리네임           | 08-24  |
| #125 | [FE] 소셜 로그인 후 `0.0.0.0:3000` 리다이렉트 수정                         | 08-24  |
| #126 | [BE] 라벨 없는 머지 빌드에서 백엔드 JAR CI 생략                            | 08-24  |

열린 PR: **없음**. 다만 미머지 원격 브랜치 `feature/be/policy-recommendation` 이 develop 위에 2커밋 존재
(`지원 정책 추천 도메인 구현`, `API 검증 규약 정리`) — 곧 들어올 다음 백엔드 기능으로 보인다.

---

## 2. 백엔드 변경 — 검증 결과

dev Swagger(`https://api-dev.bosspickseoul.com/commercial-service/v3/api-docs`)와 실제 호출로 **전부 배포 확인**했다.

### 2.1 상권 추천 — 결함 수정 + 블루오션 업종 (요청하신 확인 항목 ①)

**(a) 데이터 없는 상권 때문에 추천 전체가 실패하던 버그 수정** (`47f16c8`)

- 원인: 히트맵/추천 스코어링의 `buildSource` 가 `IllegalArgumentException` 만 잡고 있었는데, 도메인 예외 전환 이후
  매출 데이터 없는 상권에서 `CommercialException(COMMERCIAL_007)` 이 그대로 전파돼 **요청 전체가 404** 로 실패.
- 수정: `CommercialException` 도 잡아 **해당 상권만 점수 산정에서 제외**. 회귀 테스트 추가됨.
- **FE 영향**: 이제 해당 상권은 `compositeScore: null`, `grade: null` 로 내려온다. 요청은 200.

**(b) 블루오션 업종 Top 5 추가** (`13637f2`)

- `GET /api/v1/commercials/recommendations/by-service` 응답의 각 후보에 `blueOceanCategories` 필드 신설.
- 정의: **소속 행정동에는 많지만 이 상권에는 적은(비어 있는) 업종**.
  산식 `storeRate = 상권 점포수 / 행정동 점포수 × 100`, 상권에 없으면 라플라스 보정 `1/(행정동+1)×100`. `storeRate` 오름차순 Top 5.
- `/candidates`(지도 후보 탐색)에는 **미적용** — 추천 경로 전용.
- 산정 실패 시 빈 목록으로 강등 → 추천 자체는 실패하지 않음.

실제 호출 결과 (강동구 길동, `serviceCode=CS100001`, `topN=5`):

```
1 길동주민센터(강동도서관)  77.8 HIGH
   여관 0/29 (3.33%) · 조명용품 1/20 (5.0%) · 세무사사무소 0/18 (5.26%) · 외국어학원 1/19 (5.26%) · 가전제품 2/28 (7.14%)
3 강동성심병원            20.6 LOW
   부동산중개업 1/158 (0.63%) · 미용실 0/122 (0.81%) · 한식음식점 3/325 (0.92%) · 일반의류 0/94 (1.05%) · 화장품 0/74 (1.33%)
```

> ⚠️ 관찰: 3위 항목에 **사용자가 선택한 업종(한식음식점)이 블루오션으로 다시 등장**한다.
> 의미상으론 "이 상권은 그 업종이 덜 찼다"라 유효하지만, 화면 문구에 따라 혼란 소지가 있다 → §4.2 결정 필요.

**(c) 검증 규약 확인**: `topN` 은 **5 이상 30 이하**만 허용 (`COMMERCIAL_101`).
현재 FE 상수 `RECOMMENDATION_TOP_N = 5` 라 안전하나, 조정 UI를 넣을 땐 범위를 지켜야 한다.

### 2.2 창업 비용 시뮬레이션 — 신규 도메인 (요청하신 확인 항목 ②)

`commercial-service` 에 `simulation` 컨텍스트 신설. 게이트웨이 라우트 `/api/v1/simulations/**` 등록 완료.
연동 가이드 문서 신설: `backend/docs/simulation-frontend-guide.md`, 데이터 출처: `backend/docs/simulation-data-sources.md`.

| API                                                                 | 인증    | 비고                             |
| ------------------------------------------------------------------- | ------- | -------------------------------- |
| `GET /api/v1/simulations/store-sizes?serviceCode=`                  | 공개    | 업종별 소/중/대 매장 크기(㎡·평) |
| `GET /api/v1/simulations/franchisees?serviceCode=&keyword=&lastId=` | 공개    | 브랜드 검색, 커서 페이징 10건    |
| `POST /api/v1/simulations/reports`                                  | 공개    | **동기 계산** (SSE/폴링 아님)    |
| `POST /api/v1/simulations/histories`                                | 🔒 필수 | 결과 저장                        |
| `GET /api/v1/simulations/histories?page=&size=`                     | 🔒 필수 | 본인 이력 최신순 (size ≤ 50)     |

핵심 계약:

- 금액 단위 **만원**, 면적 입력 **㎡**. 응답에 `dataBaseYear`(현재 `"2024"`) 포함 → **"2024년 기준" 안내 노출 권장**.
- `floorType`: `FIRST_FLOOR` / `OTHER` enum. 응답에서는 `{code,name,description}` 메타데이터로 내려온다.
- `genderAgeAnalysis` / `seasonAnalysis` 는 **null 가능** (오류 아님 → 섹션만 숨김).
- 비로그인도 계산 가능. **"저장" 버튼에서만 로그인 유도** (AI 리포트 잠금 카드와 다름).
- V1 대비 정비: 자치구를 **코드**로 받음, 프랜차이즈를 **franchiseeId**로 지정, 분기-월 매핑 정정,
  "월 최소 목표 매출"(보증금 오표시) 필드 제거.
- **삭제 API 없음** (BE 후속 과제).

실호출 검증 (강동구 `11740` / 한식음식점 `CS100001` / 66㎡ / 1층, 비프랜차이즈):

```
totalPrice 6591만원
costDetail  rentPrice 282 · deposit 2822 · interior 3486 · levy null
keyMoney    ratio 75.4% · average 5670만원 · level 75.3만원/㎡
similarFranchisees 5건 (킹스킹치킨피자 6585 / 전국홍게자랑 6605 …)
genderAgeAnalysis  남 62.5% / 여 37.5%, Top3 50대·60대이상·40대
seasonAnalysis     peak [4,5,6] / offPeak [1,2,3]
```

### 2.3 상권 분석 — 에러 메시지 개선 + 오류 처리 규약 (요청하신 확인 항목 ③)

**(a) 에러 메시지 사용자 관점으로 변경** (`8ad7c0e`) — 에러 코드는 그대로, 문구만 변경

| 코드                         | 변경 전                                   | 변경 후                                                                  |
| ---------------------------- | ----------------------------------------- | ------------------------------------------------------------------------ |
| `COMMERCIAL_006~011`         | "유동 인구 정보를 찾을 수 없습니다."      | "해당 분기의 유동인구 데이터가 없습니다. **다른 분기를 선택해 주세요.**" |
| `DISTRICT_001~002`           | "상권 변화 지표 정보를 찾을 수 없습니다." | "해당 분기의 상권 변화 지표 데이터가 없습니다. 다른 분기를…"             |
| `ADMINISTRATION_001~003`     | "행정동 지출 정보를 찾을 수 없습니다."    | "해당 분기의 행정동 지출 데이터가 없습니다. 다른 분기를…"                |
| `COMMERCIAL_SUMMARY_001~002` | "%s 매출 정보를 찾을 수 없습니다."        | "해당 분기의 %s 매출 데이터가 없습니다. 다른 분기를…"                    |

dev 실호출로 확인:

```
GET /api/v1/commercials/3110008/foot-traffic?periodCode=20244  → HTTP 404
{"dataHeader":{"success":false,"resultCode":"COMMERCIAL_006",
  "resultMessage":"해당 분기의 유동인구 데이터가 없습니다. 다른 분기를 선택해 주세요."}}
```

**(b) 전 서비스 공통 오류 처리 규약 명문화** (`ab2550a`) — `backend/docs/api-reference.md`

> 클라이언트는 **에러코드 목록을 관리하지 않고 HTTP 상태만으로 UI를 분기**한다.

| 구분                         | 의미                             | 권장 UI                                           |
| ---------------------------- | -------------------------------- | ------------------------------------------------- |
| 응답 없음(네트워크/타임아웃) | 통신 실패                        | "다시 시도" 버튼                                  |
| **5xx**                      | 일시 장애 — 재시도하면 성공 가능 | "잠시 후 다시 시도해 주세요" + 재시도 버튼        |
| **404**                      | 데이터 부재 — 재시도해도 동일    | `resultMessage` 그대로 표시, **재시도 버튼 금지** |
| 그 외 4xx                    | 요청 자체 문제                   | 입력 수정 / 로그인 유도                           |

### 2.4 분석 화면 보관함 — 신규 도메인 (미언급이지만 FE 작업 발생)

`/api/v1/analysis-bookmarks/**`, **전 API 인증 필수**. 공유 링크와 **payload/shareType 계약 동일** → 빌더 재사용 전제.

| Method | Path                       | 비고                                                                                                  |
| ------ | -------------------------- | ----------------------------------------------------------------------------------------------------- |
| POST   | `/`                        | `{shareType, payload, bookmarkName?}`. 동일 상태 재저장 시 **409** (dataBody 에 `existingBookmarkId`) |
| GET    | `/?shareType=&page=&size=` | 최신순, size 1~50, shareType 선택 필터                                                                |
| PATCH  | `/{bookmarkId}`            | 이름 수정 (null/공백이면 제거)                                                                        |
| DELETE | `/{bookmarkId}`            | 타인 항목은 404                                                                                       |

- `shareType`: `COMMERCIAL_ANALYSIS` / `DISTRICT_ANALYSIS` / `ADMINISTRATION_ANALYSIS` / `COMMERCIAL_COMPARISON` / `AI_REPORT`
- ⚠️ **`bookmarkId` 는 문자열** (Snowflake, JS 정밀도 손상 방지). 숫자로 파싱 금지.
- 회원당 상한 기본 100개 초과 시 `400 ANALYSIS_BOOKMARK_006`.
- 자치구/행정동/상권 **엔티티** 즐겨찾기(auth-service `/members/me/bookmarks`)와 **역할이 다름** — 이쪽은 "조건까지 포함한 화면 상태".

### 2.5 기타

- **패키지 리네임**: `com.followfollowme.nowdoboss` → `com.followfollowme.bosspickseoul` (BE 내부, FE 무영향. diff 1,100+ 파일 노이즈의 원인).
- **`policy` 도메인 잔여 시드 제거** — 재개 시 스키마부터 재설계 예정.
- FE 배포 파이프라인(#119): `output: 'standalone'`, `images.unoptimized`, sharp 추적 제외, Jenkins 파이프라인 + 런북(`frontend/docs/runbook/deployment.md`).
- **환경변수 정리**: `NEXT_PUBLIC_KAKAOMAP_API_KEY` 제거 → **`NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY` 로 통합**, `env.apiUrl` export 제거(WS 유도용으로만 사용).
  → 로컬 `.env.local` 에 새 키 이미 존재 확인. `.env.example` 신설됨.
- 소셜 로그인 리다이렉트 수정: standalone 서버가 `http://0.0.0.0:3000` 오리진을 만드는 문제 → `lib/http/redirect.ts` 의 상대 Location 사용.

---

## 3. 프론트엔드 현재 상태 — 갭 분석

| 백엔드 신규/변경                       | FE 현재 상태                                                                                                                                                       | 갭                                        |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------- |
| `/simulations/**` (V2)                 | `src/lib/api/simulation.ts` 가 **V1 경로**(`/simulation/store`, `/simulation`, `/simulation/save`) 호출. 라우트 6종은 전부 `SimulationUnavailablePage` placeholder | **전면 교체**                             |
| `blueOceanCategories`                  | `types/recommend.ts` 에 필드 없음. 화면 렌더 없음 (`blueOceanInfo` 는 `types/map.ts` 의 V1 잔재)                                                                   | **신규 구현**                             |
| 404 vs 5xx 규약                        | 모든 에러가 "잠시 후 다시 시도해 주세요" + 다시 시도 버튼. **HTTP status 분기 없음**                                                                               | **전면 반영**                             |
| 추천 부분 실패(`compositeScore: null`) | `formatScore` 가 null → **"집계 중"** 으로 표기                                                                                                                    | **문구 수정** (지금 의미는 "데이터 없음") |
| `/analysis-bookmarks/**`               | 미연동. `profile/bookmarks/analysis` 는 **엔티티 북마크** 화면                                                                                                     | **신규 구현**                             |
| `/share-links/**` (V2)                 | **미연동**. `/share/[token]` 은 V1 시뮬레이션 공유 전용                                                                                                            | 보관함과 **묶어서** 처리 권장             |

---

## 4. FE 작업 목록 (우선순위 순)

### 4.1 [P0·소] 오류 처리 규약 반영 — 404는 재시도 버튼 금지

**왜 먼저**: 변경 비용이 가장 작고, 백엔드가 이미 좋은 문구를 내려주는데 FE가 덮어쓰고 있어 체감 개선이 즉시 크다.

작업:

1. `src/lib/api/` 에 에러 분류 유틸 신설 — axios 에러에서 `status` / `resultCode` / `resultMessage` 를 뽑아
   `{ kind: 'network' | 'server' | 'not-found' | 'client', message, code }` 로 정규화.
2. 아래 지점의 에러 렌더를 `kind` 기준으로 분기:
   - `components/analysis/analysis-result-section.tsx:82` (다시 시도 버튼)
   - `components/analysis/analysis-selection-panel.tsx:436`
   - `components/recommend/recommend-map.tsx:916`, `recommend-page.tsx:1004`, `recommend-result-list.tsx:369`
   - `components/status/status-feedback.tsx:119`, `status-page.tsx:408`
3. `not-found` 일 때: 재시도 버튼 제거 + 서버 `resultMessage` 그대로 노출 + **기간(분기) 드롭다운으로 시선 유도**
   (분석 결과뷰에 이미 기간 드롭다운 존재 — 앵커/포커스 이동 검토).
4. `formatScore` 의 null 표기 `'집계 중'` → `'데이터 없음'` 류로 정정 (§3 참조).
5. 테스트: 각 컴포넌트 테스트에 404 케이스 추가(재시도 버튼 미노출 assert).

### 4.2 [P1·소~중] 상권 추천 블루오션 업종 노출

작업:

1. `types/recommend.ts` — `BlueOceanCategory` 타입 + `CandidateCommercial.blueOceanCategories?: BlueOceanCategory[] | null` 추가.
2. `recommend-result-list.tsx` 선택 상세(`<Details>`) 영역에 "이 상권에 비어 있는 업종" 섹션 추가.
   - 표기안: `업종명 · 상권 N곳 / 행정동 M곳 (점유율 X%)`, 낮을수록 기회.
   - 빈 배열/null → 섹션 숨김.
3. `recommend-mobile-sheet.tsx` 동일 반영.
4. **결정 필요**: 사용자가 선택한 `serviceCode` 와 동일한 항목을 목록에서 뺄지, 남기고 "선택 업종" 배지를 붙일지.
   (남기는 쪽이 정보량은 크지만 "다른 업종 추천"이라는 문구와 충돌)
5. **결정 필요**: 부동산중개업·전자상거래업처럼 행정동 점포수가 압도적인 업종이 상위를 잠식한다(위 실측 3·5위).
   "창업 후보로 의미 있는 업종"으로 표시 필터를 둘지, 그대로 노출할지.
6. `types/map.ts` 의 V1 잔재 `blueOceanInfo` 정리.

### 4.3 [P1·중] 분석 보관함 + V2 공유 링크 연동

두 기능이 **payload/shareType 계약을 공유**하므로 한 슬라이스로 묶는 게 효율적이다.
현재 분석 결과뷰의 "공유"는 `navigator.share`/클립보드로 **현재 URL 복사**만 한다 (`analysis-result-view.tsx:975~`).

작업:

1. `shareType` 별 payload 빌더 + URL 복원 빌더(`ROUTE_BUILDERS`) 신설 — `backend/docs/share-link-frontend-guide.md` 기준.
2. `POST /share-links` 연동 → 단축 코드 링크 발급. `/s/{shareCode}` 진입 라우트 신설(또는 `/share/[token]` 재정의).
   만료 410 / 미존재 404 처리.
3. `POST /analysis-bookmarks` — 공유 버튼 옆 "보관" 버튼. 409(`existingBookmarkId`) → "이미 저장됨" + 해제 토글.
4. `profile/bookmarks/analysis` 를 **엔티티 북마크 / 화면 보관함** 2탭으로 확장, `shareType` 필터 탭.
   목록 항목은 payload 를 그대로 들고 오므로 **해석 API 없이 즉시 라우팅** 가능.
5. `bookmarkId` **문자열 유지** (숫자 변환 금지) — 타입과 테스트로 못 박기.
6. 상한 100개 초과 400 → `resultMessage` 그대로 안내.

### 4.4 [P2·대] 창업 시뮬레이션 V2 구현 (placeholder 해제)

가장 큰 작업. 기존 명세 `frontend/docs/features/simulation/simulation.md` 는 "V2 계약 대기" 상태이므로 **명세부터 갱신**해야 한다.

작업:

1. **명세 갱신** — `features/simulation/simulation.md` 를 V2 계약 기준으로 재작성 (S0 as-is/to-be 교체).
2. `types/simulation.ts` **전면 교체** (V1 → V2). 필드명이 거의 다 바뀐다:
   `isFranchisee→franchisee`, `gugun→districtCode`, `floor→floorType(enum)`, `brandName→franchiseeId`,
   `detail→costDetail`, `keyMoneyInfo→keyMoney`(+`keyMoney→keyMoneyAverage`), `franchisees→similarFranchisees`,
   `genderAndAgeAnalysisInfo→genderAgeAnalysis`(구조 변경: `first/second/third` → `topAgeGroups[]`),
   `monthAnalysisInfo→seasonAnalysis`(`peakSeasons→peakMonths`), `+dataBaseYear`.
3. `lib/api/simulation.ts` 엔드포인트 교체 (`/simulations/store-sizes`, `/simulations/franchisees`, `/simulations/reports`, `/simulations/histories`).
4. **입력 마법사** — 문서가 정한 순서를 지킬 것: ① 프랜차이즈 여부 → ② 자치구 → ③ **업종** → ④ 매장 크기·층.
   프랜차이즈 검색이 `serviceCode` 를 필수로 받으므로 **업종이 브랜드 검색보다 앞서야 한다.**
   브랜드 검색은 커서(`lastId`) 무한스크롤 + 키워드 부분일치.
5. **리포트 화면** — 헤드라인 `totalPrice`, 비용 구성(`costDetail`, `levy` null이면 항목 제외),
   권리금 카드(**총비용 미포함** 명시), 유사 프랜차이즈 Top5, 성별·연령 도넛, 성수기 배지.
   `dataBaseYear` 안내문("2024년 기준 데이터로 계산된 결과입니다") 노출.
   `genderAgeAnalysis`/`seasonAnalysis` null → 섹션 숨김(에러 아님).
6. **저장/목록** — 비로그인도 계산 가능, **저장에서만 로그인 유도**. `profile/bookmarks/simulation` placeholder 해제.
7. **에러 처리** — `SIMULATION_001~004`, `SIMULATION_100~101`. §4.1 유틸 재사용.
8. 기존 V1 컴포넌트(`simulation-form-page.tsx`, `simulation-report-view.tsx`, `simulation-compare-page.tsx`) 정리 판단.

**범위 결정 필요** (§5 참조): 비교 화면, 시뮬레이션 공유(`/share/[token]`), 지원 업종 목록 확보 방법.

---

## 5. 결정·확인이 필요한 사항

| #   | 항목                     | 내용                                                                                                | 제안                                                                                                   |
| --- | ------------------------ | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| 1   | **시뮬레이션 비교 화면** | V2에 비교 API가 **없다**. `/simulation/compare` 는 V1 `selectedType` 기반이었다                     | 클라이언트에서 `POST /reports` 를 2회 호출해 나란히 렌더. 별도 API 요청 불필요                         |
| 2   | **시뮬레이션 공유**      | V2 `share-links` 의 `ShareTargetType` 5종에 **시뮬레이션이 없다**. `/share/[token]`(V1)은 동작 불가 | 이번 범위에서 제외하고 라우트 제거 또는 안내 유지. 필요하면 BE에 `SIMULATION_REPORT` 타입 추가 요청    |
| 3   | **지원 업종 30종 목록**  | 시뮬레이션 지원 업종을 조회하는 **API가 없다**. 미지원 업종 선택 시 `SIMULATION_001` 404            | ⓐ BE에 목록 API 요청(권장) / ⓑ `simulation-seed.sql` 의 30종을 FE 상수화(연도 갱신 시 드리프트 위험)   |
| 4   | **자치구 25개 코드**     | 시뮬레이션 자치구 선택 UI의 코드 원천                                                               | 기존 `/regions` 계열 또는 `status` 에서 쓰는 자치구 목록 재사용 가능한지 확인                          |
| 5   | **시뮬레이션 이력 삭제** | 삭제 API 없음 (BE 후속 과제로 명시)                                                                 | 목록에 삭제 버튼 미노출. BE 후속 시 추가                                                               |
| 6   | **블루오션 표시 정책**   | §4.2-4, §4.2-5 (선택 업종 중복 / 행정동 대형 업종 잠식)                                             | 브레인스토밍에서 문구와 함께 결정                                                                      |
| 7   | **작업 순서**            | 4건을 어떤 순서·어떤 브랜치 단위로 쪼갤지                                                           | P0(에러 규약) → P1(블루오션) → P1(보관함+공유) → P2(시뮬레이션). 시뮬레이션은 명세→구현 2 PR 분리 권장 |

---

## 6. 참고

- 백엔드 문서
  - `backend/docs/simulation-frontend-guide.md` — 시뮬레이션 화면 플로우·필드 매핑·에러표 (**정본**)
  - `backend/docs/simulation-data-sources.md` — 데이터 출처·기준 연도 관리
  - `backend/docs/api-reference.md` "오류 처리 규약" — 404 vs 5xx (**정본**)
  - `backend/docs/share-link-frontend-guide.md` "분석 보관함" 섹션
  - `backend/docs/services/commercial-service.md` — 블루오션 산식, 시뮬레이션 산식
- FE 문서
  - `frontend/docs/features/simulation/simulation.md` — 현재 "V2 계약 대기" 상태, 갱신 대상
  - `frontend/docs/runbook/deployment.md` — 신규 배포 런북
  - `frontend/docs/api/openapi/` — Swagger 스냅샷 **갱신 필요** (2026-08-07 기준, 신규 API 미반영)
- 로컬 상태
  - `develop` 워크트리: `.worktrees/bosspick-develop` (HEAD `195fc1f`, clean)
  - 테스트: `pnpm test` → 107 files / 786 tests **통과**
