import type { ApiResponse } from '@/types/api'

export type StatusMetric = 'footTraffic' | 'sales' | 'opened' | 'closed'

export type DistrictFootTrafficTopTenItem = {
  districtCode: string
  districtName: string
  totalFootTraffic: number
  footTrafficChangeRate: number
}

export type DistrictSalesTopTenItem = {
  districtCode: string
  districtName: string
  totalSalesAmount: number
  salesChangeRate: number
}

export type DistrictOpenedStoreTopTenItem = {
  districtCode: string
  districtName: string
  openedStoreCount: number
  openingChangeRate: number
}

export type DistrictClosedStoreTopTenItem = {
  districtCode: string
  districtName: string
  closedStoreCount: number
  closureChangeRate: number
}

export type DistrictTopTenSummary = {
  footTrafficTopTenItems: DistrictFootTrafficTopTenItem[]
  salesTopTenItems: DistrictSalesTopTenItem[]
  openedStoreTopTenItems: DistrictOpenedStoreTopTenItem[]
  closedStoreTopTenItems: DistrictClosedStoreTopTenItem[]
}

export type StatusRankedItem = {
  rank: number
  districtCode: string
  districtName: string
  value: number
  changeRate: number
}

export type StatusTopTenByMetric = Record<StatusMetric, StatusRankedItem[]>

/**
 * `GET /analysis-rankings` 항목 (B2 — 분석 인기 순위).
 *
 * ⚠️ **아직 어느 화면도 이 타입을 쓰지 않는다.** 계약만 확인해 박아 둔 상태이고
 * 어디에 노출할지는 미결이다. 화면을 붙일 때 세 가지를 반드시 다룰 것.
 *
 * 1. **`areaName` 이 null 일 수 있다.** 그대로 그리면 목록에 빈 칸이 뜬다. 자치구
 *    순위라면 `/districts/top-ten` 이 이미 주는 이름표로 메울 수 있고, 그래도 없으면
 *    코드라도 적는다 — 이름 자리가 비면 누를 수는 있는데 무엇인지 모르는 버튼이 된다.
 * 2. **변화율이 없다.** 조회 수 집계에 「전기」가 없다. 0 으로 채워 「변동 없음」을
 *    그리면 틀린 말이 되므로, 다른 지표와 같은 카드에 담는다면 배지를 감춰야 한다.
 * 3. **이 API 만 따로 죽는다.** 집계 파이프라인(Kafka/Redis) 장애 시 여기만
 *    `RANKING_001`(503)로 응답하고 다른 분석 API 는 멀쩡하다. 이 실패가 화면 전체의
 *    실패로 번지지 않게 할 것.
 */
export type AnalysisRankingItem = {
  rank: number
  areaCode: string
  /** 영역 이름. **수집되지 않았으면 null 이다**(스냅샷 문구 그대로). */
  areaName: string | null
  viewCount: number
}

export type AnalysisRankingBody = {
  areaType: CodeNameDescriptionMetadata
  /** 집계 시간 윈도우(시간). 화면이 "최근 N시간" 을 적을 때 쓴다. */
  windowHours: number
  rankings: AnalysisRankingItem[]
}

export type CodeNameDescriptionMetadata = {
  code: string
  name: string
  description: string
}

export type ChangeIndicator = {
  changeIndicatorCode: string
  changeIndicatorName: string
  averageOpenedMonths: number
  averageClosedMonths: number
}

export type DistrictPeriodFootTrafficItem = {
  periodCode: string
  totalFootTraffic: number
}

export type DistrictTimeSlotFootTrafficItem = {
  footTrafficTime00To06: number
  footTrafficTime06To11: number
  footTrafficTime11To14: number
  footTrafficTime14To17: number
  footTrafficTime17To21: number
  footTrafficTime21To24: number
  dominantTimeSlotType: CodeNameDescriptionMetadata
}

export type DistrictGenderFootTrafficItem = {
  maleFootTraffic: number
  femaleFootTraffic: number
  dominantGenderType: CodeNameDescriptionMetadata
}

export type DistrictAgeGroupFootTrafficItem = {
  age10FootTraffic: number
  age20FootTraffic: number
  age30FootTraffic: number
  age40FootTraffic: number
  age50FootTraffic: number
  age60PlusFootTraffic: number
  dominantAgeGroupType: CodeNameDescriptionMetadata
}

export type DistrictDayOfWeekFootTrafficItem = {
  mondayFootTraffic: number
  tuesdayFootTraffic: number
  wednesdayFootTraffic: number
  thursdayFootTraffic: number
  fridayFootTraffic: number
  saturdayFootTraffic: number
  sundayFootTraffic: number
  dominantDayOfWeekType: CodeNameDescriptionMetadata
}

export type DistrictFootTrafficDetail = {
  periodTrend: CodeNameDescriptionMetadata
  periodTotalFootTrafficList: DistrictPeriodFootTrafficItem[]
  timeSlot: DistrictTimeSlotFootTrafficItem
  gender: DistrictGenderFootTrafficItem
  ageGroup: DistrictAgeGroupFootTrafficItem
  dayOfWeek: DistrictDayOfWeekFootTrafficItem
}

export type DistrictStoreServiceTopItem = {
  serviceCode: string
  serviceName: string
  totalStoreCount: number
}

export type DistrictOpenedStoreAdministrationTopItem = {
  administrationCode: string
  administrationName: string
  openedStoreCount: number
  openingRate: number
}

export type DistrictClosedStoreAdministrationTopItem = {
  administrationCode: string
  administrationName: string
  closedStoreCount: number
  closureRate: number
}

export type DistrictStoreDetail = {
  topStoreServices: DistrictStoreServiceTopItem[]
  topOpenedAdministrations: DistrictOpenedStoreAdministrationTopItem[]
  topClosedAdministrations: DistrictClosedStoreAdministrationTopItem[]
}

export type DistrictSalesServiceTopItem = {
  serviceCode: string
  serviceName: string
  salesChangeRate: number
}

export type DistrictSalesAdministrationTopItem = {
  administrationCode: string
  administrationName: string
  totalSalesAmount: number
  salesChangeRate: number
}

export type DistrictSalesDetail = {
  topSalesServices: DistrictSalesServiceTopItem[]
  topSalesAdministrations: DistrictSalesAdministrationTopItem[]
}

export type DistrictDetail = {
  changeIndicator: ChangeIndicator
  footTraffic: DistrictFootTrafficDetail
  store: DistrictStoreDetail
  sales: DistrictSalesDetail
}

export type DistrictTopTenResponse = ApiResponse<DistrictTopTenSummary>
export type AnalysisRankingResponse = ApiResponse<AnalysisRankingBody>
export type DistrictDetailResponse = ApiResponse<DistrictDetail>
