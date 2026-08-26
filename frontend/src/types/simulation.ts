/**
 * 창업 시뮬레이션 V2 계약 타입.
 *
 * 정본: `backend/docs/simulation-frontend-guide.md` +
 * Swagger `https://api-dev.bosspickseoul.com/commercial-service/v3/api-docs`의 `Simulation*` 스키마.
 *
 * 단위 규약 — **금액은 전부 만원**, **면적 입력은 ㎡**다. 화면에서 원 단위로 착각하지 않는다.
 *
 * 경로 규약 — 브라우저는 BFF(`/api/bff`)만 호출하므로 이 파일이 서술하는 계약의 실제 경로는
 * `/api/v1/simulations/**`지만 FE 코드상 경로에는 `/api/v1`이 붙지 않는다.
 */

import type { ApiResponse } from '@/types/api'

/* ------------------------------------------------------------------ *
 * 공통
 * ------------------------------------------------------------------ */

/**
 * 층 구분.
 *
 * **요청은 enum 문자열**(`'FIRST_FLOOR' | 'OTHER'`)이고,
 * **응답(`condition.floorType`)은 `{code,name,description}` 메타데이터 객체**다. 방향이 다르니 섞지 않는다.
 */
export type SimulationFloorType = 'FIRST_FLOOR' | 'OTHER'

/** `CodeNameDescriptionMetadata` — 응답에서만 쓰인다. */
export type SimulationFloorTypeMeta = {
  code: SimulationFloorType
  name: string
  description: string
}

/* ------------------------------------------------------------------ *
 * GET /simulations/store-sizes?serviceCode=  (공개)
 * ------------------------------------------------------------------ */

export type SimulationSizeItem = {
  /** 면적 (㎡) */
  squareMeter: number
  /** 평 환산 */
  pyeong: number
}

export type SimulationStoreSizes = {
  serviceCode: string
  serviceName: string
  /** 기준 데이터 연도 (예: `'2024'`). 문자열이다. */
  dataBaseYear: string
  small: SimulationSizeItem
  medium: SimulationSizeItem
  large: SimulationSizeItem
}

/* ------------------------------------------------------------------ *
 * GET /simulations/franchisees?serviceCode=&keyword=&lastId=  (공개, 커서 페이징 10건)
 * ------------------------------------------------------------------ */

export type SimulationFranchiseeSearchItem = {
  franchiseeId: number
  brandName: string
  serviceCode: string
  serviceName: string
}

export type SimulationFranchisees = {
  /** franchiseeId 오름차순, 최대 10건. */
  franchisees: SimulationFranchiseeSearchItem[]
  /** 다음 페이지 커서. **결과가 없으면 null** — null이면 더 부르지 않는다. */
  lastId: number | null
}

/* ------------------------------------------------------------------ *
 * POST /simulations/reports  (공개, 동기 계산 — SSE·폴링 아님)
 * ------------------------------------------------------------------ */

export type SimulationReportRequest = {
  franchisee: boolean
  /**
   * `franchisee === true`일 때 필수. 검색 응답의 `franchiseeId`를 그대로 넘긴다.
   * 누락하면 400 `SIMULATION_004`, 없는 아이디면 404 `SIMULATION_003`.
   */
  franchiseeId?: number | null
  /** 자치구 **코드** (예: `'11740'`). V1의 `gugun`(구 이름)이 아니다. */
  districtCode: string
  serviceCode: string
  /** 매장 면적 (㎡). 1 이상. 소/중/대는 프리셋일 뿐 임의 양수를 허용한다. */
  storeSize: number
  floorType: SimulationFloorType
  /** `yyyyQ` (예: `'20233'`). 생략 시 서버 기본값 20233. 성별·연령/성수기 분석의 기준 분기다. */
  periodCode?: string
}

/** 요청 조건 + 서버가 되채운 명칭(자치구명/업종명/브랜드명). 리포트 상단 조건 요약에 쓴다. */
export type SimulationCondition = {
  franchisee: boolean
  /** 비프랜차이즈면 null. */
  franchiseeId: number | null
  /** 비프랜차이즈면 null. */
  brandName: string | null
  districtCode: string
  districtName: string
  serviceCode: string
  serviceName: string
  storeSize: number
  floorType: SimulationFloorTypeMeta
  periodCode: string
}

/** 권리금 수준. **총비용에 포함되지 않는다** — 별도 참고 정보로 표기한다. */
export type SimulationKeyMoney = {
  /** 권리금 유 비율 (%) */
  keyMoneyRatio: number
  /** 권리금 평균 (만원) */
  keyMoneyAverage: number
  /** ㎡당 평균 (만원/㎡) */
  keyMoneyLevel: number
}

/** 단위: 만원. */
export type SimulationCostDetail = {
  /** 월 임대료 */
  rentPrice: number
  /** 보증금 — 월 임대료 10개월분 */
  deposit: number
  interior: number
  /** 가맹 부담금 합계. **비프랜차이즈면 null.** */
  levy: number | null
}

/** 단위: 만원. */
export type SimulationSimilarFranchisee = {
  franchiseeId: number
  brandName: string
  totalPrice: number
  subscription: number
  education: number
  /** 가맹 보증금 (임차 보증금과 다르다) */
  deposit: number
  etc: number
  interior: number
}

