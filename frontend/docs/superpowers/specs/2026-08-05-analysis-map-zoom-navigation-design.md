# 상권분석 지도 — 줌 기반 탐색 + 클릭 즉시 분석 설계

- 작성일: 2026-08-05
- 범위: **FE 전용** — 상권분석(analysis) 페이지/지도. recommend 페이지는 범위 밖.
- 의존: `feature/fe/map-polygon-interaction`(PR #77)의 공통 폴리곤 렌더(`drawAreaPolygonLayer`) + 가시성 수정 위에 쌓는다.
- 상태: 설계 승인됨(브레인스토밍 완료), 구현 계획 대기

## 1. 목표

상권분석 지도를 **줌 레벨이 표시 레이어(자치구/행정동/상권)를 자동 결정**하는
지도 우선 탐색으로 바꾸고, **폴리곤 클릭 시 상위 계층(동/구)까지 자동 적용**,
**상권+업종이 채워지면 즉시 분석**으로 이동한다. 팬/줌으로 스코프를 바꿔도
선택 위치로 되돌아가지 않는다.

## 2. 현재 상태 (변경 전)

- 표시 레이어는 **좌측 패널 단계**(자치구→행정동→상권→업종)가 결정. 줌과 무관.
- 팬 시 뷰포트로 areas를 재조회하지만, 폴리곤 재드로우마다 선택 지역으로
  `setBounds`가 호출돼 **스냅백**이 발생(현재 `drawAreaPolygonLayer(fitToSelected:true)` 때문).
- 지도 폴리곤 데이터 `AreaBoundaryItem`은 `areaCode`+좌표만 있고 **부모 코드 없음**.
- 분석 결과는 `districtCode + administrationCode + commercialCode + serviceCode`를
  모두 요구한다(analysis-result-view의 contextParams). 즉 상권만으로는 분석 불가.
- 행정동 코드 앞 5자리 = 자치구 코드(예: 광진구 11215 → 행정동 11215XXX).

## 3. 요구사항

1. 좌측 패널에서 지역 선택 → 지도가 그 위치로 갱신(1회 확대).
2. 지도를 팬/줌해 스코프를 바꾸면 **선택 위치로 되돌아가지 않는다**(스냅백 제거).
3. 줌 스코프에 따라 **자치구 / 행정동 / 상권** 폴리곤이 자동으로 표시된다.
4. 지도 폴리곤 클릭 시 해당 값과 **상위 값(동/구)까지 모두** selection에 적용된다.
5. 상권(+부모)과 업종이 모두 정해지면 **자동으로 분석 결과로 이동**한다.

## 4. 설계 결정 (승인됨)

- **D1. 줌-주도 레이어**: 줌 레벨이 표시 레이어를 자동 결정(구글맵식). 좌측 패널
  단계 표시는 지도 줌을 반영(양방향).
- **D2. 스냅백 제거**: `setBounds`(확대)는 **명시적 선택 시 1회만**. 팬/줌으로 인한
  폴리곤 재드로우에서는 호출하지 않는다.
- **D3. 부모 코드는 기하 포함관계로 클라이언트 계산**: 상권 클릭 시 상권 중심점을
  행정동 폴리곤들과 point-in-polygon 판정 → 행정동 코드, 앞 5자리로 자치구 코드.
  백엔드 변경 없음.
- **D4. 클릭 = 선택 + 한 단계 확대**: 이전에 정한 드릴다운과 일관. 상권은 리프라
  확대 없음.
- **D5. 자동 분석 이동**: 상권+업종이 모두 채워지면 `/analysis/result`로 자동 이동
  (순서 무관). 기존 "분석 결과 보기" 버튼은 수동 fallback로 유지.

## 5. 아키텍처

### 5.1 줌 → 레이어 매핑

kakao 지도 level(1=최근접 … 14=최원거리) 기준 임계값으로 레이어를 결정한다.
초기 제안값(구현 후 라이브 튜닝):

| 줌 레벨(level) | 레이어 |
| --- | --- |
| level ≥ 7 | 자치구(district) |
| 5 ≤ level ≤ 6 | 행정동(administration) |
| level ≤ 4 | 상권(commercial) |

- 지도 idle 시 현재 level → 레이어 결정 → 해당 레이어의 뷰포트 areas 조회.
- 순수 함수 `resolveMapLayerByZoom(level): 'district' | 'administration' | 'commercial'`로 분리(단위 테스트).

### 5.2 부모 resolver (기하 포함관계)

위치: `src/lib/map/geometry.ts`(기존)에 추가.

- `isPointInPolygon(point: MapPoint, ring: readonly MapPoint[]): boolean` — ray casting.
- `findContainingArea(point: MapPoint, areas: readonly AreaBoundaryItem[]): AreaBoundaryItem | null`
  — point가 포함되는 area 반환(없으면 중심점 최근접 fallback).
- `resolveDistrictCodeFromAdministration(administrationCode: string): string` — 앞 5자리.

상권 클릭 흐름: 클릭 상권의 `{centerLng, centerLat}` → 현재 로드된 행정동 areas로
`findContainingArea` → 행정동 코드 → 구 코드. 행정동 areas가 없으면 해당 뷰포트
행정동을 fetch 후 계산.

### 5.3 selection 확장

`selection.ts`:
- 상권 선택 시 `commercialCode`뿐 아니라 `administrationCode`, `districtCode`도 함께
  세팅하는 경로 추가(예: `selectCommercialWithParents(selection, commercialCode, administrationCode)`).
- 동 선택 시 `administrationCode` + `districtCode`(앞5자리) 함께 세팅.

### 5.4 컴포넌트 변경

- `analysis-map.tsx`
  - 지도 idle 시 `onZoomLayerChange(layer)` 콜백으로 현재 줌 레이어 전달.
  - `drawAreaPolygonLayer` 호출에서 `fitToSelected` 분리 → 확대는 별도 "선택 확정" 시에만.
  - 폴리곤 클릭 시 레이어별 부모 계산 후 `onSelect(codeWithParents)`.
- `analysis-page.tsx`
  - 표시 레이어를 **줌 레이어** 기준으로 전환(기존 step-driven 매핑 제거/치환).
  - 좌측 패널 선택 → 지도 fit(1회) 트리거.
  - 상권+업종 모두 채워지면 `router.push(createAnalysisResultHref(...))` 자동 이동 effect.

## 6. 상호작용 흐름

1. 진입: 서울 전역(줌아웃) → 자치구 폴리곤.
2. 구 폴리곤 클릭 → districtCode 설정 + 그 구로 확대 → (줌인) 행정동 레이어.
3. 동 폴리곤 클릭 → administrationCode + districtCode(앞5자리) 설정 + 그 동으로 확대 → 상권 레이어.
4. 상권 폴리곤 클릭 → commercialCode + (기하)부모 동/구 설정.
5. 좌측 패널에서 업종 선택(또는 이미 선택됨) → 상권+업종 모두 채워짐 → 자동 분석 이동.
6. 사용자가 자유롭게 팬/줌 → 되돌아가지 않고, 보이는 스코프의 레이어 표시.

## 7. 테스트

- `resolveMapLayerByZoom` 임계값 경계 단위 테스트.
- `isPointInPolygon` / `findContainingArea` — 내부/외부/엣지/fallback 단위 테스트.
- `resolveDistrictCodeFromAdministration` — 앞5자리 추출 테스트.
- selection 확장(상권/동 선택 시 부모 세팅) 단위 테스트.
- 자동 이동 조건(상권+업종 모두 존재 시에만) 순수 함수 단위 테스트.
- `pnpm qa:verify` 통과.

## 8. 범위 밖 / 유의

- recommend 페이지 재설계는 범위 밖(조건폼 흐름 유지). 공통은 폴리곤 렌더/가시성/hover만.
- 백엔드 API·계약 변경 없음.
- `/map/commercials/{code}/profile` 500은 별개 백엔드 이슈(부모 계산은 기하로 회피).
- 부모 계산 엣지: 상권 중심점이 어떤 행정동 폴리곤에도 안 들어가면 최근접 중심점 행정동으로 fallback.
- 데스크톱 우선. 터치는 tap=선택(기존 모바일 시트 유지).

## 9. 리스크

- 줌 임계값이 어색하면 레이어 전환이 잦거나 늦을 수 있음 → 라이브 튜닝으로 조정.
- point-in-polygon 정확도(복잡한 행정동 경계) → 클릭당 1회라 성능 부담은 없음.
  fallback으로 정확도 보완.
- 양방향 동기화(패널↔지도)에서 무한 루프 주의 → "명시적 선택"과 "줌으로 인한 레이어 변경"을 분리.
