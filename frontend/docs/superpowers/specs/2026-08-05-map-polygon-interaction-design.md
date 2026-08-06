# 지도 폴리곤 상호작용 통합 설계 (상권분석 · 상권추천)

- 작성일: 2026-08-05
- 범위: **FE 전용** — `analysis-map`, `recommend-map`, 공통 지도 레이어 모듈
- 상태: 설계 승인됨 (브레인스토밍 완료), 구현 계획 대기

## 1. 목표

상권분석·상권추천 지도에서 지역(자치구/행정동/상권) 폴리곤을 **잘 보이게** 하고,
**hover→강조 / 클릭→선택+드릴다운+확대** 상호작용을 **두 지도에서 동일한 로직**으로
제공한다. 좌측 네비(선택 패널)와 지도 선택 상태를 계속 연동한다.

## 2. 현재 상태 (변경 전)

두 지도 모두 폴리곤·클릭선택·라벨·bounds확대가 **이미 부분 구현**되어 있으나,
기본 폴리곤 스타일이 옅어(회색 stroke 1px + 옅은 fill) 지도 위에서 거의 보이지 않는다.

| 기능                                  | analysis-map | recommend-map            |
| ------------------------------------- | ------------ | ------------------------ |
| 지역별 폴리곤 그리기                  | 있음 (옅음)  | 있음 (옅음)              |
| 폴리곤 클릭 → onSelect                | 있음         | 있음 (단계별)            |
| 좌측 네비 선택 반영                   | 있음         | 있음                     |
| 지역명 라벨(태그) + 라벨 hover 프리뷰 | 있음         | 결과 단계 랭크 마커 위주 |
| 선택 시 setBounds 확대                | 있음         | fitPoints 기반 있음      |
| **폴리곤 본체 hover → fill 강조**     | **없음**     | **없음**                 |
| 스타일 가시성                         | 낮음         | 낮음                     |

analysis-map의 컴포넌트 인터페이스는 이미 공통화에 적합하다:
`{ activeStep, areas, selectedCode, previewedCode, onSelect, onPreviewChange, onViewportBoundsChange }`.

## 3. 요구사항

1. 각 지역을 개별 폴리곤으로 그리고 stroke + fill로 **명확히 보이게** 한다.
2. 폴리곤(면적) 위에 마우스를 올리면 fill을 **짙게** 표시한다 (hover 강조).
3. 폴리곤/라벨 클릭 시 해당 지역이 **선택**되고 좌측 네비에 반영된다.
4. 선택 시 지도를 **드릴다운(다음 계층)하며 확대**한다: 자치구→행정동→상권.
5. 상권추천 지도도 **동일 로직**을 사용한다.

## 4. 설계 결정 (승인됨)

- **D1. 공통 모듈로 추출**: 폴리곤 렌더링 + hover/click 리스너 + bounds 확대 로직을
  공용 훅으로 뽑아 두 지도가 공유한다. (대안: 각 지도 개별 구현 — 중복/드리프트
  위험으로 기각.)
- **D2. 드릴다운 + 확대**: 클릭은 단순 확대가 아니라 계층 드릴다운 + 확대. 기존 4단계
  플로우(자치구→행정동→상권→업종)와 일치.
- **D3. hover는 기존 preview 상태 재사용**: 폴리곤 hover는 `onPreviewChange(code)`를
  호출해 라벨 hover와 **동일한 강조 상태**를 공유한다. hover는 **순수 시각 변경**이며
  백엔드 호출을 유발하지 않는다.
- **D4. recommend 임시 수정 흡수**: 앞서 recommend-map에 넣었던 폴리곤 가시성
  프로토타입(stash 보관)은 이 공통 모듈로 대체한다.

## 5. 아키텍처

### 5.1 공통 훅 `useAreaPolygonLayer`

위치: `src/lib/map/use-area-polygon-layer.ts` (신규)

```
useAreaPolygonLayer({
  map, maps,                 // kakao map instance & namespace
  areas,                     // readonly AreaBoundaryItem[]
  selectedCode,              // string | null
  hoveredCode,               // string | null  (기존 previewedCode 매핑)
  onSelect,                  // (code: string) => void
  onHoverChange,             // (code: string | null) => void
  styleTokens?,              // 선택: stroke/fill 토큰 오버라이드
  fitToSelected = true,      // 선택 영역으로 setBounds 확대 여부
})
```

