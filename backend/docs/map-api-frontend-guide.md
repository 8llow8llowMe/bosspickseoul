# Map API Frontend Guide

## Purpose

이 문서는 프론트엔드에서 지도 화면을 구현할 때 `district-service`의 `/api/v1/map/**` API를 어떻게 조합해서 쓰는지 정리한다.

- 프론트엔드는 자치구, 행정동, 상권 경계 데이터를 별도 파일로 들고 있을 필요가 없다.
- 지도 viewport 좌표를 백엔드에 전달하면, 백엔드는 해당 범위와 겹치는 영역 경계와 메타데이터를 반환한다.
- 화면에서는 응답의 `areaCode`, `areaName`, `centerLng`, `centerLat`, `boundaryCoords`를 그대로 지도 polygon, marker, side panel에 사용한다.

## Service Responsibility

지도 화면의 공개 API는 기본적으로 `district-service`의 `/api/v1/map/**`을 사용한다.

- `district-service`: 지도 viewport 기준 영역 조회, `area_boundary` 경계 좌표 제공, 상권 분석 결과와 지도 좌표 조합
- `commercial-service`: 상권 점수, 히트맵, 후보 상권, 프로필, 비교 계산

## Common Viewport Parameters

지도 영역 API는 현재 화면에 보이는 지도 bounds를 좌하단, 우상단 좌표로 전달한다.

| Parameter | Meaning | Example |
| --- | --- | --- |
| `lngSW` | 남서쪽 경도 | `126.90` |
| `latSW` | 남서쪽 위도 | `37.45` |
| `lngNE` | 북동쪽 경도 | `127.10` |
| `latNE` | 북동쪽 위도 | `37.70` |

요청 예시:

```http
GET /api/v1/map/districts?lngSW=126.9&latSW=37.45&lngNE=127.1&latNE=37.7
```

프론트 구현 예시:

```ts
const bounds = map.getBounds();

const params = new URLSearchParams({
  lngSW: bounds.getSouthWest().lng.toString(),
  latSW: bounds.getSouthWest().lat.toString(),
  lngNE: bounds.getNorthEast().lng.toString(),
  latNE: bounds.getNorthEast().lat.toString(),
});

const response = await fetch(`${API_BASE_URL}/api/v1/map/districts?${params}`);
const json = await response.json();
const areas = json.dataBody.areas;
```

## Area Boundary APIs

| API | Recommended Screen | Frontend Usage |
| --- | --- | --- |
| `GET /api/v1/map/districts` | 지도 초기 진입, 넓은 줌 레벨 | 자치구 polygon 표시, 자치구 단위 필터 선택 |
| `GET /api/v1/map/administrations` | 중간 줌 레벨, 행정동 탐색 | 행정동 polygon 표시, 자치구 선택 후 세부 탐색 |
| `GET /api/v1/map/commercials` | 높은 줌 레벨, 상권 분석 화면 | 상권 polygon 표시, 상권 클릭 이벤트의 기준 데이터 |

공통 응답 형태:

```json
{
  "dataHeader": {
    "success": true,
    "resultCode": "OK",
    "resultMessage": "OK"
  },
  "dataBody": {
    "areas": [
      {
        "areaCode": "11110",
        "areaName": "종로구",
        "centerLng": 126.9773248136,
        "centerLat": 37.5949153065,
        "boundaryCoords": [
          [126.975084766, 37.6311834989],
          [126.9748795141, 37.6304832153]
        ]
      }
    ]
  }
}
```

지도 적용 방식:

```ts
areas.forEach((area) => {
  drawPolygon({
    id: area.areaCode,
    name: area.areaName,
    path: area.boundaryCoords,
    center: [area.centerLng, area.centerLat],
  });
});
```

`boundaryCoords`는 `[lng, lat]` 순서다. 지도 SDK가 `[lat, lng]` 순서를 요구하면 프론트에서 변환해야 한다.

## Zoom Level Strategy

권장 호출 전략:

| Zoom Level | API | UI |
| --- | --- | --- |
| 낮은 줌 | `/map/districts` | 서울 전체 또는 자치구 단위 색상 표시 |
| 중간 줌 | `/map/administrations` | 행정동 경계 표시, 동 단위 탐색 |
| 높은 줌 | `/map/commercials` | 상권 polygon, 상권 클릭, 상세 패널 |

