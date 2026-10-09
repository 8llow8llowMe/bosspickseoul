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
  /** 실제로 조회한 분기. 분기를 생략해 보내면 서버가 해석한 최신 분기다(BE #464). */
  currentPeriodCode?: string | null
  previousPeriodCode?: string | null
  footTrafficTopTenItems: DistrictFootTrafficTopTenItem[]
  salesTopTenItems: DistrictSalesTopTenItem[]
  openedStoreTopTenItems: DistrictOpenedStoreTopTenItem[]
  closedStoreTopTenItems: DistrictClosedStoreTopTenItem[]
}

/*
 * `GET /districts/rankings` 항목(BE #433). `top-ten` 항목과 같은 필드에 `rank` 를 더했다.
 * - `rank` 는 표준 경쟁 순위다. 같은 값은 같은 순위이고 다음 순위는 건너뛴다(1, 2, 2, 4).
 * - 변화율은 **null 일 수 있다.** 직전 분기 행이 없거나 직전 값이 0 이면 0 으로 채우지 않고 null 을 준다.
 */
export type DistrictFootTrafficRankingItem = {
  rank: number
  districtCode: string
  districtName: string
  totalFootTraffic: number
  footTrafficChangeRate: number | null
}

export type DistrictSalesRankingItem = {
  rank: number
  districtCode: string
  districtName: string
  totalSalesAmount: number
  salesChangeRate: number | null
}

export type DistrictOpenedStoreRankingItem = {
  rank: number
  districtCode: string
  districtName: string
  openedStoreCount: number
  openingChangeRate: number | null
}

export type DistrictClosedStoreRankingItem = {
  rank: number
  districtCode: string
  districtName: string
  closedStoreCount: number
  closureChangeRate: number | null
}

/** 네 지표마다 현재 분기 행이 있는 자치구 전부(서울 25개 구). 지표 값 내림차순, 같으면 구 코드 오름차순. */
export type DistrictRankingSummary = {
  currentPeriodCode?: string | null
  previousPeriodCode?: string | null
  footTrafficRankings: DistrictFootTrafficRankingItem[]
  salesRankings: DistrictSalesRankingItem[]
  openedStoreRankings: DistrictOpenedStoreRankingItem[]
  closedStoreRankings: DistrictClosedStoreRankingItem[]
}

export type StatusRankedItem = {
  rank: number
  districtCode: string
  districtName: string
  value: number
  /** 전기 대비 변화율(%). 비교할 직전 분기 값이 없으면 null 이다 — 0(변동 없음)과 다르다. */
  changeRate: number | null
}

/**
 * 화면에서 고른 자치구. 현재 지표 전체 순위에 그 구가 없으면 `rankedItem` 은 null 이다
 * (`resolveStatusSelectedDistrict`).
 */
export type StatusSelectedDistrict = {
  districtCode: string
  districtName: string
  /** 현재 지표 전체 순위의 그 구 항목. 그 분기 행이 없어 순위에서 빠졌으면 null. */
  rankedItem: StatusRankedItem | null
}

export type StatusTopTenByMetric = Record<StatusMetric, StatusRankedItem[]>

/** 지표별 전체 순위. 모양은 Top10 과 같고 길이만 다르다(최대 25). */
export type StatusRankingsByMetric = StatusTopTenByMetric

/**
 * `GET /analysis-rankings` 항목 (B2 — 분석 인기 순위).
 *
 * 쓰는 곳: 홈 「지금 많이 본 지역」 섹션(`components/home/popular-districts.tsx`,
 * `areaType=DISTRICT`). 표시 로직은 `lib/home/popular-districts.ts` 에 순수 함수로 있다.
 * 아래 세 가지는 **다른 areaType 으로 화면을 늘릴 때도 그대로 적용된다.**
 *
 * 1. **`areaName` 이 null 일 수 있다.** 그대로 그리면 목록에 빈 칸이 뜬다. 자치구는
 *    정적 표(`@/data/districts`)로 추가 요청 없이 메우고, 그래도 없으면 코드라도
 *    적는다 — 이름 자리가 비면 누를 수는 있는데 무엇인지 모르는 버튼이 된다.
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
  /** 실제로 조회한 분기(BE #464). */
  currentPeriodCode?: string | null
  previousPeriodCode?: string | null
  changeIndicator: ChangeIndicator
  footTraffic: DistrictFootTrafficDetail
  store: DistrictStoreDetail
  sales: DistrictSalesDetail
}

export type DistrictTopTenResponse = ApiResponse<DistrictTopTenSummary>
export type DistrictRankingsResponse = ApiResponse<DistrictRankingSummary>
export type AnalysisRankingResponse = ApiResponse<AnalysisRankingBody>
export type DistrictDetailResponse = ApiResponse<DistrictDetail>