export type SimulationAgeSalesItem = {
  ageGroupName: string
  /** 매출액 (만원) */
  salesAmount: number
}

export type SimulationGenderAgeAnalysis = {
  /** 남성 매출 비중 (%) */
  malePercent: number
  /** 여성 매출 비중 (%) */
  femalePercent: number
  /** 매출 상위 연령대 Top 3. V1의 `first/second/third`를 배열로 대체한 것이다. */
  topAgeGroups: SimulationAgeSalesItem[]
}

export type SimulationSeasonAnalysis = {
  peakMonths: number[]
  offPeakMonths: number[]
}

export type SimulationReport = {
  condition: SimulationCondition
  /** 기준 데이터 연도. **화면에 반드시 노출한다**("2024년 기준 데이터로 계산된 결과입니다"). */
  dataBaseYear: string
  /** 예상 총 창업 비용 (만원) */
  totalPrice: number
  keyMoney: SimulationKeyMoney
  costDetail: SimulationCostDetail
  /** 예상 총비용에 근접한 프랜차이즈 Top 5. */
  similarFranchisees: SimulationSimilarFranchisee[]
  /**
   * 해당 자치구×업종의 매출 데이터가 없으면 **null**.
   * 오류가 아니다 — 에러 화면이 아니라 **섹션 숨김** 대상이다.
   */
  genderAgeAnalysis: SimulationGenderAgeAnalysis | null
  /** 위와 동일하게 데이터 없으면 **null** → 섹션 숨김. */
  seasonAnalysis: SimulationSeasonAnalysis | null
}

/**
 * 비교 화면용 요청 쌍.
 *
 * V2에는 비교 API가 없다. `POST /simulations/reports`를 2회 호출해 클라이언트에서 나란히 둔다.
 * (V1의 `selectedType` 같은 서버 측 비교 파라미터는 존재하지 않는다.)
 */
export type SimulationComparisonRequestPair = readonly [
  SimulationReportRequest,
  SimulationReportRequest,
]

/** 두 리포트를 나란히 렌더하기 위한 결과 쌍. 순서는 요청 쌍과 같다. */
export type SimulationComparisonPair = readonly [
  SimulationReport,
  SimulationReport,
]

/* ------------------------------------------------------------------ *
 * POST/GET /simulations/histories  (인증 필수)
 * ------------------------------------------------------------------ */

export type SimulationHistorySaveRequest = {
  franchisee: boolean
  franchiseeId?: number | null
  districtCode: string
  serviceCode: string
  storeSize: number
  floorType: SimulationFloorType
  /** 리포트의 `totalPrice`를 그대로 넘긴다 (만원, 0 이상). */
  totalPrice: number
}

export type SimulationHistoryItem = {
  /**
   * AUTO_INCREMENT 정수다. 다른 도메인의 Snowflake 아이디(문자열)와 달리 **number**로 안전하다.
   * (Swagger: `integer/int64`.)
   */
  historyId: number
  franchisee: boolean
  /** 비프랜차이즈면 null. 저장 응답에는 `franchiseeId`가 없고 `brandName`만 되채워진다. */
  brandName: string | null
  districtCode: string
  districtName: string
  serviceCode: string
  serviceName: string
  storeSize: number
  floorType: SimulationFloorTypeMeta
  /** 만원 */
  totalPrice: number
  /** 저장 시점 계산에 쓰인 기준 연도. 목록에서 "언제 기준으로 계산됐는지" 표시에 쓴다. */
  dataBaseYear: string
  /** ISO-8601 date-time */
  createdAt: string
}

export type SimulationHistorySaveResult = {
  history: SimulationHistoryItem
}

export type SimulationHistories = {
  /** 최신순 */
  histories: SimulationHistoryItem[]
  /** 0부터 */
  page: number
  /** 1~50 */
  size: number
  totalElements: number
  totalPages: number
}

/* ------------------------------------------------------------------ *
 * 응답 봉투
 * ------------------------------------------------------------------ */

export type SimulationStoreSizesResponse = ApiResponse<SimulationStoreSizes>
export type SimulationFranchiseesResponse = ApiResponse<SimulationFranchisees>
export type SimulationReportResponse = ApiResponse<SimulationReport>
export type SimulationHistorySaveResponse =
  ApiResponse<SimulationHistorySaveResult>
export type SimulationHistoriesResponse = ApiResponse<SimulationHistories>

/* ------------------------------------------------------------------ *
 * V1 잔재 — 삭제 예정
 * ------------------------------------------------------------------ */

/**
 * `src/lib/api/share.ts`(#3 소유, 이 슬라이스에서 수정 금지)가 아직 이 이름들을
 * `@/types/simulation`에서 import 한다. 해당 파일을 건드리지 않고 컴파일을 유지하기 위한 re-export다.
 *
 * V2 `ShareTargetType` 5종에 시뮬레이션이 없다 — 시뮬레이션 공유는 V2 범위 밖이다.
 * share 슬라이스에서 `/share/[token]`의 V1 시뮬레이션 처리가 정리되면 이 re-export도 삭제한다.
 */
export type {
  SharedSimulationPayload,
  SharedSimulationPayloadResponse,
  SimulationShareRequest,
  SimulationShareResponse,
} from '@/types/simulation-v1-legacy'
