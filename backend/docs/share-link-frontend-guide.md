# Share Link Frontend Guide

## Purpose

이 문서는 프론트엔드에서 분석 화면 공유 기능을 구현할 때
`commercial-service`의 `/api/v1/share-links/**` API를 어떻게 쓰는지 정리한다.

- 백엔드는 payload를 **해석하지 않는다**. 화면 진입에 필요한 상태를 JSON 객체로 저장하고
  그대로 돌려줄 뿐이다. 최종 진입 URL 조립은 전적으로 프론트 책임이다.
- 분석 종류마다 API가 따로 있지 않다. `shareType` 값만 다르게 주면 모든 화면에 재사용된다.

## API Summary

| API | 인증 | 용도 |
| --- | --- | --- |
| `POST /api/v1/share-links` | **선택** (Bearer) | 화면 상태로 단축 공유 코드 발급 |
| `GET /api/v1/share-links/{shareCode}` | 불필요 | 공유 코드를 shareType + payload로 해석 |

- 생성/해석 모두 로그인 없이 가능하다. 공유 버튼에 로그인 게이트를 두지 않는다.
- 생성 시 Bearer 토큰을 보내면 최초 공유자가 기록된다. 로그인 상태라면 토큰을 실어 보내는 것을 권장한다.
- 링크를 받은 사람은 로그인 없이 분석 화면에 진입할 수 있다. 단, 화면 안의 **AI 리포트 영역은
  ai-service 정책에 따라 로그인 필수**이므로 비로그인 수신자에게는 잠금 카드로 노출된다
  (`ai-report-frontend-guide.md`의 잠금 카드 패턴 참고). 로그인하면 같은 화면에서 AI 분석 결과까지 볼 수 있다.

## shareType 목록

| shareType | 화면 |
| --- | --- |
| `COMMERCIAL_ANALYSIS` | 상권 상세 분석 |
| `DISTRICT_ANALYSIS` | 자치구 분석 |
| `ADMINISTRATION_ANALYSIS` | 행정동 분석 |
| `COMMERCIAL_COMPARISON` | 상권 비교 분석 |
| `AI_REPORT` | AI 분석 리포트 |

새 화면이 필요하면 백엔드 `ShareTargetType`에 상수 추가를 요청한다 (1줄 변경).

## 공유 링크 생성 (공유 버튼)

```http
POST /api/v1/share-links
Authorization: Bearer {accessToken}   # 선택 — 있으면 최초 공유자 기록
Content-Type: application/json

{
  "shareType": "COMMERCIAL_ANALYSIS",
  "payload": {
    "commercialCode": "3110008",
    "serviceCode": "CS100001",
    "periodCode": "20233"
  }
}
```

응답:

```json
{
  "dataHeader": { "resultCode": "SUCCESS" },
  "dataBody": {
    "shareCode": "a1B2c3D4",
    "shareType": { "code": "COMMERCIAL_ANALYSIS", "name": "상권 분석", "description": "상권 상세 분석 화면" },
    "expiresAt": "2026-11-05T12:34:56"
  }
}
```

- 공유용 URL은 프론트가 조립한다: `https://www.bosspickseoul.com/s/a1B2c3D4`
- **payload에는 화면 재현에 필요한 최소 상태만 담는다** (코드/필터/기간 등).
  분석 결과 데이터 자체를 담지 않는다. 정규화(JSON key 정렬) 후 2000자 초과 시 `SHARE_LINK_005` 400.
- 같은 화면 상태를 다시 공유하면 새 코드가 아니라 **기존 코드가 재사용**되고 만료만 연장된다
  (key 순서가 달라도 같은 상태로 인식). 공유 버튼 연타에 안전하다.
- 유효 기간은 기본 90일이며 응답의 `expiresAt`으로 확인한다.

## 공유 링크 해석 (`/s/{shareCode}` 라우트)

프론트 라우터에 `/s/:shareCode` 경로를 만들고, 진입 시 해석 API를 호출한다.

```http
GET /api/v1/share-links/a1B2c3D4
```

응답:

```json
{
  "dataHeader": { "resultCode": "SUCCESS" },
  "dataBody": {
    "shareType": { "code": "COMMERCIAL_ANALYSIS", "name": "상권 분석", "description": "상권 상세 분석 화면" },
    "payload": { "commercialCode": "3110008", "serviceCode": "CS100001", "periodCode": "20233" },
    "createdAt": "2026-08-07T12:34:56",
    "expiresAt": "2026-11-05T12:34:56"
  }
}
```

`shareType.code`로 URL 템플릿을 고르고 payload를 합쳐 리다이렉트한다:

```ts
const ROUTE_BUILDERS: Record<string, (p: any) => string> = {
  COMMERCIAL_ANALYSIS: (p) => `/analysis/commercial/${p.commercialCode}?serviceCode=${p.serviceCode}&periodCode=${p.periodCode}`,
  DISTRICT_ANALYSIS: (p) => `/analysis/district/${p.districtCode}?periodCode=${p.periodCode}`,
  // ...
};

const { shareType, payload } = dataBody;
const builder = ROUTE_BUILDERS[shareType.code];
if (!builder) { /* 알 수 없는 타입: 홈으로 폴백 + 안내 토스트 */ }
router.replace(builder(payload));
```

- payload 필드 구성은 **생성한 쪽(프론트)이 정한 계약**이다. shareType별 payload 스키마를
  프론트 코드 한 곳(`ROUTE_BUILDERS` 옆)에 상수로 정리해두는 것을 권장한다.
- 새 창으로 열기(`window.open`)보다 `/s/{code}` 진입 후 `router.replace` 리다이렉트를 권장한다.
  주소창에 실제 분석 URL이 남아 이후 새로고침/재공유가 자연스럽다.

## 에러 처리

| 상황 | HTTP | resultCode | 프론트 처리 |
| --- | --- | --- | --- |
| 존재하지 않는 코드 | 404 | `SHARE_LINK_001` | "존재하지 않는 링크" 안내 + 홈 이동 |
| 만료된 링크 | 410 | `SHARE_LINK_002` | "만료된 링크" 안내 + 홈 이동 |
| 잘못된 shareType | 400 | `SHARE_LINK_003` | 생성 요청 버그 — shareType 오타 확인 |
| payload가 객체가 아님 | 400 | `SHARE_LINK_004` | 생성 요청 버그 — payload 구성 확인 |
| payload 크기 초과 | 400 | `SHARE_LINK_005` | payload에 결과 데이터를 담지 않았는지 확인 |
| 만료/위조 토큰으로 생성 | 401 | `SECURITY_*` | 토큰 갱신 후 재시도, 실패 시 토큰 없이 호출해도 됨 |

검증 오류(필수값 누락)는 `SHARE_LINK_101`(shareType), `SHARE_LINK_102`(payload)로 응답한다.

## 흐름 요약

```
[공유하는 사람]
분석 화면 → 공유 버튼 → POST /share-links {shareType, payload}
→ shareCode 수신 → https://www.bosspickseoul.com/s/{shareCode} 클립보드 복사/공유

[공유받은 사람]
/s/{shareCode} 진입 → GET /share-links/{shareCode}
→ shareType으로 URL 템플릿 선택 + payload 병합 → router.replace(최종 URL)
```

## 분석 보관함 (같은 payload 재사용)

공유 링크와 같은 payload/shareType 계약으로 **내 보관함에 저장**하는 기능이 별도로 있다
(`/api/v1/analysis-bookmarks/**`, 전부 로그인 필수). 공유 버튼 옆 "보관" 버튼에 연결하면 된다.

| API | 인증 | 용도 |
| --- | --- | --- |
| `POST /api/v1/analysis-bookmarks` | 필수 | `{shareType, payload, bookmarkName?}` 저장 |
| `GET /api/v1/analysis-bookmarks?page=&size=` | 필수 | 내 보관함 최신순 목록 (size 1~50) |
| `DELETE /api/v1/analysis-bookmarks/{bookmarkId}` | 필수 | 보관 항목 삭제 |

- payload 구성 규칙(최소 상태만, 2000자 제한, key 순서 무관)은 공유 링크와 완전히 동일하다.
  **공유용으로 만든 payload 빌더를 그대로 재사용**하면 된다.
- 목록 응답의 각 항목은 `{bookmarkId, shareType(metadata), payload, bookmarkName, createdAt}` —
  해석 API 호출 없이 payload 가 바로 오므로, 항목 클릭 시 `ROUTE_BUILDERS`로 즉시 이동하면 된다.
- 공유 링크와 달리 **만료가 없다**. `bookmarkName`(50자 이하)은 선택이며 미지정 시 null.
- 에러: 같은 화면 상태 재저장 409 `ANALYSIS_BOOKMARK_002`(이미 저장됨 토스트),
  타 회원 항목/미존재 삭제 404 `ANALYSIS_BOOKMARK_001`, payload 검증 400 `ANALYSIS_BOOKMARK_003~005`.
- 자치구/행정동/상권 **자체**를 즐겨찾기하는 회원 북마크(`/api/v1/members/me/bookmarks`)와는 별개다.
  보관함은 "조건(업종/분기 등)까지 포함한 화면 상태" 저장이다.
