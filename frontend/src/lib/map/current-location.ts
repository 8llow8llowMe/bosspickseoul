/**
 * 지도 「내 위치」 버튼의 판단 규칙. 브라우저 API 호출은 컴포넌트가 하고, 여기는
 * 결과를 무엇으로 보여줄지만 정한다(테스트가 node 환경이라 순수 함수로 둔다).
 */

export type GeoPoint = { lat: number; lng: number }

/** 내 위치로 옮길 때의 지도 레벨. 골목·상권 단위가 읽히는 정도(카카오 level 4 ≈ 반경 250m). */
export const CURRENT_LOCATION_LEVEL = 4

/**
 * 한 번 받은 위치를 다시 쓰는 시간. 버튼을 연달아 눌러도 GPS 를 매번 깨우지 않게 한다.
 * 가게 자리를 보는 서비스라 1분 묵은 위치로도 충분하다.
 */
export const CURRENT_LOCATION_MAX_AGE_MS = 60_000
export const CURRENT_LOCATION_TIMEOUT_MS = 10_000

/**
 * 브라우저가 콜백을 끝내 부르지 않는 경우의 안전장치. `timeout` 은 권한 창이 떠 있는 시간을
 * 세지 않아서, 권한 창을 고르지 않고 닫으면 성공·실패 어느 쪽도 오지 않는 브라우저가 있다.
 * 그러면 버튼이 「찾는 중」에 영영 갇힌다.
 */
export const CURRENT_LOCATION_WATCHDOG_MS = CURRENT_LOCATION_TIMEOUT_MS + 5_000

export type CurrentLocationOutcome =
  { kind: 'moved'; point: GeoPoint } | { kind: 'outside'; point: GeoPoint }

/**
 * 받은 좌표를 이동 여부로 가른다. 이 서비스의 데이터는 서울뿐이라 서울 밖으로 카메라를
 * 옮기면 폴리곤도 결과도 없는 빈 지도만 남는다 — 옮기지 않고 이유를 알린다.
 * 판정 함수는 주입받는다. 서울 경계(`seoul-boundary`)가 무거워 호출부가 동적 import 한다.
 */
export const resolveCurrentLocation = (
  point: GeoPoint,
  isInService: (point: GeoPoint) => boolean,
): CurrentLocationOutcome =>
  isInService(point) ? { kind: 'moved', point } : { kind: 'outside', point }

/** `GeolocationPositionError.code` 값. DOM 상수를 node 테스트에서도 쓰려고 옮겨 적는다. */
const PERMISSION_DENIED = 1
const POSITION_UNAVAILABLE = 2
const TIMEOUT = 3

export const describeGeolocationError = (code: number | null): string => {
  if (code === PERMISSION_DENIED) {
    return '위치 권한이 꺼져 있어요. 브라우저 설정에서 위치 접근을 허용해 주세요.'
  }
  if (code === POSITION_UNAVAILABLE) {
    return '현재 위치를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.'
  }
  if (code === TIMEOUT) {
    return '위치를 찾는 데 시간이 너무 걸려요. 다시 시도해 주세요.'
  }
  return '이 브라우저에서는 현재 위치를 사용할 수 없어요.'
}

export const OUTSIDE_SEOUL_MESSAGE =
  '현재 위치가 서울 밖이라 지도를 옮기지 않았어요. 서울 지역만 분석할 수 있어요.'