책임:

- `areas`마다 폴리곤 그리기 + 라벨(CustomOverlay) 생성.
- 폴리곤에 이벤트 등록: `click`→`onSelect(code)`,
  `mouseover`→`onHoverChange(code)`, `mouseout`→`onHoverChange(null)`.
- 상태별 스타일(§6) 적용: 기본 / hover(=hoveredCode) / 선택(=selectedCode).
- `selectedCode` 폴리곤 경계로 `setBounds` 확대 (`fitToSelected` 시).
- areas/selected/hovered 변경 및 언마운트 시 리스너·오버레이 **정리(cleanup)**.

이 훅은 순수 렌더링/이벤트 위임만 담당한다. **데이터 로딩·단계 전환·상태
관리는 각 페이지 컴포넌트가 유지**한다 (경계 명확화, CLAUDE.md 원칙 준수).

### 5.2 각 지도의 채택

- `analysis-map.tsx`: 현재 `areas.forEach(...)` 인라인 렌더링 블록을 훅 호출로 교체.
  props(`previewedCode`)를 `hoveredCode`로 전달. 동작·인터페이스 불변.
- `recommend-map.tsx`: 단계별(district/administration/commercial) 폴리곤 렌더링을
  훅으로 교체. **results 단계의 랭크 마커/점수 기반 fill은 특수 로직이라 기존 유지**
  (훅 범위 밖). 프로토타입 스타일 제거.

## 6. 폴리곤 3-상태 스타일

기존 디자인 토큰만 사용(임의 토큰 추가 금지). 수치는 구현 후 라이브에서 미세조정.

| 상태  | stroke                     | fill                             |
| ----- | -------------------------- | -------------------------------- |
| 기본  | `--color-primary-700`, 2px | primary 계열, opacity ≈ 0.16     |
| hover | `--color-primary-600`, 3px | opacity ≈ 0.32                   |
| 선택  | `--color-primary-600`, 3px | opacity ≈ 0.40 (+ 최상단 zIndex) |

- 선택과 hover가 동시면 선택 우선.
- 라벨(태그) 자체 스타일은 기존 유지.

## 7. 상호작용 흐름

1. 초기: 현재 단계 areas 폴리곤 표시(기본 스타일) + 라벨.
2. 폴리곤/라벨 hover → `onHoverChange(code)` → 해당 폴리곤 fill 짙게.
3. 폴리곤/라벨 click → `onSelect(code)` → 페이지가 선택 반영(좌측 네비 갱신) →
   다음 단계 areas 로드 → 훅이 선택 영역으로 `setBounds` 확대(드릴다운).
4. 모바일/터치: hover 없음 → tap = 선택(기존 모바일 시트 흐름 유지).

## 8. 테스트

- 신규: `use-area-polygon-layer.test.ts` — 폴리곤 개수, 이벤트 리스너 등록/정리,
  hover/select 콜백 발화, `fitToSelected` 시 setBounds 호출.
- 갱신: `analysis-map.test.ts`, `recommend-map.test.ts` — 훅 교체 후 회귀 없음 확인.
- 완료 전 `pnpm qa:verify` (format/lint/typecheck/build) 통과 필수.

## 9. 범위 밖 / 유의

- recommend results 단계 랭크 마커 로직 재작성은 범위 밖(기존 유지).
- 백엔드 API·계약 변경 없음. hover는 API 호출 없음.
- `/map/commercials/{code}/profile` 500은 **별개 백엔드 이슈** (본 작업 무관).
- 데스크톱 우선. 터치 hover 대체 UX는 최소 처리(선택만).

## 10. 리스크

- kakao 폴리곤에 다수 mouseover 리스너 → 성능. areas 수(자치구 25, 행정동/상권 수십)
  수준이라 문제 없을 것으로 판단하나, 리스너 정리 누락 시 누수 위험 → cleanup 테스트로 방지.
- 두 지도의 미묘한 동작 차이(results 단계 등)를 훅에 억지로 통합하지 않는다 —
  공통은 district/administration/commercial 단계로 한정.
