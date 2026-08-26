/**
 * 지도 카메라(center + level)의 URL 계약. 순수 함수만 둔다.
 *
 * 정본: `docs/features/analysis/map-shell.md` D4-1 / D5.
 *
 * URL 표현은 `c=lat,lng,level` **위도 우선**이다. 프로젝트의 `GeoBounds`·`MapPoint` 는
 * 경도 우선(`lngSW`·`latSW`…)이라 두 순서가 한 저장소에 공존한다. 뒤바뀐 값을 조용히
 * 삼키면 지도가 엉뚱한 곳을 보게 되므로, 좌표 범위 가드를 한국으로 좁게 잡아
 * `127.03,37.54,4` 같은 뒤바뀜을 카메라 전체 폐기로 처리한다(D5).
 */

import type { GeoBounds } from '@/types/recommend'

export type MapCamera = {
  /** 지도 중심 위도. 직렬화 시 소수 5자리 */
  lat: number
  /** 지도 중심 경도. 직렬화 시 소수 5자리 */
  lng: number
  /** 카카오 지도 level(정수). 작을수록 확대 */
  level: number
}

/** 카메라를 담는 쿼리 파라미터 키. 네이버 지도와 같은 `c` 를 쓴다. */
export const MAP_CAMERA_PARAM = 'c'

/** 좌표 직렬화 소수 자리. 1e-5° ≈ 1.1m — level 1 에서도 육안 차이가 없다. */
export const MAP_CAMERA_PRECISION = 5

/**
 * level 클램프 범위.
 *
 * SDK 실측(`kakao.js` 4.5.26 의 뷰포트 클래스 `c.A=0; c.L=14` 와
 * `c.la=function(a){this.H=C(this.A,T(this.L,a))}`)으로 SDK 자체 클램프가
 * **0~14** 임을 확인했다. 앱이 실제로 쓰는 범위는 3~8 이고, level 0 은 로드맵
 * 타일이 없는 구간이라 하한을 1 로 한 단계 좁혀 둔다.
 */
export const MAP_CAMERA_LEVEL_MIN = 1
export const MAP_CAMERA_LEVEL_MAX = 14

/** 조건·카메라가 모두 없을 때의 기본 카메라(기존 `analysis-map.tsx` 하드코딩 값). */
export const SEOUL_DEFAULT_CAMERA: MapCamera = {
  lat: 37.5665,
  lng: 126.978,
  level: 8,
}

/** 지도 `idle` 디바운스. 기존 `VIEWPORT_DEBOUNCE_MS` 값을 그대로 승격했다. */
export const MAP_IDLE_DEBOUNCE_MS = 250

/**
 * 지도 데이터 조회 bounds 양자화 단위(도). ≈111m(위도) / 88m(경도).
 * 외향 라운딩(SW 내림 / NE 올림)과 결합해 미세 팬을 같은 쿼리 키로 흡수한다.
 */
export const MAP_BOUNDS_QUANTIZE_STEP = 0.001

/** 선택 depth 별 카메라 level. 기존 `PANEL_FIT_LEVEL_BY_STEP` 과 같은 값이다. */
export const CAMERA_LEVEL_BY_DEPTH = {
  district: 6,
  administration: 4,
  commercial: 3,
} as const

/**
 * 좌표 범위 가드. 한국으로 좁게 잡아 lat/lng 뒤바뀜까지 걸러낸다(D5).
 * 경도 123~133 과 위도 32~40 은 겹치지 않으므로 뒤바뀐 값은 반드시 탈락한다.
 */
export const KOREA_LAT_MIN = 32
export const KOREA_LAT_MAX = 40
export const KOREA_LNG_MIN = 123
export const KOREA_LNG_MAX = 133

/**
 * `createCameraBounds` 의 기준점.
 *
 * ⚠️ 이 값들은 **실측 근거가 있는 값**이다. 명세 D8-5 가 제시한 `0.004° × 2^(level-1)` /
 * 종횡비 0.6 / 여유 1.4 는 SDK 문서로 확인되지 않은 추정치였다. 대신 두 개의 확인된
 * 사실로 다시 유도했다.
 *
 * ① **한 단계마다 정확히 2배** — SDK 소스 실측. 뷰포트 클래스가 픽셀↔내부좌표 배율을
 *    `D(2, -this.H)`(= `2^-level`)로 계산한다(`kakao.js` 4.5.26, `c.ra`). 따라서 같은
 *    컨테이너에서 level 이 1 오르면 span 이 정확히 2배가 된다.
 * ② **level 8 의 실제 창은 `SEOUL_MAP_BOUNDS`(0.6° × 0.35°) 자릿수** — 이 앱이 기본
 *    level 8 의 첫 조회 창으로 프로덕션에서 써 온 값이다. 즉 추정이 아니라 운영으로
 *    검증된 앵커다.
 *
 * 그래서 span 을 `앵커 span × 2^(level - 8)` 로 정의한다. 종횡비도 앵커에서 그대로
 * 상속하므로(0.35/0.6 ≈ 0.583) 별도 추정이 필요 없고, level 8 에서
 * `createCameraBounds` 가 `SEOUL_MAP_BOUNDS` 와 같은 자릿수임이 **구성상 보장**된다.
 *
 * 여유(`MARGIN`)는 앵커 레이아웃보다 넓은 모니터를 덮기 위한 것이다. bounds 는
 * 조회 창일 뿐이고 첫 `idle` 에서 실제 bounds 로 교체되므로, 부족한 쪽(폴리곤이 비어
 * 보임)보다 넉넉한 쪽(폴리곤을 조금 더 받음)의 비용이 훨씬 싸다.
 */
