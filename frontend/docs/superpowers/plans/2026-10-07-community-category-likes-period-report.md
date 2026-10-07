# 커뮤니티 말머리(#529) · 조회수·내 좋아요(#530) · 인기 기간(#531) · 신고 사유 코드(#532) 구현 명세

> **작성일**: 2026-10-07
> **대상 이슈**: #529 · #530 · #531 · #532 (모두 `[FE] feat`)
> **선행 BE**: PR #539(#470~#473) — 2026-10-06 develop 머지, `backend-community-service` 라벨
> **정본 계약**: `backend/docs/frontend-api-usage-guide.md` 「Community」 · `backend/docs/services/community-service.md`
> (이슈 본문과 다르면 **계약이 이긴다**)
> **실행 방식**: 하위 에이전트(fe-implementer)가 커밋 단위로 순서대로 구현하고, 메인이 검토·통합한다. 쓰기 에이전트는 한 번에 하나만 돈다.

---

## 0. 전제 — dev BE 가 아직 #539 이전이다 (2026-10-07 실측)

- 라이브 `community-service/v3/api-docs` 와 `docs/api/openapi/community.json` 스냅샷(10-06 06:42Z, #539 머지 30분 전) 둘 다 새 필드가 없다.
- `GET /community/posts?period=YEAR` · `?category=BOGUS` 가 400 이 아니라 **200** 이다 → 옛 빌드가 떠 있다.
  - 추정 원인: #543(FE 스냅샷, `frontend-web`)이 27초 뒤 머지돼 develop 머리가 FE 커밋이 됐고, 배포 게이트가 community-service 를 건너뛰었다.
- **결정(사용자, 2026-10-07)**: BE 를 먼저 배포한다(Jenkins `FORCE_DEPLOY` community-service — 사용자가 한다).
  FE 는 계약대로 `reason` 없이 `reasonCode`+`detail` 만 보낸다. **이 PR 은 dev 에 BE 가 뜬 걸 확인한 뒤 머지한다.**
  - 이유: 옛 BE 는 `reason` 이 필수라 FE 가 먼저 나가면 신고가 `COMMUNITY_110` 으로 막힌다. 나머지 셋은 순서와 무관하다(옛 BE 는 `category`·`period` 를 무시하고, 없는 `liked`·`viewCount` 는 그리지 않으면 된다).
- 따라서 브라우저 검증은 `?mock=1` 소스와 e2e 고정 응답으로 한다. 실데이터 확인은 BE 배포 뒤 따로 한다.
- BE 배포 뒤 `node frontend/scripts/sync-openapi.mjs` 로 스냅샷을 다시 뜬다(이 PR 의 마지막 커밋 또는 후속).

---

## 1. 정한 것 (재논의하지 않는다)

| #   | 쟁점                        | 결정                                                                                                                                                                                                                           | 근거                                                                                                                                                         |
| --- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | 말머리 선택 UI(#529)        | 글쓰기에 **말머리 칩 행을 따로** 둔다. 질문 · 경험 공유 · 같이 해요 · 동네 소식 단일 선택, 다시 누르면 해제(말머리 없음). 수정 화면에서도 바꿀 수 있다                                                                         | 사용자 결정. 작성 도움 칩은 본문이 비었을 때만 보여 말머리 선택 수단이 될 수 없다                                                                            |
| 2   | 작성 도움 칩(#456)          | 본문 틀 삽입은 그대로 둔다. **말머리가 비어 있을 때만** 대응 말머리(question→QUESTION 등)를 같이 골라 준다. 이미 고른 말머리는 덮지 않는다                                                                                     | 사용자 결정. 계약의 칩→code 매핑표                                                                                                                           |
| 3   | 인기 기간(#531)             | 인기 탭에 **기간 칩**(이번 주 · 이번 달 · 전체 기간)을 둔다. URL `period`, 기본 `WEEK`(URL 에서 생략). 우 레일은 「이번 주 인기 글」 + `period=WEEK` 고정                                                                      | 사용자 결정                                                                                                                                                  |
| 4   | 목록 좋아요(#530)           | **표시만** 한다. `liked === true` 면 하트를 채운다. 행 안에 토글 버튼을 넣지 않는다                                                                                                                                            | 사용자 결정. 행 전체가 상세 링크라 버튼을 넣으면 중첩 인터랙션이 된다                                                                                        |
| 5   | 토큰 부착(#530)             | **새 코드 없음.** BFF(`app/api/bff/[...path]/route.ts`)가 이미 세션이 있을 때만 `Authorization` 을 붙이고, 재발급 실패 시 세션을 지운 뒤 익명으로 보낸다                                                                       | 이슈의 「비로그인이면 토큰을 보내지 않는다」를 이미 만족한다                                                                                                 |
| 6   | 캐시(#530)                  | BFF `forward` 의 `fetch` 에 `cache: 'no-store'` 를 **명시**한다(Next 16 기본값과 같지만 의도를 코드에 남긴다). React Query 는 아래 #7                                                                                          | 이슈 「Next data cache·공유 캐시에 들어가지 않게」                                                                                                           |
| 7   | 조회자별 응답과 React Query | 목록·인기 레일·상세·관련 글 쿼리 키에 **조회자 구분(`memberId` 또는 `'anonymous'`)** 을 넣는다. 공개 쿼리는 auth hydrate 뒤에 시작한다(이미 그렇다면 유지)                                                                     | `staleTime` 기본 5분(`query-provider.tsx`) — 로그아웃·로그인 뒤 남의 `liked` 가 5분 남는다. liked 탭 키에 member 를 붙인 선례(`createCommunityListQueryKey`) |
| 8   | 오류 분기(#532)             | 신고 오류는 **`resultCode` 로** 안내 위치를 정한다. `api-error.ts` 의 「코드로 UI 분기하지 않는다」 원칙의 **명시적 예외**로 남긴다(주석 + 명세)                                                                               | 계약: 110·123 의 `field` 가 `reasonPresent`·`etcDetailPresent` 라 입력칸을 가리키지 않는다                                                                   |
| 9   | 새 응답 필드 타입           | 타입은 계약대로 필수로 적는다(`category: … \| null`, `viewCount: number`, `liked: boolean \| null`). **렌더는 값이 없어도 깨지지 않게**(`post.category?.name`, `liked === true`) 쓴다. 응답 검증기는 새 필드를 요구하지 않는다 | 옛 BE·옛 캐시 응답에서 화면이 죽지 않게                                                                                                                      |
| 10  | PR 묶음                     | **PR 1개, 이슈별 feat 커밋 4개.** rebase merge 라 커밋이 그대로 남는다. 본문에 `close #529 #530 #531 #532`                                                                                                                     | 같은 타입·상태·목록 파일을 공유한다                                                                                                                          |

---

## 2. 커밋 순서

같은 파일(`src/types/community.ts`, `src/lib/community/community-state.ts`, `community-list-page.tsx`, `community-mock.ts`, `e2e/fixtures/community.ts`, `docs/features/community/community.md`)을 공유하므로 **순서대로** 한다. 커밋마다 vitest 가 통과해야 한다.

1. `[FE] feat: 커뮤니티 목록에 조회수와 내 좋아요를 표시하고 상세 하트를 첫 진입부터 그린다` (#530)
2. `[FE] feat: 커뮤니티 인기 글에 기간을 연결하고 우 레일을 「이번 주 인기 글」로 바꾼다` (#531)
3. `[FE] feat: 커뮤니티 글쓰기·목록·상세에 말머리를 연결한다` (#529)
4. `[FE] feat: 커뮤니티 신고가 사유 코드와 상세를 따로 보내게 바꾼다` (#532)

각 커밋은 자기 몫의 `docs/features/community/community.md` 갱신(계약 표 · 해당 절 · 테스트케이스 · 변경 이력)을 같이 담는다.

---

## 3. 커밋 1 — #530 조회수·내 좋아요

### 3-1. 타입 (`src/types/community.ts`)

- `CommunityPostSummary` 에 `viewCount: number`, `liked: boolean | null` 를 더한다. `CommunityLikedPost`(= Summary & likedAt)는 따라온다.
- `CommunityPostDetail` 에 `liked: boolean | null` 를 더한다(`viewCount` 는 이미 있다).
- `liked` 주석: `null` 은 「비로그인이라 모름」이지 「안 누름」이 아니다.

### 3-2. 쿼리 키 (결정 #7)

- `communityKeys.list` · `popular` · `detail` · `related` 에 조회자 세그먼트를 붙인다. 값은 `viewer.memberId ?? 'anonymous'`(mock 이면 mock 회원 id).
  - 이미 liked 탭에만 붙이던 `createCommunityListQueryKey` 의 `'member'` 세그먼트와 합친다 — 두 번 붙이지 않는다.
- 이 키를 `exact` 로 지우는 401 복구 경로(`recoverCommunityPublicListUnauthorized`, 상세 `recoverCommunityDetailUnauthorized`, register-page `removeQueries`)가 **새 키로 같은 쿼리를 가리키는지** 확인하고 테스트한다.
- 좋아요 토글 뒤의 캐시 갱신(`updateCommunityDetailLikeCache`, `updateCommunityRelatedLikeCache`, `refreshCommunityDetailSummaryCaches`)이 새 키에서도 맞는 항목을 고치는지 확인한다. 상세 캐시의 `liked` 도 토글 결과로 갱신한다.
- 401 복구로 비로그인이 되면 조회자 세그먼트가 `'anonymous'` 로 바뀌어 새 쿼리가 된다 — 이 동작이 무한 재시도가 되지 않는지 본다.

### 3-3. 목록 행 (`community-list-view.tsx`)

- 메타 줄(좋아요·댓글 수 옆)에 조회수를 더한다. 표기는 상세와 같은 `formatCommunityCount`. 아이콘/문구는 상세의 `조회 N` 과 맞춘다.
- 좋아요 하트: `liked === true` 면 채운 하트, 그 외(false·null·undefined)는 지금 모양. 색은 상세 하트의 「눌림」 토큰을 그대로 쓴다(새 토큰 금지).
- 스크린리더: 채운 하트일 때 「내가 좋아요한 글」이 읽히게 한다(시각 숨김 텍스트 또는 aria-label). 숫자 읽기 문구가 이미 있으면 그 결에 맞춘다.
- 우 레일 행(`community-list-rail.tsx`)은 이번에 바꾸지 않는다.

### 3-4. 상세 (`community-detail-page.tsx`)

- `postLiked` 로컬 상태를 `detail.liked` 로 시작한다. 상세 데이터가 바뀌면(다른 글로 이동·refetch) 다시 맞춘다. 토글 응답이 오면 지금처럼 그 값이 이긴다.
- `null` 이면 지금처럼 빈 하트(눌림 아님).

### 3-5. BFF (`app/api/bff/[...path]/route.ts`)

- `forward` 의 `fetch` 옵션에 `cache: 'no-store'` 를 더하고 한 줄 주석(조회자별 응답 — 결정 #6)을 단다. `route.test.ts` 에 옵션 단언을 하나 더한다.

### 3-6. mock · fixture · 테스트

- `community-mock.ts`: 요약·상세·좋아요한 글에 `viewCount`·`liked` 를 채운다. mock 회원이 좋아요한 글은 `true`, 아니면 `false`. 좋아요한 글 목록은 항상 `true`.
- `e2e/fixtures/community.ts`: 고정 응답에 두 필드를 더한다.
- 테스트: 목록 행 조회수·채운 하트(true)·빈 하트(false/null), 상세 첫 렌더 하트, 쿼리 키 조회자 세그먼트, BFF no-store.

### 3-7. 명세

- `community.md` §S4 백엔드 계약 표에 `viewCount`·`liked`(선택 인증), 목록 절에 행 메타, 테스트케이스 표에 새 CM 번호(마지막 번호 다음부터).

---

## 4. 커밋 2 — #531 인기 기간

### 4-1. 타입 · 상태

- `CommunityPopularPeriod = 'WEEK' | 'MONTH' | 'ALL'` 와 라벨 표(`이번 주` · `이번 달` · `전체 기간`)를 `src/lib/community/` 에 둔다.
- `CommunityListParams` 에 `period?: CommunityPopularPeriod`.
- `CommunityListState` 에 `period: CommunityPopularPeriod`(기본 `'WEEK'`).
  - `parseCommunityListState`: `period` 쿼리가 세 값 중 하나(대문자 정확 일치)면 그 값, 아니면 `'WEEK'`. **`view !== 'popular'` 면 항상 `'WEEK'`**(의미 없는 값을 상태에 남기지 않는다).
  - `serializeCommunityListState`: `view === 'popular' && period !== 'WEEK'` 일 때만 `period` 를 쓴다.
  - 검색어가 있거나 liked 면 기본값으로 돌린다(기존 CM-005 규칙과 같은 결).
- `createCommunityContextKey`(스크롤 복원·이웃 글 키)에 period 를 넣는다(기본값이면 키가 지금과 같게 해 기존 저장값을 깨지 않는다).
- URL 액션 유니온(`applyCommunityListUrlAction`)에 `period` 액션을 더한다. 기간을 바꾸면 상태가 바뀌고 → 쿼리 키가 바뀌어 커서가 `INITIAL_CURSOR` 부터 다시 시작한다(별도 리셋 코드 불필요 — 테스트로 확인).

### 4-2. 요청

- `createCommunityListRequest`: `sortType === 'POPULAR'` 일 때 `period` 를 싣는다(검색 인기순도 같다 — 계약상 검색에도 `period` 가 있다. 다만 검색 화면엔 칩이 없으므로 `'WEEK'`). LATEST 에는 싣지 않는다.
- `createCommunityPopularParams`(우 레일): `period: 'WEEK'` 를 명시한다.

### 4-3. UI

- 인기 탭(`view === 'popular'`)이고 검색 중이 아닐 때만 탭 행 아래에 기간 칩 행을 보인다. `aria-pressed` 버튼 그룹, `aria-label="인기 기간"`. 칩 모양은 기존 칩(지역 칩·작성 도움 칩) 스타일을 재사용한다(새 토큰 금지).
- 인기 순위 배지(1·2·3…)는 그대로.
- 우 레일 제목: `getCommunityRailPopularTitle` 을 「이번 주 인기 글」로. 대상 지역이 있을 때의 문구 규칙이 있으면 그 결을 따른다.
- 인기 탭 빈 상태 문구가 기간을 반영해야 하면(「이번 주 인기 글이 아직 없어요」 등) 맞춘다. 전체 기간은 「인기 글이 아직 없어요」.

### 4-4. mock · fixture · 테스트 · 명세

- mock `getPosts`: POPULAR 이면 `createdAt` 이 기간 안(7일·30일·전체)인 글만. fixture 는 `period` 쿼리를 받아도 unhandled 가 되지 않게.
- 테스트: parse/serialize 왕복(popular+MONTH, latest 에 period 무시, 잘못된 값), 요청 조립(POPULAR 에만 period), 레일 파라미터, 기간 변경 시 커서 처음부터, 칩 렌더 조건.
- 명세: `community.md` §S4 정렬과 커서 · 우 레일(:331~) · 테스트케이스. 제안서 `docs/superpowers/specs/2026-10-01-community-ux-renewal.md` §7 「인기 글 기간 필터」 행을 「#531 로 반영」으로 갱신.

---

## 5. 커밋 3 — #529 말머리

### 5-1. 타입

- `CommunityPostCategoryCode = 'QUESTION' | 'EXPERIENCE' | 'TOGETHER' | 'NEWS'`
- 응답 `category: { code: string; name: string; description: string } | null` — code 는 string 으로 받는다(BE 가 값을 더해도 화면이 죽지 않게. 분기·필터는 알려진 code 만).
- Summary · Detail 에 `category` 를 더한다(LikedPost 는 따라온다).
- `CommunityPostCreateRequest.category?: CommunityPostCategoryCode`, `CommunityPostUpdateRequest.category?: CommunityPostCategoryCode` — 수정 요청 주석에 「생략하면 말머리를 지운다(전체 교체)」를 적는다(`imageKeys` 주석과 같은 결).
- `CommunityListParams.category?: CommunityPostCategoryCode`
- 말머리 표(code → 표시명 `질문` · `경험 공유` · `같이 해요` · `동네 소식`)를 `src/lib/community/` 에 한 곳 둔다. 칩 문구는 이 표에서 가져온다(표시명은 BE `name` 과 글자까지 같다 — 계약 표).

### 5-2. 글쓰기 · 수정

- `CommunityEditorValue` 에 `category: CommunityPostCategoryCode | null`.
- 폼(`community-editor-form.tsx`): 지역 선택 다음 · 제목 앞에 「말머리」 칩 행(선택 사항 표시). 단일 선택, 다시 누르면 해제. 접근성은 `aria-pressed` 버튼 그룹(`aria-label="말머리"`) — 기존 칩 결과 맞춘다.
- 작성 도움 칩(결정 #2): `handleInsertPrompt` 가 템플릿을 넣은 뒤, `category === null` 이면 칩 id 에 대응하는 code 를 고른다. 매핑은 `COMMUNITY_WRITING_PROMPTS` 항목에 `category` 필드를 더해 한 곳에 둔다. `editor-compose.ts:89-92` 의 「말머리가 아니다」 주석을 새 관계에 맞게 고친다.
- `createCommunityEditorPayload`:
  - 작성: `category` 가 있으면 싣고, 없으면 키째 뺀다.
  - **수정: `category` 가 있으면 항상 싣는다.** 없으면(사용자가 해제했거나 원래 없음) 키를 빼서 지운다. 테스트로 「기존 말머리를 건드리지 않은 수정 = 같은 code 가 실림」을 박는다.
- `baseValue`(register-page): `category: isKnownCategory(detail.category?.code) ? code : null`. 알 수 없는 code 의 글을 수정하면 말머리가 지워진다 — 이 경우는 주석으로 남기고 받아들인다(알려진 값만 보낼 수 있다).
- 임시 저장(`editor-draft.ts`): 저장·비교·복원에 `category` 를 넣는다. 옛 저장본(필드 없음)은 `null` 로 읽는다. dirty 판정에 포함.

### 5-3. 목록 필터

- `CommunityListState.category?: CommunityPostCategoryCode`. parse 는 알려진 대문자 code 만, 검색 중·liked 면 버린다(계약: 검색·좋아요한 글에는 필터 없음). serialize 는 있을 때만.
- `createCommunityContextKey` · URL 액션 유니온에 category. 바꾸면 쿼리 키가 바뀌어 커서가 처음부터(테스트).
- `createCommunityListRequest` 의 list 모드에만 `category` 를 싣는다(search·liked 모드엔 싣지 않는다). 지역 필터·정렬·기간과 함께.
- UI: latest·popular 보기이고 검색 중이 아닐 때, 탭 행 아래(인기 탭이면 기간 칩 위)에 「전체 · 질문 · 경험 공유 · 같이 해요 · 동네 소식」 칩 행. `aria-label="말머리"`. 좁은 폭에서는 가로 스크롤(줄바꿈으로 행이 두 줄이 되지 않게). 빈 결과 문구는 「이 말머리의 글이 아직 없어요」 결로.
- 우 레일 인기 글에는 말머리 필터를 걸지 않는다.

### 5-4. 표시

- 목록 행: 제목 앞(또는 지역·시간 메타 줄 앞)에 `category.name` 배지. null 이면 아무것도 없다. 배지 스타일은 기존 배지(순위 배지·`글쓴이` 배지) 토큰을 재사용한다.
- 상세: 제목 위 메타 영역에 같은 배지.
- 좋아요한 글(프로필)·검색 결과도 같은 행 컴포넌트면 자동으로 따라온다.

### 5-5. 오류

- `COMMUNITY_017` 은 서버 문구를 그대로 보여 주는 지금 경로로 충분하다(목록은 알려진 값만 보내므로 사실상 일어나지 않는다). 명세에만 적는다.

### 5-6. mock · fixture · 테스트 · 명세

- mock: 글 일부에 말머리를 주고(`null` 포함), `getPosts` 가 category 로 거른다. 작성·수정이 category 를 저장하고, 수정에서 생략하면 지운다(BE 와 같은 전체 교체).
- fixture: 응답에 `category`, 쿼리 `category` 를 받아도 unhandled 가 되지 않게.
- 테스트: payload(작성 생략·작성 포함·수정 유지·수정 해제), 작성 도움 칩 → 말머리 선택(비었을 때만), 임시 저장 왕복·옛 저장본, 상태 parse/serialize, 요청 조립(list 에만), 배지 렌더(null 없음), 필터 칩 렌더 조건.
- 명세: `community.md` 계약 표 · 목록 · 글쓰기·수정(:258~, 작성 도움 칩 행) · 테스트케이스. 제안서 §7 「말머리/카테고리」 행 갱신.

---

## 6. 커밋 4 — #532 신고 사유 코드

### 6-1. 사유 표 (`src/lib/community/report-reason.ts`)

- `COMMUNITY_REPORT_REASONS` 를 `{ code, label }[]` 로 바꾼다: `SPAM 스팸·홍보` · `ABUSE 욕설·비방` · `PRIVACY 개인정보 노출` · `FALSE_INFO 거짓 정보` · `ETC 기타`. 라벨은 지금 문자열과 **글자까지 같다**(가운뎃점 U+00B7).
- `CommunityReportReasonCode` 타입, 상세 필수 사유는 `'ETC'`.
- `composeCommunityReportReason` · `getCommunityReportDetailMaxLength` 를 지운다. 상세 최대 길이는 `COMMUNITY_REPORT_DETAIL_MAX_LENGTH = 500` 그대로.
- 입력 검증(`validateCommunityReportInput`)은 code 기준으로 바꾼다. 반환 `field: 'reason' | 'detail'` 은 FE 입력칸 이름이라 유지한다.
- 서버 오류 코드 → 입력칸 매핑 함수를 둔다: `COMMUNITY_110 → 'reason'`, `COMMUNITY_123 → 'detail'`, `COMMUNITY_124 → 'detail'`, `COMMUNITY_018 → 'reason'`, 그 밖 → `null`(일반 오류 자리). 결정 #8 예외 주석을 여기 단다.

### 6-2. 요청

- `CommunityReportCreateRequest = { targetKind; targetId; reasonCode: CommunityReportReasonCode; detail?: string }`. `reason` 필드를 지운다.
- `detail` 은 trim 해서 비면 키째 뺀다.
- data-source · mock(`createReport`) 시그니처를 같이 바꾼다. mock 은 ETC + 빈 상세면 `COMMUNITY_123` 실패를 흉내 내도 좋다(테스트 편의).

### 6-3. 다이얼로그 · 상세 페이지

- 다이얼로그 `onSubmit({ reasonCode, detail })`. 라디오 값은 code, 보이는 글자는 label.
- textarea `maxLength` · 카운터는 500 그대로.
- 서버 오류 표시: props 에 `errorField: 'reason' | 'detail' | null` 을 더한다. `reason` 이면 라디오 그룹 근처에 문구 + 첫 라디오 포커스, `detail` 이면 textarea 아래 문구 + textarea 포커스(지금 클라이언트 검증 실패 때와 같은 자리·같은 포커스 규칙). `null` 이면 지금의 일반 오류 자리.
- 상세 페이지 `reportMutation`: 오류에서 `resultCode` 를 읽어(`normalizeApiError(error).code` 또는 응답 검증 오류에 code 를 실어) 위 매핑 함수로 `errorField` 를 정한다. 문구는 지금처럼 서버 문구 우선.
  - 지금 `validateCommunityResponse` 가 던지는 `CommunityDetailQueryError` 에는 code 가 없다 — 필요하면 code 를 담게 넓힌다. 401 분기는 그대로.

### 6-4. 테스트 · 명세

- `report-reason.test.ts`(사유 표·검증·코드 매핑), `community-report-dialog.interaction.test.ts`(code 전송·서버 오류 위치·포커스), `community-mock.test.ts`, e2e fixture(`reports` POST 가 새 body 를 받는지 단언이 있으면 맞춤).
- 명세: `community.md` 신고 다이얼로그 절(:303-309 의 `[사유] 상세` 조립 문단 교체), CM-012 · CM-036 갱신. 제안서 §7 「신고 사유 코드」 행 갱신.

---

## 7. 검증

- 커밋마다: `pnpm vitest run app src` (커밋별 통과는 `git rebase <base> --exec 'cd frontend && pnpm vitest run app src'` 로 확인).
- 끝에: `pnpm qa:verify`, `pnpm test:e2e`(커뮤니티 슈트). dev 서버는 내려 두고 돌린다.
- 브라우저(`?mock=1`, 390 · 820 · 1200 · 1440): 말머리 필터·기간 칩·우 레일 제목·행 조회수/하트·배지·글쓰기 말머리 칩·수정 화면 칩 초기값·신고 다이얼로그.
- BE 배포 뒤(사용자 확인 후): dev 실데이터로 `category=BOGUS` → 400 확인, 로그인/비로그인 `liked`, 신고 실제 전송, OpenAPI 스냅샷 재동기화.

## 8. 남는 것

- 우 레일 행에 조회수·말머리 배지는 넣지 않았다(좁은 레일).
- 검색 결과·좋아요한 글에 말머리 필터는 계약상 없다.
- 운영자 신고 처리 화면(F2)의 `reasonCode` 필터는 별 작업이다.