지도 이동 이벤트마다 즉시 호출하지 말고 `debounce`를 적용한다.

```ts
const handleMapIdle = debounce(async () => {
  const bounds = getCurrentBounds(map);
  const zoom = map.getZoom();

  if (zoom <= DISTRICT_ZOOM_MAX) {
    await loadDistrictAreas(bounds);
    return;
  }

  if (zoom <= ADMINISTRATION_ZOOM_MAX) {
    await loadAdministrationAreas(bounds);
    return;
  }

  await loadCommercialAreas(bounds);
}, 250);
```

## Heatmap API

```http
GET /api/v1/map/commercials/heatmap
```

추천 화면:

- 지도 메인 히트맵 오버레이
- 업종 선택 후 상권별 기회도, 위험도, 혼잡도, 거주수요 색상 표시
- 프리셋 기반 추천 모드의 지도 색상 표시

단일 지표 모드:

```http
GET /api/v1/map/commercials/heatmap?lngSW=126.9&latSW=37.45&lngNE=127.1&latNE=37.7&serviceCode=CS100001&periodCode=20233&metricType=OPPORTUNITY_SCORE&composite=false
```

복합 프리셋 모드:

```http
GET /api/v1/map/commercials/heatmap?lngSW=126.9&latSW=37.45&lngNE=127.1&latNE=37.7&serviceCode=CS100001&periodCode=20233&preset=BALANCED&priorityMetric=OPPORTUNITY_SCORE&composite=true
```

`priorityMetric` 은 선택 파라미터다. 생략하면 프리셋별 기본 우선 지표가 적용된다.

파라미터 배타 규칙 (위반 시 400):

| 조합 | 결과 |
| --- | --- |
| `composite=false` + `preset` 또는 `priorityMetric` 전달 | `MAP_005` 400 |
| `composite=true` + `metricType` 전달 | `MAP_004` 400 |

응답의 주요 필드:

| Field | Usage |
| --- | --- |
| `mode` | 단일 지표 또는 복합 추천 모드 표시 |
| `metricType` | 현재 선택한 단일 지표 메타데이터 |
| `preset` | 현재 선택한 추천 프리셋 메타데이터 |
| `priorityMetric` | 복합 모드에서 우선 반영한 지표 |
| `areas[].areaCode` | polygon 식별자 |
| `areas[].areaName` | 지도 tooltip, side panel 제목 |
| `areas[].boundaryCoords` | polygon 경계 |
| `areas[].score` | 색상 단계 계산 |
| `areas[].grade` | 서버가 계산한 등급 |
| `areas[].summaryLabel` | tooltip 또는 카드 요약 문구 |

## Candidate APIs

### Presets

```http
GET /api/v1/map/candidate-presets
```

추천 화면:

- 후보 상권 추천 패널의 프리셋 드롭다운
- 온보딩 질문 이후 기본 추천 타입 선택
- 히트맵 복합 모드 선택 UI

프론트는 응답의 `code`, `name`, `description`을 그대로 선택 UI에 사용할 수 있다.

### Candidate Commercials

```http
GET /api/v1/map/commercials/candidates
```

추천 화면:

- 지도 옆 후보 상권 랭킹 패널
- 지도 위 추천 상권 marker 또는 강조 polygon
- 업종, 프리셋, 우선지표 기반 Top N 추천

요청 예시:

```http
GET /api/v1/map/commercials/candidates?lngSW=126.9&latSW=37.45&lngNE=127.1&latNE=37.7&serviceCode=CS100001&periodCode=20233&preset=BALANCED&priorityMetric=OPPORTUNITY_SCORE&topN=10
```

응답의 주요 필드:

| Field | Usage |
| --- | --- |
| `items[].rank` | 랭킹 번호 |
| `items[].areaCode` | 상권 코드, 클릭 시 상세 API에 전달 |
| `items[].areaName` | 후보 카드 제목 |
| `items[].centerLng`, `items[].centerLat` | 지도 marker 위치 |
| `items[].boundaryCoords` | 후보 상권 polygon 강조 |
| `items[].compositeScore` | 종합 점수 표시 |
| `items[].grade` | 색상 또는 배지 |
| `items[].selectionReason` | 후보 카드 설명 |
| `items[].reasonTags` | 태그 UI |
| `items[].metricBreakdown` | 점수 상세 breakdown |

