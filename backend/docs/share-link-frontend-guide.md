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
| `POST /api/v1/share-links` | **필수** (Bearer) | 화면 상태로 단축 공유 코드 발급 |
| `GET /api/v1/share-links/{shareCode}` | 불필요 | 공유 코드를 shareType + payload로 해석 |

- 생성은 로그인 사용자만 가능하다. 비로그인 사용자에게는 공유 버튼을 로그인 유도로 처리한다.
- 해석은 공개다. 링크를 받은 사람은 로그인 없이 화면에 진입할 수 있다
  (진입한 화면 자체가 인증 필요하면 그 화면의 정책을 따른다).

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
Authorization: Bearer {accessToken}
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
| 미인증 생성 시도 | 401 | `SECURITY_001` | 로그인 유도 (호출 전에 로그인 여부로 차단 권장) |

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
