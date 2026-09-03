export type CompetitionLevel = 'low' | 'medium' | 'high'

export type DemoSample = {
  districtId: string
  industryId: string
  salesTrend: number[] // 최근 6개월 대표 지수
  salesChangePct: number // 전월 대비 %(부호 포함)
  footTraffic: string
  competition: CompetitionLevel
  closureRate: string // 연 환산 폐업률 대표 예시
  insight: string
}

/**
 * 02단계(미니데모)·03단계(추천 미리보기)가 함께 보는 선택.
 * `ProductStory` 가 소유하고 두 단계·카운터에 그대로 내려준다 — 단계마다 따로
 * 고르면 "네 단계로 좁힙니다"가 화면에서 실제로 일어나지 않는다(D8-3).
 */
export type DemoSelection = { districtId: string; industryId: string }

export type DistrictOption = {
  id: string
  name: string
  /** 자치구 코드(`src/data/districts.ts`의 `gooCode`와 대조 확인함). 03단계 API 경로에 쓴다. */
  code: string
}

export type IndustryOption = {
  id: string
  name: string
  /** 서울시 상권 업종 코드(`src/data/simulation-service-types.ts`에 실재). 03단계 서비스코드로 쓴다. */
  code: string
}

export const DISTRICTS: DistrictOption[] = [
  { id: 'gangnam', name: '강남구', code: '11680' },
  { id: 'mapo', name: '마포구', code: '11440' },
  { id: 'jongno', name: '종로구', code: '11110' },
  { id: 'seongdong', name: '성동구', code: '11200' },
]

export const INDUSTRIES: IndustryOption[] = [
  { id: 'cafe', name: '카페', code: 'CS100010' },
  { id: 'restaurant', name: '음식점', code: 'CS100001' },
  { id: 'convenience', name: '편의점', code: 'CS300002' },
  { id: 'gym', name: '헬스장', code: 'CS200005' },
]

export const DEFAULT_SELECTION: DemoSelection = {
  districtId: 'gangnam',
  industryId: 'cafe',
}

export const findDistrictOption = (id: string): DistrictOption | undefined =>
  DISTRICTS.find(district => district.id === id)

export const findIndustryOption = (id: string): IndustryOption | undefined =>
  INDUSTRIES.find(industry => industry.id === id)

// 대표 예시 데이터 — 실제 수치가 아니다.
const SAMPLES: Record<string, Omit<DemoSample, 'districtId' | 'industryId'>> = {
  'gangnam:cafe': {
    salesTrend: [82, 88, 91, 87, 95, 100],
    salesChangePct: 5.3,
    footTraffic: '일평균 4.2만 명',
    competition: 'high',
    closureRate: '연 4.1%',
    insight: '유동인구는 많지만 카페 밀도가 높아 경쟁이 치열합니다.',
  },
  'mapo:cafe': {
    salesTrend: [70, 74, 78, 83, 88, 92],
    salesChangePct: 4.5,
    footTraffic: '일평균 3.1만 명',
    competition: 'medium',
    closureRate: '연 2.8%',
    insight: '20~30대 유입이 꾸준해 카페 수요가 안정적입니다.',
  },
  'jongno:restaurant': {
    salesTrend: [95, 92, 90, 93, 96, 98],
    salesChangePct: 2.1,
    footTraffic: '일평균 5.0만 명',
    competition: 'high',
    closureRate: '연 3.9%',
    insight: '직장인 점심 수요가 크지만 기존 음식점 경쟁이 강합니다.',
  },
  'seongdong:cafe': {
    salesTrend: [60, 66, 72, 79, 85, 90],
    salesChangePct: 6.2,
    footTraffic: '일평균 2.4만 명',
    competition: 'low',
    closureRate: '연 1.6%',
    insight: '상권이 성장 중이라 카페 진입 여지가 있습니다.',
  },
  'mapo:restaurant': {
    salesTrend: [78, 80, 83, 82, 86, 89],
    salesChangePct: 3.4,
    footTraffic: '일평균 3.4만 명',
    competition: 'medium',
    closureRate: '연 3.0%',
    insight: '저녁 상권이 활발해 음식점 회전이 빠른 편입니다.',
  },
  'gangnam:convenience': {
    salesTrend: [88, 90, 89, 92, 94, 96],
    salesChangePct: 2.2,
    footTraffic: '일평균 4.2만 명',
    competition: 'medium',
    closureRate: '연 2.4%',
    insight: '오피스 수요로 편의점 매출이 평일에 집중됩니다.',
  },
}

const FALLBACK: Omit<DemoSample, 'districtId' | 'industryId'> = {
  salesTrend: [72, 75, 78, 80, 83, 86],
  salesChangePct: 3.0,
  footTraffic: '일평균 3.0만 명',
  competition: 'medium',
  closureRate: '연 3.2%',
  insight: '대표 예시 기준으로 수요와 경쟁이 보통 수준입니다.',
}

export function getDemoSample(
  districtId: string,
  industryId: string,
): DemoSample {
  const base = SAMPLES[`${districtId}:${industryId}`] ?? FALLBACK
  return { districtId, industryId, ...base }
}
