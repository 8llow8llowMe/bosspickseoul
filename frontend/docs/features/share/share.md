# 공유 링크 · 분석 화면 보관함 — 공통 개발 명세서

> **작성일**: 2026-08-26
> **대상**: 웹 (Next.js App Router)
> **작성자**: FE
> **상태**: 명세 완료 · 구현(상권 분석 화면 기준)

[[_TOC_]]

---

## S0. 배경 / 기획 의도

| 항목               | 내용                                                                                                                                                                                                                                                                           |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 요청자 / 요청팀    | 백엔드 `commercial-service` 신규 API 도입에 따른 FE 연동                                                                                                                                                                                                                       |
| 요청일             | 2026-08-26                                                                                                                                                                                                                                                                     |
| 원본 기획 문서     | `backend/docs/share-link-frontend-guide.md` (정본), Swagger `commercial-service/v3/api-docs`                                                                                                                                                                                   |
| 요청 배경          | ① 분석 화면을 남에게 보낼 방법이 없었다. ② 조건(업종·기간)까지 포함한 화면을 다시 찾아올 방법이 없었다.                                                                                                                                                                        |
| 기존 동작 (as-is)  | "공유" 버튼이 **현재 브라우저 URL 문자열을 복사**할 뿐이었다(`analysis-result-view.tsx`). V1 `/share`·`/share/{token}` 은 시뮬레이션 리포트 전용이며 분석 화면과 무관하다.                                                                                                     |
| 목표 동작 (to-be)  | 공유 버튼이 V2 `POST /share-links` 로 단축 코드를 발급해 `/s/{shareCode}` 를 공유한다. 그 옆 "화면 보관" 버튼이 같은 payload 로 `POST /analysis-bookmarks` 에 저장한다.                                                                                                        |
| 구현 제외 범위     | 시뮬레이션 공유(백엔드 `ShareTargetType` 에 없음 → V1 유지), `DISTRICT_ANALYSIS`·`COMMERCIAL_COMPARISON`(대상 화면이 URL 상태를 온전히 복원하지 못함 → D1-1), 행정동/AI 리포트 화면의 **공유·보관 버튼 배치**(payload·라우트 계약은 준비 완료, 버튼은 각 화면 소유자가 붙인다) |
| 연관 기능 / 의존성 | [analysis](../analysis/analysis.md), [profile](../profile/profile.md), [status](../status/status.md), `src/lib/api/api-error.ts`(오류 규약 정본)                                                                                                                               |

### 두 개념을 섞지 않는다

| 구분      | 지역 북마크                                               | 화면 보관함                                                              |
| --------- | --------------------------------------------------------- | ------------------------------------------------------------------------ |
| API       | auth-service `/members/me/bookmarks`                      | commercial-service `/analysis-bookmarks`                                 |
| 저장 대상 | 자치구·행정동·상권 **엔티티**                             | 업종·기간 조건까지 포함한 **화면 상태(payload)**                         |
| id 타입   | `number`                                                  | **`string`** (Snowflake)                                                 |
| 화면 라벨 | "지역 북마크" / 결과 화면의 "상권 저장"                   | "화면 보관함" / 결과 화면의 "화면 보관"                                  |
| 코드      | `src/lib/api/user.ts`, `types/bookmark.ts#MemberBookmark` | `src/lib/api/analysis-bookmark.ts`, `types/bookmark.ts#AnalysisBookmark` |

---

## S1. 기능 개요

분석 화면의 **재현에 필요한 최소 상태(payload)** 를 백엔드에 맡겨 두고, 짧은 코드 하나로
남에게 보내거나(공유 링크) 내 보관함에 담는다(화면 보관함). 백엔드는 payload 를 해석하지
않으므로 **payload 스키마와 URL 복원은 전적으로 FE 계약**이다.

```
화면 상태 → payload 빌더 → POST(share-links | analysis-bookmarks) → 코드/항목
코드/항목 → shareType + payload → ROUTE_BUILDERS → router.replace(복원 URL)
```

---