## Commercial Profile

```http
GET /api/v1/map/commercials/{commercialCode}/profile?serviceCode=CS100001&periodCode=20233
```

추천 화면:

- 상권 polygon 클릭 후 오른쪽 상세 패널
- 후보 상권 카드 클릭 후 상세 drawer
- 비교 화면에서 좌우 상권 요약 카드

응답 활용:

- `commercialCode`, `commercialName`: 패널 제목
- `districtName`, `administrationName`: 지역 breadcrumb
- `keyMetrics`: 주요 지표 카드
- `centerLng`, `centerLat`, `boundaryCoords`: 1단계에서는 항상 null/빈 배열로 내려간다. 지도 포커싱과 경계 강조에는 직전 candidates/heatmap 응답의 경계 정보를 재사용한다.

프론트는 상권 목록, 후보 추천, 히트맵 응답에서 이미 받은 `boundaryCoords`를 캐싱해두면 상세 API 호출 후 지도 강조를 빠르게 처리할 수 있다.

## Compare Preview

```http
GET /api/v1/map/commercials/compare-preview?leftCommercialCode=3110008&rightCommercialCode=3110015&serviceCode=CS100001&periodCode=20233
```

추천 화면:

- 지도에서 상권 2개 선택 후 말풍선 미리보기
- 비교 진입 전 미니 요약 카드
- 커뮤니티 글쓰기나 리포트 생성 전 비교 근거 표시

응답 활용:

- `left`, `right`: 비교 대상 상권 요약
- `recommendedSide`: 추천 우위 상권 표시
- `headlineMetrics`: 핵심 비교 지표
- `insightOneLiner`: 한 줄 코멘트

## Recommended Page Flow

지도 진입:

```text
1. /api/v1/map/candidate-presets
2. zoom 기준 /api/v1/map/districts 또는 /administrations 또는 /commercials
3. 업종 선택 후 /api/v1/map/commercials/heatmap
```

상권 클릭:

```text
1. polygon click
2. areaCode를 commercialCode로 사용
3. /api/v1/map/commercials/{commercialCode}/profile
4. 상세 패널 표시
```

추천 상권 탐색:

```text
1. preset, priorityMetric, serviceCode 선택
2. /api/v1/map/commercials/candidates
3. 추천 리스트와 지도 강조 polygon 표시
4. 후보 클릭 시 profile 호출
```

상권 비교:

```text
1. 지도에서 상권 2개 선택
2. /api/v1/map/commercials/compare-preview
3. 말풍선 또는 비교 미리보기 패널 표시
4. 사용자가 확정하면 비교 상세 또는 리포트 화면으로 이동
```

## Frontend Performance Notes

- 지도 이동 이벤트에는 `debounce`를 적용한다.
- 같은 bounds, zoom, filter 조합은 짧게 캐싱한다.
- 줌 레벨에 맞는 영역 API만 호출한다. 낮은 줌에서 `/map/commercials`를 바로 호출하지 않는다.
- `boundaryCoords` 응답은 크기 때문에 Swagger UI에서 렌더링이 깨질 수 있다. 실제 동작 확인은 브라우저 직접 호출, Postman, curl을 우선한다.
- polygon click 이벤트에는 `areaCode`와 `areaName`을 함께 보관한다. 별도 지역명 매핑 파일을 프론트에 둘 필요가 없다.
- 지도 SDK 좌표 순서가 `[lat, lng]`이면 서버 응답 `[lng, lat]`을 변환한다.

## Backend Data Requirements

지도 영역 API가 정상 동작하려면 `bosspickseoul_district_dev.area_boundary`에 아래 데이터가 있어야 한다.

| area_type | Expected Count |
| --- | --- |
| `DISTRICT` | `25` |
| `ADMINISTRATION` | `425` |
| `COMMERCIAL` | `1650` |

검증 SQL:

```sql
SELECT area_type, COUNT(*)
FROM bosspickseoul_district_dev.area_boundary
GROUP BY area_type
ORDER BY area_type;
```

재실행 안전성을 위해 `(area_type, area_code)` 유니크 키를 유지한다.

```sql
SHOW INDEX FROM bosspickseoul_district_dev.area_boundary;
```

필요한 유니크 키:

```sql
uk_area_boundary_area_type_area_code (area_type, area_code)
```
