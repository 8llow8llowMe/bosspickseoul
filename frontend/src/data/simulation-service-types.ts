/**
 * 창업 시뮬레이션이 지원하는 업종 30종.
 *
 * ## 왜 API가 아니라 상수인가
 *
 * 백엔드에 **지원 업종 목록 조회 API가 없다**. 지원 여부는 `GET /simulations/store-sizes`를
 * 실제로 호출해야만 알 수 있고, 미지원이면 404 `SIMULATION_001`이 돌아온다.
 * 업종 선택 UI를 지원 업종으로 제한하지 않으면 사용자가 고른 뒤에야 404를 보게 되므로,
 * 백엔드 시드(`simulation_service_type`)를 그대로 옮겨 **선택 단계에서 차단**한다.
 *
 * 출처: `backend/service/commercial-service/src/main/resources/db/simulation-seed.sql`
 * (`INSERT INTO simulation_service_type ...`, base_year `'2024'`).
 *
 * ## 언제 깨지는가 — 그리고 어떻게 알아채는가
 *
 * 기준 연도가 전환되면(2024 → 다음 수집분) 시드가 다시 적재되면서 업종 구성이 바뀔 수 있다.
 * 이 상수가 낡으면 두 방향으로 틀어진다.
 *
 * 1. **여기 있는데 서버엔 없다** → `store-sizes`가 404 `SIMULATION_001`을 준다.
 *    → 404는 재시도해도 같으므로 재시도 버튼을 띄우지 말고 서버 `resultMessage`를 그대로 보여주고
 *      다른 업종을 고르게 안내한다 (`@/lib/api/api-error`의 `kind === 'not-found'`).
 * 2. **서버엔 있는데 여기 없다** → 지원하는 업종이 선택지에서 조용히 사라진다. 오류가 나지 않아
 *    더 발견하기 어렵다. 그래서 시드가 바뀌면 이 파일을 **반드시 함께 갱신**해야 한다.
 *
 * `simulation-service-types.test.ts`가 개수(30)와 코드 형식, 그리고
 * `simulation-catalog.ts`(카테고리 그룹 UI 데이터)와의 정합을 지켜본다.
 * 시드 변경 시 그 테스트가 먼저 깨지도록 해 둔 것이다.
 */

export type SimulationServiceType = {
  /** 서울시 상권 업종 코드 (예: `CS100001`) */
  code: string
  /** 화면 표시명 */
  name: string
}

/** 시드 `base_year` — 응답의 `dataBaseYear`와 어긋나면 이 상수가 낡았다는 뜻이다. */
export const SIMULATION_SEED_BASE_YEAR = '2024'

/** 지원 업종 30종. 시드 적재 순서가 아니라 코드 오름차순으로 정렬해 대조하기 쉽게 뒀다. */
export const SIMULATION_SERVICE_TYPES: readonly SimulationServiceType[] = [
  { code: 'CS100001', name: '한식음식점' },
  { code: 'CS100002', name: '중식음식점' },
  { code: 'CS100003', name: '일식음식점' },
  { code: 'CS100004', name: '양식음식점' },
  { code: 'CS100005', name: '제과점' },
  { code: 'CS100006', name: '패스트푸드점' },
  { code: 'CS100007', name: '치킨전문점' },
  { code: 'CS100008', name: '분식전문점' },
  { code: 'CS100009', name: '호프-간이주점' },
  { code: 'CS100010', name: '커피-음료' },
  { code: 'CS200001', name: '일반교습학원' },
  { code: 'CS200002', name: '외국어학원' },
  { code: 'CS200003', name: '예술학원' },
  { code: 'CS200005', name: '스포츠 강습' },
  { code: 'CS200019', name: 'PC방' },
  { code: 'CS200025', name: '자동차수리' },
  { code: 'CS200028', name: '미용실' },
  { code: 'CS200031', name: '세탁소' },
  { code: 'CS200033', name: '부동산중개업' },
  { code: 'CS200034', name: '여관' },
  { code: 'CS200037', name: '노래방' },
  { code: 'CS300001', name: '슈퍼마켓' },
  { code: 'CS300002', name: '편의점' },
  { code: 'CS300007', name: '수산물판매' },
  { code: 'CS300010', name: '일반의류' },
  { code: 'CS300016', name: '안경' },
  { code: 'CS300018', name: '의약품' },
  { code: 'CS300022', name: '화장품' },
  { code: 'CS300025', name: '자전거 및 기타운송장비' },
  { code: 'CS300029', name: '애완동물' },
] as const

const SIMULATION_SERVICE_CODES = new Set(
  SIMULATION_SERVICE_TYPES.map(item => item.code),
)

/**
 * 시뮬레이션이 지원하는 업종 코드인가.
 * 마법사의 업종 선택과 쿼리스트링(`?serviceCode=`) 복원에서 404를 예방하는 데 쓴다.
 */
export const isSimulationServiceCode = (code: string | null | undefined) =>
  typeof code === 'string' && SIMULATION_SERVICE_CODES.has(code)

/** 지원 업종이면 항목, 아니면 null. */
export const findSimulationServiceType = (
  code: string | null | undefined,
): SimulationServiceType | null =>
  SIMULATION_SERVICE_TYPES.find(item => item.code === code) ?? null

/* ------------------------------------------------------------------ *
 * 층 구분 선택지
 * ------------------------------------------------------------------ */

/**
 * 요청의 `floorType` enum 선택지.
 *
 * 라벨은 응답 `condition.floorType.name`과 같은 문구를 쓴다 — 입력 화면과 리포트 요약이
 * 서로 다른 말을 하지 않게 하기 위해서다. 응답이 오면 그 `name`을 그대로 쓰는 쪽이 우선이다.
 * (V1은 `'1층' | '1층이외'` 한글 문자열을 그대로 서버에 보냈다. V2는 enum 코드다.)
 */
export const SIMULATION_FLOOR_TYPES = [
  { code: 'FIRST_FLOOR', name: '1층' },
  { code: 'OTHER', name: '1층 외' },
] as const satisfies readonly {
  code: 'FIRST_FLOOR' | 'OTHER'
  name: string
}[]
