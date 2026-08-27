# 2026-08 백엔드 동기화 대응 — FE 작업 명세 (워크트리 병렬 실행)

> **작성일**: 2026-08-26
> **기준 커밋**: `origin/develop` `65db365` (최초 작성 시 `195fc1f` → 08-26 중 2커밋 추가됨, §8 참고)
> **선행 조사**: `docs/superpowers/specs/2026-08-26-be-sync-fe-worklist.md`
> **상태**: 진행 중 — §6 결정 6건 확정, `#0` 완료(`099863c`), `#1`~`#4` 착수

[[_TOC_]]

---

## 0. 이 문서의 사용법

- 작업 단위는 **`#0` ~ `#4`**, 각 단위는 **워크트리 1개 = 브랜치 1개 = PR 1개**다.
- 하위 태스크는 **`#N-M`** 으로 번호를 매겼다. 커밋 메시지·PR 본문·에이전트 지시에 이 번호를 그대로 쓴다.
- **§2 파일 소유권 표가 병렬 실행의 계약이다.** 자기 소유가 아닌 파일을 건드려야 하면 멈추고 조율한다.
- 각 단위의 완료 조건은 예외 없이 `pnpm test` + `pnpm qa:verify` 통과다.

### 에이전트 배치

| 단계        | 에이전트             | 비고                                                        |
| ----------- | -------------------- | ----------------------------------------------------------- |
| 명세        | `fe-spec-writer`     | `docs/features/**` 갱신이 필요한 단위(#3·#4)만              |
| 계약 확인   | `fe-api-contract`    | 신규 API를 붙이는 단위(#2·#3·#4) 착수 직후 1회, PR 직전 1회 |
| 구현        | `fe-implementer`     | 전 단위                                                     |
| 테스트      | `fe-test-author`     | 전 단위 (#0·#1은 테스트가 작업의 절반)                      |
| 코드 리뷰   | `fe-reviewer`        | PR 직전                                                     |
| 디자인 리뷰 | `fe-design-reviewer` | 새 UI가 생기는 단위(#2·#3·#4)                               |

---

## 1. 실행 순서와 의존성

```
#0 공통 에러 유틸  ──(머지)──┬─→ #1 분석·구별현황 오류 규약 적용
                              ├─→ #2 상권 추천 (블루오션 + 오류 분기)
                              ├─→ #3 분석 보관함 + V2 공유 링크
                              └─→ #4 창업 시뮬레이션 V2
                                     └ #4-0 명세 갱신 → #4-1…(구현)
```

- **`#0` 만 순차다.** 작고(파일 5개) 나머지 넷이 전부 의존하므로 **먼저 단독 PR로 올린다.**
- `#0` 이 develop 에 머지되기 전에 병렬을 시작해야 하므로, `#1`~`#4` 는 `origin/develop` 이 아니라
  **`#0` 브랜치 tip(`099863c`)에서 분기**했다(스택 PR). `#0` 이 develop 에 머지되면 각 브랜치를
  `git rebase origin/develop` 으로 정리한다. **PR 머지 순서는 `#0` 이 먼저다.**
- 그 위에서 `#1`~`#4` 는 **완전 병렬**. 서로 파일이 겹치지 않는다.
- `#4` 는 규모가 커서 내부적으로 **명세(`#4-0`) → 구현** 2 PR로 쪼갠다.
- `#0` 을 기다리기 싫으면 `#4-0`(명세)과 `#3-1`(payload 빌더 설계)은 `#0` 과 무관하므로 먼저 시작해도 된다.

---

## 2. 파일 소유권 (병렬 실행 계약)

| 경로                                                                                                                                                                                                                                                                     | 소유   | 비고                           |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ | ------------------------------ |
| `src/lib/api/api-error.ts` (신규), `src/lib/api/response.ts`                                                                                                                                                                                                             | **#0** | 머지 후 read-only              |
| `src/components/analysis/analysis-result-section.tsx`, `analysis-selection-panel.tsx`                                                                                                                                                                                    | **#1** |                                |
| `src/components/status/**`                                                                                                                                                                                                                                               | **#1** |                                |
| `src/components/recommend/**`, `src/types/recommend.ts`, `src/types/map.ts`, `src/lib/api/recommend.ts`                                                                                                                                                                  | **#2** |                                |
| `src/components/analysis/analysis-result-view.tsx`                                                                                                                                                                                                                       | **#3** | #1은 이 파일을 건드리지 않는다 |
| `src/lib/share/**`(신규), `src/lib/api/share.ts`, `src/types/bookmark.ts`, `src/components/profile/profile-analysis-bookmarks-page.tsx`, `app/(shell)/share/**`, `app/(shell)/profile/bookmarks/analysis/**`                                                             | **#3** |                                |
| `src/types/simulation.ts`, `src/lib/api/simulation.ts`, `src/components/simulation/**`, `app/(shell)/simulation/**`, `app/(shell)/analysis/simulation/**`, `app/(shell)/profile/bookmarks/simulation/**`, `src/components/profile/profile-simulation-bookmarks-page.tsx` | **#4** |                                |
| `docs/features/simulation/**`                                                                                                                                                                                                                                            | **#4** |                                |
| `docs/features/share/**`, `docs/features/profile/**`                                                                                                                                                                                                                     | **#3** |                                |

> ⚠️ **공용 주의 파일**: `src/lib/format.ts`, `DESIGN.md`, `docs/features/_index.md` 는 누구나 만질 수 있으니
> **append-only로만 수정**하고(기존 줄 재배치 금지), 충돌 나면 각자 다시 붙인다.

---

## 3. 워크트리 셋업

```bash
cd /Users/seonghoho/Documents/projects/nowdoboss/BossPickSeoul
git fetch origin

# #0 — develop 에서 분기
git worktree add ../.worktrees/bosspick-apierror -b feature/fe/api-error-contract origin/develop

# #1~#4 — #0 tip 에서 분기 (스택). #0 머지 후 rebase 한다.
git worktree add ../.worktrees/bosspick-errorui    -b feature/fe/error-ui-404             feature/fe/api-error-contract
git worktree add ../.worktrees/bosspick-blueocean  -b feature/fe/recommend-blue-ocean     feature/fe/api-error-contract
git worktree add ../.worktrees/bosspick-bookmark   -b feature/fe/analysis-bookmark-share  feature/fe/api-error-contract
git worktree add ../.worktrees/bosspick-simulation -b feature/fe/simulation-v2            feature/fe/api-error-contract
```

각 워크트리에서:

```bash
cp BossPickSeoul/frontend/.env.local <worktree>/frontend/.env.local
cd <worktree>/frontend && pnpm install
```

| 단위 | 워크트리              | 브랜치                               | dev 포트 |
| ---- | --------------------- | ------------------------------------ | -------- |
| #0   | `bosspick-apierror`   | `feature/fe/api-error-contract`      | 5174     |
| #1   | `bosspick-errorui`    | `feature/fe/error-ui-404`            | 5175     |
| #2   | `bosspick-blueocean`  | `feature/fe/recommend-blue-ocean`    | 5176     |
| #3   | `bosspick-bookmark`   | `feature/fe/analysis-bookmark-share` | 5177     |
| #4   | `bosspick-simulation` | `feature/fe/simulation-v2`           | 5178     |

`#1`~`#4` 는 `#0` tip 에서 분기했으므로 유틸을 이미 갖고 있다. `#0` 이 develop 에 머지되면 각각 `git rebase origin/develop`.

---

## 4. 작업 단위

### `#0` 공통 API 에러 분류 유틸 — 선행 슬라이스 ✅ 완료 (`099863c`)

> **규모** 소 · **의존** 없음 · **후행** #1 #2 #3 #4 전부

**배경**: 백엔드가 오류 처리 규약을 확정했다(`backend/docs/api-reference.md`). **클라이언트는 에러코드 목록을 관리하지 않고 HTTP 상태만으로 UI를 분기**한다. 현재 FE에는 이 분류가 아예 없어 모든 실패에 "다시 시도"가 붙는다.

| #        | 태스크           | 내용                                                                                                                                                                            |
| -------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **#0-1** | 에러 정규화 함수 | `src/lib/api/api-error.ts` 신설. axios 에러/응답을 받아 `{ kind, status, code, message }` 로 정규화. `kind: 'network' \| 'server' \| 'not-found' \| 'client' \| 'unauthorized'` |
| **#0-2** | 분기 규칙        | 무응답·타임아웃 → `network` / 5xx → `server` / 404 → `not-found` / 401·403 → `unauthorized` / 그 외 4xx → `client`                                                              |
| **#0-3** | 메시지 우선순위  | `dataHeader.resultMessage` 를 최우선으로 쓴다. 객체형(`{message, errors[]}`)이면 `errors[]` 를 필드별로 꺼낼 수 있게 노출. 없을 때만 kind별 기본 문구                           |
| **#0-4** | 재시도 가능 판정 | `isRetryable(kind)` → `network`·`server` 만 `true`. **UI는 이 함수로만 재시도 버튼을 결정한다**                                                                                 |
| **#0-5** | 기존 헬퍼 정리   | `src/lib/api/response.ts` 의 `getApiMessage` 기본 문구가 "잠시 후 다시 시도해 주세요."로 고정돼 있다. 404에 이 문구가 새지 않도록 조정                                          |
| **#0-6** | 테스트           | `api-error.test.ts` — 상태별 kind 매핑, resultMessage 우선, `isRetryable` 진리표, errors[] 파싱                                                                                 |

**완료 조건**

- `pnpm test` / `pnpm qa:verify` 통과
- UI 변경 **없음** (순수 유틸 + 테스트 PR)
- PR 본문에 `#1`~`#4` 에서 이 유틸을 어떻게 쓰는지 사용 예 1개 포함

**실제 결과** (`099863c`, 108 files / 807 tests 통과, `qa:verify` 통과)

계획 대비 달라진 점 2가지:

1. **`resolveApiError({error, data})` 를 추가했다.** 이 저장소 화면들은 두 경로로 실패한다 —
   axios rejection(`query.isError`)과 "200 + `dataHeader.success=false`" 본문(`isResponseError(query.data)`).
   `analysis-result-view.tsx` 가 이 두 조건을 20곳 넘게 OR 로 반복하고 있어, 한 함수로 흡수했다.
2. **`#0-5` 는 축소했다.** `getApiMessage` 의 기본 문구를 바꾸면 호출부 20여 곳의 동작이 함께 바뀐다.
   대신 **실제 결함**을 고쳤다 — `src/types/api.ts` 의 `ApiMessage` 가 `Record<string,string>` 이라
   검증 실패 응답의 실제 형태(`{message, errors:[{code,field,message}]}`)를 표현하지 못했고,
   그 탓에 `Object.values(...).join('\n')` 이 `errors` 배열을 **`[object Object]`** 로 렌더하고 있었다.
   화면별 문구 조정은 `#1` 이 담당한다.

추가 산출물: `retryUnlessClientError(max)` — React Query `retry` 옵션용. 404 를 재시도하지 않는다.

---

### `#1` 상권분석·구별현황 오류 UI 규약 적용

> **규모** 소~중 · **의존** #0 · **소유** `components/analysis/{result-section,selection-panel}`, `components/status/**`

**배경**: 404(데이터 부재)에 "다시 시도"를 띄우면 사용자는 눌러도 같은 결과를 받는다. 백엔드가 이미 **"해당 분기의 매출 데이터가 없습니다. 다른 분기를 선택해 주세요."** 같은 행동 유도 문구를 내려주는데 FE가 이를 덮어쓰고 있다.

| #        | 태스크                                    | 내용                                                                                                                                                                                |
| -------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **#1-1** | `analysis-result-section.tsx`             | `error: boolean` → `#0` 의 정규화 에러를 받도록 프롭 확장. `not-found` 면 **재시도 버튼 미렌더 + 서버 `resultMessage` 그대로 노출**. `network`/`server` 는 현행 유지 (`:82`, `:91`) |
| **#1-2** | `analysis-selection-panel.tsx`            | 동일 규칙 적용 (`:436`, `:444`)                                                                                                                                                     |
| **#1-3** | `status-feedback.tsx` / `status-page.tsx` | 동일 규칙 적용 (`:119`, `:122`, `:408`, `:411`)                                                                                                                                     |
| **#1-4** | 분기 전환 유도                            | `not-found` 일 때 결과뷰의 기간(분기) 드롭다운으로 시선을 보낸다. 스크롤 앵커 또는 포커스 이동 중 택1 (과하면 안내 문구만)                                                          |
| **#1-5** | 호출부 배선                               | 각 화면의 React Query `error` 를 `#0` 유틸로 통과시켜 컴포넌트에 전달. `useQuery` 의 `retry` 옵션도 `not-found` 면 재시도하지 않도록 조정                                           |
| **#1-6** | 테스트                                    | 기존 `analysis-result-section.test.ts:25` 는 "다시 시도" 존재를 단언한다 → **404 케이스 추가 + 기존 케이스는 5xx로 명시**. status 계열 테스트도 동일                                |

**완료 조건**

- 404에서 재시도 버튼이 **없고** 서버 문구가 그대로 보인다 (테스트로 고정)
- 5xx·무응답에서는 재시도 버튼이 **있다**
- `pnpm test` / `pnpm qa:verify` 통과

---

### `#2` 상권 추천 — 블루오션 업종 노출 + 오류 분기

> **규모** 중 · **의존** #0 · **소유** `components/recommend/**`, `types/recommend.ts`, `types/map.ts`, `lib/api/recommend.ts`

**배경**: 백엔드가 `GET /commercials/recommendations/by-service` 응답 각 후보에 `blueOceanCategories`(Top5)를 추가했다. 또한 데이터 없는 상권 때문에 추천 전체가 404로 죽던 버그가 고쳐져 이제 **부분 성공**(`compositeScore: null`)이 정상 응답으로 내려온다.

| #        | 태스크              | 내용                                                                                                                                                                                                          |
| -------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **#2-1** | 타입 추가           | `types/recommend.ts` 에 `BlueOceanCategory { serviceCode, serviceName, commercialStoreCount, administrationStoreCount, storeRate }` + `CandidateCommercial.blueOceanCategories?: BlueOceanCategory[] \| null` |
| **#2-2** | 결과 리스트 섹션    | `recommend-result-list.tsx` 선택 상세(`<Details>`, `:460~`)에 블루오션 섹션 추가. 표기: `업종명 · 상권 N곳 / 행정동 M곳 (X%)`. **낮을수록 기회**라는 방향을 문구로 명시                                       |
| **#2-3** | 빈 상태             | `null` 또는 빈 배열이면 **섹션 자체를 렌더하지 않는다** (산정 실패는 빈 목록으로 강등되는 계약)                                                                                                               |
| **#2-4** | 모바일 시트         | `recommend-mobile-sheet.tsx` 동일 반영                                                                                                                                                                        |
| **#2-5** | null 점수 표기 정정 | `formatScore` 의 `'집계 중'`(`:228~231`)은 이제 **"지표 데이터 없음"** 을 뜻한다 → 문구 정정 + 해당 카드에 상태 배지                                                                                          |
| **#2-6** | 오류 분기           | `recommend-map.tsx:916`, `recommend-page.tsx:1004`, `recommend-result-list.tsx:369` 의 재시도 UI에 `#0` 유틸 적용                                                                                             |
| **#2-7** | topN 가드           | `RECOMMENDATION_TOP_N` 은 **5~30만 허용**(`COMMERCIAL_101`). 상수에 범위 주석, 조정 UI를 넣는다면 clamp                                                                                                       |
| **#2-8** | V1 잔재 정리        | `types/map.ts:47` 의 미사용 `blueOceanInfo` 제거 (사용처 grep 확인 후)                                                                                                                                        |
| **#2-9** | 테스트              | 블루오션 렌더/미렌더, null 점수 표기, 404 재시도 버튼 미노출                                                                                                                                                  |

**결정 필요** → §6-4, §6-5

**완료 조건**

- 블루오션 5건이 실데이터로 렌더되고, 없으면 섹션이 사라진다
- `fe-design-reviewer` 로 모바일/태블릿/데스크톱 확인 (긴 업종명 오버플로 주의)
- `pnpm test` / `pnpm qa:verify` 통과

---

### `#3` 분석 보관함 + V2 공유 링크

> **규모** 중~대 · **의존** #0 · **소유** `lib/share/**`, `lib/api/share.ts`, `types/bookmark.ts`, `components/profile/**`, `components/analysis/analysis-result-view.tsx`, `app/(shell)/share|profile/bookmarks/analysis`

**배경**: 백엔드에 분석 화면 보관함(`/api/v1/analysis-bookmarks`)이 신설됐다. 이건 **공유 링크(`/api/v1/share-links`)와 payload·shareType 계약이 완전히 동일**하고, FE는 **공유 링크 V2도 아직 미연동**이다(현재 "공유"는 `analysis-result-view.tsx:975~` 에서 현재 URL 복사만 한다). 두 기능은 payload 빌더를 공유하므로 한 슬라이스로 묶는다.

| #         | 태스크           | 내용                                                                                                                                                                                                                      |
| --------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **#3-0**  | 명세             | `docs/features/share/` 신설 — payload 계약, 라우트 복원 규칙, 보관함 UX. 근거: `backend/docs/share-link-frontend-guide.md`                                                                                                |
| **#3-1**  | payload 빌더     | `src/lib/share/payload.ts` — `shareType` 5종(`COMMERCIAL_ANALYSIS`·`DISTRICT_ANALYSIS`·`ADMINISTRATION_ANALYSIS`·`COMMERCIAL_COMPARISON`·`AI_REPORT`)별 **최소 상태**만 담는 payload 생성. **2000자 제한**, key 순서 무관 |
| **#3-2**  | 복원 빌더        | `src/lib/share/routes.ts` — `ROUTE_BUILDERS[shareType](payload) → URL`. #3-1의 역함수. 라운드트립 테스트로 고정                                                                                                           |
| **#3-3**  | 공유 링크 API    | `POST /share-links` 연동. `lib/api/share.ts` 를 V1(`/share`)에서 V2로 교체                                                                                                                                                |
| **#3-4**  | 공유 진입 라우트 | `/s/{shareCode}` → `GET /share-links/{shareCode}` → `ROUTE_BUILDERS` → `router.replace`. **만료 410 / 미존재 404** 각각 별도 안내                                                                                         |
| **#3-5**  | 보관 API         | `src/lib/api/analysis-bookmark.ts` — POST/GET/PATCH/DELETE. **`bookmarkId` 는 `string` 타입 고정, 숫자 변환 금지**                                                                                                        |
| **#3-6**  | 보관 버튼        | `analysis-result-view.tsx` 공유 버튼 옆에 "보관". 비로그인은 로그인 유도(기존 `getCommercialBookmarkLoginHref` 패턴 재사용)                                                                                               |
| **#3-7**  | 중복 저장 처리   | 409 `ANALYSIS_BOOKMARK_002` → "이미 저장됨" 토스트. `dataBody.existingBookmarkId`(문자열, 드물게 null)로 **해제 토글** 구현                                                                                               |
| **#3-8**  | 상한 처리        | 400 `ANALYSIS_BOOKMARK_006`(기본 100개) → `resultMessage` 그대로 안내                                                                                                                                                     |
| **#3-9**  | 보관함 화면      | `profile/bookmarks/analysis` 를 **[지역 북마크 / 화면 보관함]** 2탭으로 확장. 화면 보관함은 `shareType` 필터 탭 + 이름 수정(PATCH) + 삭제(DELETE)                                                                         |
| **#3-10** | 즉시 라우팅      | 목록 응답에 payload가 그대로 오므로 **해석 API 호출 없이** 클릭 즉시 `ROUTE_BUILDERS` 로 이동                                                                                                                             |
| **#3-11** | 테스트           | payload 라운드트립, `bookmarkId` 문자열 보존, 409/400 분기, 만료 410 안내                                                                                                                                                 |

**주의**: 자치구/행정동/상권 **엔티티** 즐겨찾기(auth-service `/members/me/bookmarks`)와 **역할이 다르다.** 보관함은 "조건까지 포함한 화면 상태"다. 화면에서 두 개념이 섞이지 않게 라벨을 분명히 한다.

**완료 조건**

- 분석 화면 → 보관 → 프로필 보관함 → 클릭 → 원래 조건 그대로 복원되는 왕복이 실제로 동작
- 공유 링크 발급 → `/s/{code}` 진입 → 복원 왕복이 동작
- `pnpm test` / `pnpm qa:verify` 통과

---

### `#4` 창업 비용 시뮬레이션 V2 (placeholder 해제)

> **규모** 대 · **의존** #0, §6-1~§6-3 결정 · **소유** `types/simulation.ts`, `lib/api/simulation.ts`, `components/simulation/**`, `app/(shell)/simulation/**`, `app/(shell)/analysis/simulation/**`, 시뮬 북마크

**배경**: 백엔드에 시뮬레이션 도메인이 신설되어 `/api/v1/simulations/**` 가 살아 있다(dev 실호출 확인). FE는 현재 6개 라우트가 전부 `SimulationUnavailablePage` placeholder이고, `lib/api/simulation.ts` 는 **V1 경로**를 호출한다. 기존 명세 `docs/features/simulation/simulation.md` 는 "V2 계약 대기" 상태다.

**PR 분리**: `#4-0` 명세 1 PR → `#4-1`~`#4-9` 구현 1~2 PR.

| #        | 태스크              | 내용                                                                                                                                                                                                                                                                                   |
| -------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **#4-0** | 명세 갱신           | `docs/features/simulation/simulation.md` S0 as-is/to-be 를 V2 기준으로 재작성 + 세부명세(D0~D8) 신설. 근거: `backend/docs/simulation-frontend-guide.md`. `fe-spec-writer` 사용                                                                                                         |
| **#4-1** | 타입 전면 교체      | `types/simulation.ts` V1→V2. 필드가 거의 다 바뀐다 (아래 매핑표)                                                                                                                                                                                                                       |
| **#4-2** | API 클라이언트 교체 | `/simulations/store-sizes`, `/simulations/franchisees`, `/simulations/reports`, `/simulations/histories`. **동기 계산**이므로 폴링·SSE 없음                                                                                                                                            |
| **#4-3** | 입력 마법사         | ① 프랜차이즈 여부 → ② 자치구(districtCode) → ③ **업종(serviceCode)** → ④ 매장 크기·층. **업종이 브랜드 검색보다 앞서야 한다**(검색이 `serviceCode` 필수)                                                                                                                               |
| **#4-4** | 브랜드 검색         | `keyword` 부분일치 + `lastId` 커서 무한스크롤(최대 10건/페이지). 선택한 `franchiseeId` 를 계산 요청에 사용                                                                                                                                                                             |
| **#4-5** | 매장 크기           | `store-sizes` 의 소/중/대를 **프리셋 버튼**으로 제시하되 직접 입력도 허용(임의 양수). 층은 `FIRST_FLOOR`/`OTHER`                                                                                                                                                                       |
| **#4-6** | 리포트 화면         | 헤드라인 `totalPrice`(만원) / 비용구성 `costDetail`(`levy` null이면 항목 제외) / 권리금 카드(**총비용 미포함** 명시) / 유사 프랜차이즈 Top5 / 성별·연령 / 성수기 배지                                                                                                                  |
| **#4-7** | 기준연도·null 처리  | `dataBaseYear` 안내문 **"2024년 기준 데이터로 계산된 결과입니다"** 상시 노출. `genderAgeAnalysis`·`seasonAnalysis` 가 `null` 이면 **에러가 아니라 섹션 숨김**                                                                                                                          |
| **#4-8** | 저장·목록           | 비로그인도 계산 가능, **"저장" 버튼에서만 로그인 유도**(AI 리포트식 전체 잠금 아님). `profile/bookmarks/simulation` placeholder 해제, `dataBaseYear` 표시. **삭제 API 없음 → 삭제 버튼 미노출**                                                                                        |
| **#4-9** | 에러 처리           | 도메인 오류 `SIMULATION_001~004`, 필드 검증 `SIMULATION_101~109`, 검증 폴백·타입 불일치는 공통 `COMMERCIAL_100`/`COMMERCIAL_102`. `#0` 유틸 재사용. 404 3종은 각각 다른 유도(업종 제한 / 자치구 안내 / 브랜드 재선택) ⚠️ **08-26 변경 반영** — `SIMULATION_100`/`101` 은 삭제됐다 (§8) |

**V1 → V2 필드 매핑 (`#4-1` 근거)**

| V1                              | V2                                    | 비고                                                                          |
| ------------------------------- | ------------------------------------- | ----------------------------------------------------------------------------- |
| `isFranchisee`                  | `franchisee`                          |                                                                               |
| `brandName`(요청)               | `franchiseeId`                        | 문자열 → 아이디                                                               |
| `gugun`                         | `districtCode`                        | 코드명 → 코드                                                                 |
| `floor: string`                 | `floorType: 'FIRST_FLOOR' \| 'OTHER'` | 응답에서는 `{code,name,description}`                                          |
| `serviceCodeName`               | `serviceName`                         |                                                                               |
| `detail`                        | `costDetail`                          |                                                                               |
| `keyMoneyInfo.keyMoney`         | `keyMoney.keyMoneyAverage`            |                                                                               |
| `franchisees`                   | `similarFranchisees`                  | `franchiseeId` 추가                                                           |
| `genderAndAgeAnalysisInfo`      | `genderAgeAnalysis`                   | `first/second/third` → **`topAgeGroups[]`**, `maleSalesPercent`→`malePercent` |
| `monthAnalysisInfo.peakSeasons` | `seasonAnalysis.peakMonths`           |                                                                               |
| —                               | `dataBaseYear`                        | **신규, 노출 필수**                                                           |
| —                               | `condition`                           | 요청 조건 + 조회된 명칭(자치구명/업종명/브랜드명)                             |
| `"월 최소 목표 매출"`           | **제거**                              | V1의 보증금 오표시 필드. 되살리지 않는다                                      |

**완료 조건**

- 6개 라우트에서 placeholder가 사라지고 실제 계산·저장이 동작
- `fe-api-contract` 로 타입 ↔ Swagger 대조 통과
- `fe-design-reviewer` 로 리포트 화면 3개 뷰포트 확인
- `pnpm test` / `pnpm qa:verify` 통과

---

## 5. 범위 밖 (이번에 하지 않는다)

- `frontend/docs/api/openapi/` 스냅샷 갱신 — 별도 잡무 PR. 신규 API 미반영 상태(2026-08-07 기준)
- **지원 정책 추천**(`GET /api/v1/policies`) — 08-26 develop 에 머지되어 API 는 살아 있으나
  **실데이터 수집이 여전히 블로커라 응답이 빈 목록**이다(dev 실호출 확인: `{"districtCode":"11740","serviceCategoryCode":"CS1","policies":[]}`).
  데이터가 채워지면 별도 단위로 다룬다.
- 시뮬레이션 이력 **삭제** — BE에 API 없음
- BE 패키지 리네임(`nowdoboss`→`bosspickseoul`) 관련 FE 대응 — **없음**(내부 변경)

---

## 6. 착수 전 결정 사항

| #       | 항목                                      | 선택지                                                                                                         | 추천                                                                                                                                 | 차단하는 작업  |
| ------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------------- |
| **6-1** | 시뮬레이션 비교 화면                      | ⓐ `POST /reports` 2회 호출해 클라이언트에서 나란히 비교 / ⓑ 이번 범위 제외 / ⓒ BE에 비교 API 요청              | **ⓐ** — V2에 비교 API가 없고, 계산이 공개·동기라 2회 호출이 자연스럽다                                                               | `#4-3`, `#4-6` |
| **6-2** | 시뮬레이션 공유                           | ⓐ 범위 제외 + `/share/[token]`(V1) 제거 / ⓑ BE에 `ShareTargetType.SIMULATION_REPORT` 추가 요청                 | **ⓐ** — `ShareTargetType` 5종에 시뮬이 없다. 죽은 라우트를 남기는 게 더 나쁘다                                                       | `#4-8`, `#3-4` |
| **6-3** | 지원 업종 30종 목록                       | ⓐ BE에 목록 API 요청(차단) / ⓑ 시드 기준 FE 상수화 + BE 후속 요청 병행                                         | **ⓑ** — 목록 API를 기다리면 가장 큰 작업이 멈춘다. 상수 + `store-sizes` 404 폴백 안내로 드리프트를 흡수하고, BE 요청은 별도로 올린다 | `#4-3`         |
| **6-4** | 블루오션에 **선택한 업종**이 다시 나올 때 | ⓐ 그대로 노출 / ⓑ 제외 / ⓒ 노출하되 "선택 업종" 배지                                                           | **ⓒ** — "이 상권은 그 업종이 덜 찼다"는 유효한 정보라 버리기 아깝다. 다만 배지 없이는 혼란                                           | `#2-2`         |
| **6-5** | 행정동 대형 업종 잠식                     | 실측상 부동산중개업(158곳)·전자상거래업(265곳)처럼 행정동 점포수가 큰 업종이 낮은 `storeRate` 로 상위를 먹는다 | **그대로 노출 + 문구로 방향 설명.** 필터는 기준을 정당화하기 어렵고, 백엔드 산식을 FE가 재해석하는 셈이 된다                         | `#2-2`         |
| **6-6** | `#4` PR 분할                              | ⓐ 명세 1 + 구현 1 / ⓑ 명세 1 + 입력 1 + 리포트/저장 1                                                          | **ⓑ** — `#4` 는 diff가 커서 한 PR이면 리뷰가 불가능해진다                                                                            | `#4` 전체      |

---

## 7. 참고

- 조사 보고서: `docs/superpowers/specs/2026-08-26-be-sync-fe-worklist.md`
- 백엔드 정본: `backend/docs/simulation-frontend-guide.md`, `backend/docs/api-reference.md`("오류 처리 규약"), `backend/docs/share-link-frontend-guide.md`, `backend/docs/services/commercial-service.md`
- FE 규칙: `frontend/docs/engineering/`(routing / client-boundary / data-fetching / styling / code-style), `frontend/DESIGN.md`
- Swagger: `https://api-dev.bosspickseoul.com/swagger-ui/index.html`

## 8. 기준선 이동 기록

이 문서를 작성한 뒤 `origin/develop` 이 `195fc1f` → `65db365` 로 2커밋 움직였다. 영향은 다음과 같다.

| 커밋      | 내용                                                                                 | 이 계획에 미치는 영향                                                                 |
| --------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| `6a87ff6` | 지원 정책 추천 도메인 구현 (`GET /api/v1/policies`)                                  | **없음** — 데이터가 비어 있어 §5 범위 밖                                              |
| `65db365` | API 검증 규약 정리                                                                   | **`#4-9` 정정** — `SIMULATION_100`/`101` 삭제, 필드 검증 `SIMULATION_101~109` 로 재편 |
| `65db365` | 커뮤니티 목록 3종·인기순위 `size` 를 1~50 으로 제한 (`COMMUNITY_119`, `RANKING_101`) | **없음** — FE 가 범위를 벗어난 `size` 를 보내는 곳이 없음을 grep 으로 확인            |
| `65db365` | 문서 갱신                                                                            | `backend/docs/simulation-frontend-guide.md` 의 에러표가 이미 새 코드로 갱신됨         |

`#0` 은 이 이동의 영향을 받지 않는다(HTTP 상태 기반 분기라 에러코드 재편과 무관 — 규약이 의도한 바가 이것이다).

---

## 변경 이력

| 일자       | 내용                                                                                                                  |
| ---------- | --------------------------------------------------------------------------------------------------------------------- |
| 2026-08-26 | 최초 작성 (develop `195fc1f` 기준)                                                                                    |
| 2026-08-26 | §6 결정 6건 확정, `#0` 완료(`099863c`), `#1`~`#4` 착수. 기준선 `65db365` 로 이동(§8), 스택 브랜치 방식으로 §1·§3 갱신 |