export const CAMERA_BOUNDS_ANCHOR_LEVEL = 8
export const CAMERA_BOUNDS_ANCHOR_LNG_SPAN = 0.6
export const CAMERA_BOUNDS_ANCHOR_LAT_SPAN = 0.35
export const CAMERA_BOUNDS_MARGIN = 2

const quantizeCoordinate = (value: number): number => {
  const factor = 10 ** MAP_CAMERA_PRECISION
  return Math.round(value * factor) / factor
}

export const clampMapLevel = (level: number): number =>
  Math.min(
    MAP_CAMERA_LEVEL_MAX,
    Math.max(MAP_CAMERA_LEVEL_MIN, Math.round(level)),
  )

/** 원시 좌표·level 을 URL 계약과 같은 정밀도로 양자화한 카메라로 만든다. */
export const createMapCamera = (
  lat: number,
  lng: number,
  level: number,
): MapCamera => ({
  lat: quantizeCoordinate(lat),
  lng: quantizeCoordinate(lng),
  level: clampMapLevel(level),
})

/**
 * `c` 원문 → 카메라. 잘못된 값은 **조용히** `null` 이다(D5).
 * 카메라는 분석 조건이 아니라 뷰 상태이므로 사용자에게 아무 안내도 하지 않는다.
 */
export const parseMapCamera = (
  raw: string | null | undefined,
): MapCamera | null => {
  if (!raw) return null

  const tokens = raw.split(',')
  if (tokens.length !== 3) return null

  const [lat, lng, level] = tokens.map(token => Number(token.trim()))
  if (![lat, lng, level].every(Number.isFinite)) return null
  if (lat < KOREA_LAT_MIN || lat > KOREA_LAT_MAX) return null
  if (lng < KOREA_LNG_MIN || lng > KOREA_LNG_MAX) return null

  return createMapCamera(lat, lng, level)
}

export const serializeMapCamera = ({ lat, lng, level }: MapCamera): string =>
  `${quantizeCoordinate(lat)},${quantizeCoordinate(lng)},${clampMapLevel(level)}`

/**
 * 두 카메라가 URL 상 같은 값인가. 직렬화 결과를 비교하므로 양자화 이하의 차이
 * (지도 관성·픽셀 반올림)는 같은 값으로 본다 → 무의미한 `replace` 를 막는다.
 */
export const isSameMapCamera = (
  left: MapCamera | null | undefined,
  right: MapCamera | null | undefined,
): boolean => {
  if (!left || !right) return left === right
  return serializeMapCamera(left) === serializeMapCamera(right)
}

/**
 * URL 카메라를 지도에 적용해야 하는가.
 *
 * 이 함수가 피드백 루프의 유일한 방어선이다(D4-2, D6). 지도가 emit 한 카메라가
 * URL 로 돌아온 것(에코)이면 적용하지 않는다. 없으면
 * `replace` → 리렌더 → `setCenter` → `idle` → `replace` 로 무한 진동한다.
 */
export const shouldApplyUrlCamera = (
  urlCamera: MapCamera | null | undefined,
  lastEmitted: MapCamera | null | undefined,
): boolean => Boolean(urlCamera) && !isSameMapCamera(urlCamera, lastEmitted)

const floorToStep = (value: number): number =>
  Math.floor(value / MAP_BOUNDS_QUANTIZE_STEP) * MAP_BOUNDS_QUANTIZE_STEP

const ceilToStep = (value: number): number =>
  Math.ceil(value / MAP_BOUNDS_QUANTIZE_STEP) * MAP_BOUNDS_QUANTIZE_STEP

/** 부동소수 나머지(0.001 배수 곱셈)를 쿼리 키가 흔들리지 않을 자리에서 정리한다. */
const roundStep = (value: number): number => Number(value.toFixed(6))

/**
 * 조회 bounds 를 **외향** 양자화한다 — SW 는 내림, NE 는 올림.
 *
 * 외향이라 결과 사각형은 항상 원본을 **포함**한다(경계 폴리곤이 잘리지 않는다).
 * 그리고 111m 미만 미세 팬이 같은 키로 떨어져 재조회가 사라진다.
 */
export const quantizeBoundsOutward = (bounds: GeoBounds): GeoBounds => ({
  lngSW: roundStep(floorToStep(bounds.lngSW)),
  latSW: roundStep(floorToStep(bounds.latSW)),
  lngNE: roundStep(ceilToStep(bounds.lngNE)),
  latNE: roundStep(ceilToStep(bounds.latNE)),
})

/**
 * 카메라로부터 첫 조회용 근사 bounds 를 만든다.
 *
 * 정확할 필요가 없다 — 첫 `idle` 이 실제 뷰포트 bounds 로 교체한다. 다만 실제
 * 뷰포트를 **포함**해야 한다(포함하지 못하면 첫 페인트에 폴리곤이 빈다).
 * 유도 근거는 위 `CAMERA_BOUNDS_ANCHOR_*` 주석 참조.
 */
export const createCameraBounds = (camera: MapCamera): GeoBounds => {
  const scale = 2 ** (clampMapLevel(camera.level) - CAMERA_BOUNDS_ANCHOR_LEVEL)
  const lngSpan = CAMERA_BOUNDS_ANCHOR_LNG_SPAN * scale * CAMERA_BOUNDS_MARGIN
  const latSpan = CAMERA_BOUNDS_ANCHOR_LAT_SPAN * scale * CAMERA_BOUNDS_MARGIN

  return quantizeBoundsOutward({
    lngSW: camera.lng - lngSpan / 2,
    latSW: camera.lat - latSpan / 2,
    lngNE: camera.lng + lngSpan / 2,
    latNE: camera.lat + latSpan / 2,
  })
}