## S2. 공통 요구사항

| #   | 요구사항                                                                                                                         | 상세 참조                                             |
| --- | -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| 1   | 공유 링크와 보관함은 **payload 빌더를 공유**한다. 빌더는 한 벌(`src/lib/share/payload.ts`)만 둔다.                               | S3-1                                                  |
| 2   | payload 에는 **화면 재현에 필요한 최소 상태만** 담는다. 분석 결과 데이터는 절대 담지 않는다.                                     | S3-1                                                  |
| 3   | payload 는 정규화(key 정렬) 후 **2000자 이하**여야 한다. key 순서는 무관하다 — 백엔드가 정규화한다.                              | `normalizeSharePayload` / `isSharePayloadWithinLimit` |
| 4   | 브라우저 → 백엔드 호출은 전부 `/api/bff` 경유. 토큰은 서버 세션 쿠키 전용이며 storage 에 넣지 않는다.                            | `src/lib/api/client.ts`                               |
| 5   | 오류는 **HTTP 상태로 분기**한다. 재시도 버튼 노출은 `isRetryable()` 로만 결정한다. 404 는 재시도 금지 + 서버 메시지 그대로 노출. | `src/lib/api/api-error.ts`                            |
| 6   | 공유는 **로그인 불필요**(생성·해석 모두). 보관함은 **전부 로그인 필수**.                                                         | S3-2 / S3-3                                           |
| 7   | 보호 경로 추가 시 `middleware.ts#PROTECTED_PATHS` 와 일치시킨다. `/s/{shareCode}` 는 공개이므로 추가하지 않는다.                 | `middleware.ts`                                       |

---

## S3. 필수 기능

| #   | 기능명           | 한 줄 설명                                                           | 구현                                                          |
| --- | ---------------- | -------------------------------------------------------------------- | ------------------------------------------------------------- |
| 1   | payload 계약     | shareType 별 최소 상태 빌더 + 2000자 검사                            | `src/lib/share/payload.ts`                                    |
| 2   | 라우트 복원      | `ROUTE_BUILDERS[shareType](payload) → URL` (payload 빌더의 역함수)   | `src/lib/share/routes.ts`                                     |
| 3   | 공유 링크 API    | `POST /share-links`, `GET /share-links/{shareCode}`                  | `src/lib/api/share.ts`                                        |
| 4   | 공유 진입 라우트 | `/s/{shareCode}` → 해석 → `router.replace`                           | `app/(shell)/s/[shareCode]/page.tsx`, `src/components/share/` |
| 5   | 보관함 API       | 저장·목록·이름수정·삭제                                              | `src/lib/api/analysis-bookmark.ts`                            |
| 6   | 결과 화면 버튼   | "공유" / "화면 보관"(로그인 유도·중복 토글·상한 안내)                | `src/components/analysis/analysis-result-view.tsx`            |
| 7   | 보관함 화면      | `/profile/bookmarks/analysis` 2탭 + shareType 필터 + 이름수정 + 삭제 | `src/components/profile/profile-analysis-bookmarks-page.tsx`  |

---

## S4. 세부 명세

### D1. payload 계약 (shareType 별)

백엔드는 payload 를 해석하지 않는다. 아래가 **FE 정본**이며 `src/lib/share/payload.ts` 와 1:1이다.

| shareType                 | payload 키                                                                                  | 복원 화면            | 지원                          |
| ------------------------- | ------------------------------------------------------------------------------------------- | -------------------- | ----------------------------- |
| `COMMERCIAL_ANALYSIS`     | `districtCode`, `administrationCode`, `commercialCode`, `serviceCode`, `periodCode`, `tab?` | `/analysis/result`   | ✅                            |
| `AI_REPORT`               | `districtCode`, `administrationCode`, `commercialCode`, `serviceCode`, `periodCode`         | `/analysis/report`   | ✅                            |
| `ADMINISTRATION_ANALYSIS` | `districtCode`, `administrationCode`                                                        | `/analysis`          | ✅                            |
| `DISTRICT_ANALYSIS`       | —                                                                                           | —                    | ❌ D1-1                       |
| `COMMERCIAL_COMPARISON`   | `districtCode`, `administrationCode`, `serviceCode`, `commercialCodes[]`(순서 유지, 2개)    | `/recommend/compare` | ✅ (#573 비교 화면 공유 버튼) |

> 위 표의 `COMMERCIAL_COMPARISON` 행은 2026-10-10(#573)에 갱신했다. 아래 D1-1 의 `/recommend` 판단은
> 비교 화면이 URL 상태(`compare-url.ts`)를 갖기 전의 기록이다. 지금은 `ROUTE_BUILDERS.COMMERCIAL_COMPARISON`
> 이 `createCompareHref` 로 복원하고, 비교 화면 Actions 의 「공유」가 이 타입을 발급한다.

- `/analysis/result` 는 자치구·행정동 코드가 **모두 있어야** 완전한 선택으로 본다
  (`isCompleteAnalysisSelection`). 그래서 가이드 예시(`commercialCode`/`serviceCode`/`periodCode`)보다
  `districtCode`·`administrationCode` 두 키를 더 담는다 — payload 스키마는 FE 계약이고 백엔드는
  정규화·해시만 하므로 가이드 예시와 달라도 문제되지 않는다.
- **기본값은 담지 않는다.** `tab='summary'` 는 화면이 기본값으로 열므로 생략한다.
  같은 화면 상태가 같은 코드로 재사용되게 하려는 의도다(정규화 결과가 같아진다).

#### D1-1. 미지원 타입 — 왜 `null` 인가

`ROUTE_BUILDERS` 값이 `null` 이면 해석 시 "아직 지원하지 않는 화면 유형이에요"로 안내한다.
**FE 는 이 두 타입을 생성하지 않는다** — 해당 화면에 공유·보관 버튼 자체가 없어 실제로 만들어질 일도 없다.

보관함의 존재 이유는 "조건까지 포함한 화면 상태"를 되살리는 것이다. 링크를 눌렀는데 조건이 사라진
기본 화면이 뜨면 사용자는 저장이 날아갔다고 판단한다 — **조용한 실패는 에러보다 나쁘다.**
그래서 "URL 로 상태를 온전히 복원하는가"를 지원 기준으로 삼는다.

| shareType               | 대상 화면    | 판단 근거                                                                                                                                                                                                                                                                                         |
| ----------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DISTRICT_ANALYSIS`     | `/status`    | `district`·`metric` 을 읽기는 하지만 `normalizeStatusSelection` 이 **그 지표 Top10 안에 있을 때만** 인정한다. Top10 밖이면 `district` 를 지운 URL 로 `router.replace` — 안내 없이 기본 화면. **→ 2026-09-30 해소**: 25개 구 모두 유효([status.md](../status/status.md) 1.2). payload 빌더는 후속. |
| `COMMERCIAL_COMPARISON` | `/recommend` | 검색 파라미터를 아예 읽지 않는다(`useSearchParams` 부재). 링크를 만들어도 원래 화면으로 돌아가지 못한다.                                                                                                                                                                                          |

`/status` 실측 (dev, 2026-08-26):

| 진입 URL                              | 결과                                                                                                                               |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `/status?metric=sales&district=11650` | 서초구가 매출 Top10 이라 복원됨 — URL 유지 + 서초구 상세 시트 열림                                                                 |
| `/status?district=11650`              | 서초구가 유동인구 Top10 밖 → URL 이 `/status?metric=footTraffic` 로 재작성되고 `district` 가 **조용히 삭제**, 상세 없음, 안내 없음 |

Top10 순위는 데이터 갱신마다 바뀐다. 즉 저장 시점에는 열리던 링크가 나중에 조용히 깨진다 —
빌드 타임에 보장할 수 없으므로 빌더를 두지 않는다. `/status` 가 Top10 밖 자치구도 상세로 열게 되거나
`/recommend` 가 URL 상태를 갖게 되면 그때 빌더만 채우면 된다(payload 키 설계는 그 시점에 확정).

반대로 `ADMINISTRATION_ANALYSIS` → `/analysis` 는 **실제로 복원된다.**
`AnalysisPage` 가 `parseAnalysisSelection(searchParams)` 로 네 코드를 읽어 그대로 선택 상태를 만든다.
실측 — `/analysis?districtCode=11680&administrationCode=11680510` 진입 시 URL 이 유지된 채
1단계 강남구 / 2단계 신사동이 선택되고 3단계(상권 선택)로 열린다.
(존재하지 않는 코드는 목록 조회 후 그 단계만 되돌린다 — 정상적인 검증이지 복원 실패가 아니다)

### D2. 라우트 복원 규칙

- `buildShareRoute(shareTypeCode, payload)` 가 `{ok:true, href}` 또는
  `{ok:false, reason:'unknown-type'|'unsupported-type'|'bad-payload'}` 를 준다. 이유마다 문구가 다르다.
- **라운드트립(payload → URL → payload)이 테스트로 고정되어 있다**(`routes.test.ts`).
  두 방향이 어긋나면 공유 링크가 조용히 다른 화면을 연다.

### D3. 공유 흐름

1. 결과 화면 "공유" → `buildCommercialAnalysisPayload` → `POST /share-links`
2. `shareCode` 수신 → `createShareUrl` → `navigator.share` 또는 클립보드 복사
3. 같은 화면 상태는 **기존 코드가 재사용**되고 만료만 연장된다 → 버튼 연타 안전
4. 사용자가 공유 시트를 닫은 `AbortError` 는 실패로 처리하지 않는다
5. 유효기간 90일 — 안내 문구에 명시한다

시트·복사 분기는 `src/lib/share/share-delivery.ts#deliverShareUrl` 한 곳이다(분석 결과 화면은 아직 같은 규칙을
자체 코드로 갖고 있다 — 다른 배치가 고치는 파일이라 이번에 옮기지 않았다).

| 화면                     | 버튼      | 발급                                       | 성공 토스트                                                                                                          | 실패 토스트                                                       |
| ------------------------ | --------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| 분석 결과                | 공유      | V2 `COMMERCIAL_ANALYSIS`                   | `공유 링크를 준비했어요. 링크는 90일간 열 수 있어요.`                                                                | `classifyShareLinkError` 문구                                     |
| 추천 비교 (#573)         | 공유      | V2 `COMMERCIAL_COMPARISON`                 | 위와 같다(`SHARE_LINK_READY_MESSAGE`)                                                                                | 위와 같다                                                         |
| 시뮬레이션 리포트 (#573) | 링크 복사 | **발급 없음** — 지금 주소(조건이 URL 정본) | 시트: `리포트 링크를 공유했어요.` · 복사: `리포트 링크를 복사했어요. 받은 사람도 같은 조건의 리포트를 볼 수 있어요.` | `리포트 링크를 복사하지 못했어요. 주소창의 주소를 복사해 주세요.` |

시뮬레이션은 백엔드 `ShareTargetType` 에 없어 V2 코드를 만들 수 없다(S0 구현 제외). 리포트 URL 은 조건이 전부 실린
정본이라(simulation-report.md) 주소 자체를 건넨다 — 만료가 없으므로 90일 안내를 붙이지 않는다.

### D4. `/s/{shareCode}` 진입 화면

**서버가 먼저 해석한다(#572, 2026-10-10).** `page.tsx` 가 `loadShareResolution`(`share-preview.server.ts`)로
`GET /share-links/{shareCode}` 를 부르고 `decideShareEntry` 로 가른다. Page 는 **해석만** 기다린다 — 이름 조회
(`loadShareNames`)는 `generateMetadata` 만 하고, 그마저 307 을 받을 사람에게는 하지 않는다.

- 시간 제한: 사람 **1.5초**, 봇 3초(`SHARE_RESOLVE_TIMEOUT_MS`). 사람은 해석이 끝날 때까지 빈 화면이고, 실패해도
  클라이언트 경로가 BFF 로 다시 해석하므로 서버에서 오래 기다릴 이득이 없다. 봇은 이 응답이 미리보기의 전부라 더 기다린다.
- 형식 검사: base62 1~16자(`share-code.ts` — 백엔드 8자 생성·16자 컬럼)가 아니면 서버·클라이언트 모두 부르지 않는다.
  클라이언트는 「존재하지 않는 공유 링크예요」로 안내한다.
- 만료 경계: 캐시된 성공 응답이라도 `expiresAt`(오프셋 없는 값은 KST)이 지났으면 실패로 본다.

| 요청                                 | 처리                                                                                          |
| ------------------------------------ | --------------------------------------------------------------------------------------------- |
| 사람 + 해석 성공 + 복원 가능         | 서버 `redirect(href)` — **307**. 클라이언트 왕복이 한 번 줄었다                               |
| 링크 미리보기 봇(`isLinkPreviewBot`) | 보내지 않는다. 200 으로 D4-1 메타를 읽힌다(307 을 따라가면 도착 화면의 일반 메타를 읽는다)    |
| 해석 실패·미지원 타입                | 아래 클라이언트 경로(`ShareEntryPage`)가 이어받는다 — 만료·미존재 문구와 재시도는 여기만 있다 |

클라이언트 경로: `GET /share-links/{shareCode}`(BFF) → `buildShareRoute` → `router.replace(href)`.
새 창(`window.open`) 대신 replace 를 쓴다 — 주소창에 실제 분석 URL 이 남아 새로고침·재공유가 자연스럽다.

#### D4-1. 공유 미리보기 메타 (#572)

`generateMetadata` 가 같은 `loadShareResolution` 결과와 `loadShareNames` 로 제목·설명을 만든다(`buildSharePreviewCopy`). payload 는 코드뿐이라
이름은 따로 찾는다 — 업종·자치구는 정적 카탈로그, 상권·행정동은 공개 API.

| shareType                  | 제목                                                     | 이름 조회(서버, 공개 API)                            |
| -------------------------- | -------------------------------------------------------- | ---------------------------------------------------- |
| `COMMERCIAL_ANALYSIS`      | `{상권} · {업종} 상권분석 ({YYYY}년 {Q}분기)`            | `GET /regions/commercials/{code}/administration` 1회 |
| `AI_REPORT`                | `{상권} · {업종} AI 리포트 ({YYYY}년 {Q}분기)`           | 같은 API 1회                                         |
| `COMMERCIAL_COMPARISON`    | `{상권A} vs {상권B} · {업종} 상권 비교`                  | 같은 API 2회(병렬, 상한 2)                           |
| `ADMINISTRATION_ANALYSIS`  | `{자치구} {행정동} 상권 탐색`                            | `GET /regions/districts/{d}/administrations` 1회     |
| 실패·만료·미지원·이름 없음 | `공유된 분석 화면` / `공유받은 상권 분석 화면을 엽니다.` | —                                                    |

- **캐시**: 해석은 `revalidate: 3600`(읽기 전용·payload 불변, 바뀌는 건 만료뿐), 이름은 `revalidate: 86400`.
  시간 제한을 넘기면 고정 문구로 떨어진다. `signal` 을 넘기면 Next 의 fetch 중복 제거가 꺼지므로
  `generateMetadata`·`page` 공유는 React `cache` 로 묶었다(해석·이름을 따로).
- 인증 없이 부른다. 세 API 모두 백엔드 `@PreAuthorize` 가 없다(수신자는 비로그인).
- 실측(2026-10-10, dev 백엔드 + `next start`): 사람 UA → 307 `/analysis/result?…`·`/recommend/compare?…`,
  `kakaotalk-scrap/1.0` → 200 + `<head>` 안 `og:title`, 없는 코드 → 200 + 고정 문구.
- 봇 목록은 Next HTML-limited 봇 목록에서 옮기고 카카오톡(`kakaotalk-scrap`)·다음·텔레그램을 더했다.
  카카오톡 인앱 브라우저(`KAKAOTALK`)는 사람이라 보낸다.
- **`next.config.ts` `htmlLimitedBots`** 에 Next 기본 목록 + 같은 추가분(`link-preview-bots.ts`)을 넣었다. 카카오톡은
  기본 목록에 없어 메타가 스트리밍되면 `og:title` 이 `</head>` 뒤로 밀린다 — 해석·이름 조회를 나눈 뒤 실측에서
  드러났고(바이트 위치 `</head>` 15377 < `og:title` 30743), 설정 뒤 `<head>` 안(1896 < 17444)으로 돌아왔다.
- **OG 이미지는 아직 루트 이미지다**(#598 보류 — D7).

| 상황             | HTTP | 화면                                                                                     | 재시도 |
| ---------------- | ---- | ---------------------------------------------------------------------------------------- | ------ |
| 만료             | 410  | "만료된 공유 링크예요" + "공유 링크는 발급 후 90일간 유효해요. 링크를 다시 받아 주세요." | ✗      |
| 미존재           | 404  | "존재하지 않는 공유 링크예요" + **서버 `resultMessage` 그대로**                          | ✗      |
| 통신 실패        | –    | "링크를 여는 중 연결이 끊겼어요"                                                         | ✓      |
| 서버 오류        | 5xx  | "링크를 여는 중 문제가 발생했어요"                                                       | ✓      |
| 그 외 4xx        | 4xx  | "링크를 열 수 없어요"                                                                    | ✗      |
| 미지원/깨진 타입 | 200  | `getShareRouteFailureMessage(reason)`                                                    | ✗      |

만료 판정은 **HTTP 410** 으로 한다. `SHARE_LINK_002` 는 보조 근거로만 쓴다 — 에러 코드로 UI 를
분기하지 않는 저장소 규약을 지키되, 410 은 상태만으로 의미가 확정되기 때문이다.

### D5. 보관함 UX

**결과 화면 "화면 보관" 버튼**

| 상황                    | HTTP / code                 | 처리                                                                                                        |
| ----------------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 비로그인                | –                           | `/login?redirect=…` 로 이동 (기존 `getCommercialBookmarkLoginHref` 재사용)                                  |
| 저장 성공               | 200                         | "이 분석 화면을 보관함에 저장했어요." + 버튼 `보관됨` 으로 전환                                             |
| 중복                    | 409 `ANALYSIS_BOOKMARK_002` | `dataBody.existingBookmarkId` 가 오면 그 id 로 **해제(삭제) 토글** 가능. 없으면(null) 안내만 하고 토글 불가 |
| 저장 상한               | 400 `ANALYSIS_BOOKMARK_006` | 서버 `resultMessage` 를 **그대로** 노출 ("보관함이 가득 찼습니다…")                                         |
| 세션 만료               | 401/403                     | 로그인 화면으로 유도                                                                                        |
| 화면 상태 변경(기간·탭) | –                           | 다른 화면이므로 보관 상태 표시를 초기화한다(payload 정규화 문자열로 판정)                                   |

기본 이름은 `{상권명} {업종명}` 을 50자로 잘라 붙인다(백엔드 제한).

**`/profile/bookmarks/analysis` — 2탭**

- 탭 1 **지역 북마크**: 기존 자치구·행정동 엔티티 즐겨찾기
- 탭 2 **화면 보관함**: `shareType` 필터 · 이름 수정(PATCH, 공백이면 이름 제거) · 삭제(DELETE)
- 항목 클릭 → **해석 API 호출 없이** 목록에 실려 온 payload 로 곧장 `ROUTE_BUILDERS` 이동
- 복원 불가 항목(미지원 타입 등)은 열기 버튼을 비활성화하고 이유를 표시한다
- 삭제 404 는 이미 없어진 항목이므로 재시도 대신 목록을 새로고침한다

### D6. `bookmarkId` — 문자열 고정

Snowflake 값이 `Number.MAX_SAFE_INTEGER` 를 넘는다. `Number('7345678901234567890')` 은
`7345678901234567000` 이 되어 **다른 항목을 삭제하게 된다.**

- 타입은 `string` 으로 고정하고 코드 어디에서도 `Number(...)` 를 쓰지 않는다.
- 409 의 `existingBookmarkId` 가 혹시 **숫자**로 오면 이미 파싱 단계에서 손상된 값이므로
  `readExistingBookmarkId` 가 `null` 을 돌려준다 — 손상된 id 로 DELETE 를 쏘느니 토글을 포기한다.
- 회귀 방지 테스트: `src/lib/api/analysis-bookmark.test.ts`, `profile-analysis-bookmarks-page.test.ts`

### D7. 남은 작업

- 행정동(`/analysis`)·AI 리포트(`/analysis/report`) 화면에 공유·보관 버튼 배치
  (payload 빌더와 `ROUTE_BUILDERS` 는 이미 준비되어 있다)
- `DISTRICT_ANALYSIS`: `/status` 가 Top10 밖 자치구도 상세로 열게 되면 payload 스키마 + 빌더 추가 (D1-1)
- ~~`COMMERCIAL_COMPARISON`~~ — 빌더는 앞서 생겼고, 비교 화면 공유 버튼은 #573 으로 붙었다(D3 표)
- 보관함 목록 페이지네이션(현재 최신 20건). `totalPages` 는 응답에 이미 온다
- 시뮬레이션 공유의 V2 이관(백엔드 `ShareTargetType` 에 시뮬레이션 상수 추가 선행)
- 분석 결과 화면 `handleShare` 를 `deliverShareUrl`·`SHARE_LINK_READY_MESSAGE` 로 옮기기(동작 동일, 중복 제거)
- **공유별 OG 이미지(#598, 보류)**: `app/(shell)/s/[shareCode]/opengraph-image.tsx` 에 상권·업종·분기 + 지표 1~2개.
  막힌 지점은 글꼴이다. satori(`next/og`)는 WOFF2 를 읽지 못하는데 저장소에는
  `PretendardVariable.subset.woff2` 하나뿐이다(DESIGN.md §1.5). 가변 글꼴도 satori 가 축을 적용하지 않아
  기본 무게(400)로만 그려진다. 방안: `scripts/fonts/subset-pretendard.sh` 와 같은 원본(pretendard@1.3.9)에서
  `fontTools.varLib.instancer` 로 **wght 700 정적 TTF** 1개를 만들고 같은 2,566자 `charset.txt` 로 서브셋,
  `rename-family.py` 로 RFN 재작성(OFL D8-5) → `app/(shell)/s/[shareCode]/` 옆 자산으로 커밋.
  예상 크기는 woff2 서브셋(429KiB, 가변)보다 큰 수백 KiB(TTF 는 압축이 없다) — 저장소에 새 바이너리를 넣는 결정과
  RFN 파생물 이름 정책 확인이 먼저라 이번 배치에서 구현하지 않았다. 지표는 `GET /map/commercials/{code}/profile`
  1회(`revalidate` 하루)로 충분하다. 해석 실패 시에는 이 파일이 없는 것과 같게 루트 이미지로 돌려보낸다.

---

## S5. 테스트케이스

| TC ID  | 범위              | 검증 내용                                                                                             | 테스트 파일                                                        |
| ------ | ----------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| TC-001 | payload 빌더      | 최소 상태만 담김 / 불완전 선택은 null / 기본 탭 생략                                                  | `lib/share/payload.test.ts`                                        |
| TC-002 | payload 정규화    | key 순서 무관 / 2000자 초과 검출                                                                      | `lib/share/payload.test.ts`                                        |
| TC-003 | 라운드트립        | 지원 4종(상권 분석·AI 리포트·행정동 탐색·상권 비교) payload → URL → payload 동일                      | `lib/share/routes.test.ts`                                         |
| TC-004 | 라우트 실패 분기  | unknown-type / unsupported-type / bad-payload 문구가 서로 다름                                        | `lib/share/routes.test.ts`                                         |
| TC-005 | 공유 진입 오류    | 410 만료 ≠ 404 미존재 문구 / 둘 다 재시도 버튼 없음 / 5xx 만 재시도                                   | `lib/share/share-entry.test.ts`                                    |
| TC-006 | `bookmarkId` 보존 | PATCH·DELETE 경로에 문자열 그대로 / 숫자면 토글 포기                                                  | `lib/api/analysis-bookmark.test.ts`                                |
| TC-007 | 저장 실패 분기    | 409 중복(+existingBookmarkId) / 400 상한(서버 문구) / 401 / 5xx                                       | `lib/api/analysis-bookmark.test.ts`                                |
| TC-008 | V2 엔드포인트     | `/share-links` 사용(V1 `/share` 아님) / `/s/{code}` URL 조립                                          | `lib/api/share.test.ts`                                            |
| TC-009 | 보관함 카드       | 큰 id 문자열 보존 / 복원 불가 항목은 열기 비활성                                                      | `components/profile/profile-analysis-bookmarks-page.test.ts`       |
| TC-010 | 미지원 타입 고정  | 빌더를 가진 타입이 정확히 4종 / 미지원 1종(`DISTRICT_ANALYSIS`)은 unsupported-type                    | `lib/share/routes.test.ts`                                         |
| TC-011 | 미리보기 문구     | 타입별 제목·설명 / 분기 형식 오류 시 괄호 생략 / 이름 없으면 고정 문구                                | `lib/share/share-preview.test.ts`                                  |
| TC-012 | 진입 분기         | 사람+성공 → redirect / 봇·실패·미지원 → render / 인앱 브라우저는 사람                                 | `lib/share/share-preview.test.ts`                                  |
| TC-013 | 서버 조회         | 공개 API·revalidate·무인증 / 4xx·success:false·통신 실패·형식 오류·만료 경계 → 실패 / 비교 이름 2건   | `lib/share/share-preview.server.test.ts`                           |
| TC-014 | 링크 건네기       | 시트 우선 / 없으면 복사 / AbortError 는 실패 아님 / NotAllowedError 면 복사로 폴백 / 수단 없으면 던짐 | `lib/share/share-delivery.test.ts`                                 |
| TC-015 | 비교 공유 왕복    | 비교 화면 URL → payload → 공유 해석 → 같은 URL                                                        | `lib/share/routes.test.ts`                                         |
| TC-016 | 진입 연결부       | 사람: 해석만(1.5초) 기다려 redirect·이름 조회 없음 / 봇: 3초·render·제목 / 실패: render·고정 문구     | `app/(shell)/s/[shareCode]/page.test.ts`                           |
| TC-017 | 형식 오류 코드    | 클라이언트가 해석을 부르지 않고 미존재로 안내                                                         | `components/share/share-entry-page.test.ts`                        |
| TC-018 | 리포트 링크 복사  | shared·copied → 성공 토스트 / aborted → 없음 / 실패 → 오류 토스트                                     | `components/simulation/report/simulation-report-link-copy.test.ts` |

---

## 변경 이력

| 버전 | 날짜       | 변경 내용                                                                                                                                                                                                                                       | 작성자 |
| ---- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 1.0  | 2026-08-26 | 최초 작성 — V2 공유 링크 + 분석 화면 보관함 연동 명세                                                                                                                                                                                           | FE     |
| 1.1  | 2026-08-26 | `/status`·`/analysis` 복원 실측 후 `DISTRICT_ANALYSIS` 를 미지원(`null`)으로 조정, D1-1 추가                                                                                                                                                    | FE     |
| 1.2  | 2026-10-10 | D1 비교 행 갱신, D3 화면별 공유·토스트 표(#573), D4 서버 해석·redirect·D4-1 미리보기 메타(#572), D7 #598 보류 근거, TC-011~018. 리뷰 반영: Page 는 해석만 대기(사람 1.5초), 코드 형식·만료 경계 검사, NotAllowedError 복사 폴백, TC-003·010 4종 | Claude |
