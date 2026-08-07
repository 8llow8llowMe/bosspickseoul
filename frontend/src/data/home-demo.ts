export type CompetitionLevel = 'low' | 'medium' | 'high'

export type DemoSample = {
  districtId: string
  industryId: string
  salesTrend: number[] // 최근 6개월 대표 지수
  salesChangePct: number // 전월 대비 %(부호 포함)
  footTraffic: string
  competition: CompetitionLevel
  insight: string
}

export const DISTRICTS: { id: string; name: string }[] = [
  { id: 'gangnam', name: '강남구' },
  { id: 'mapo', name: '마포구' },
  { id: 'jongno', name: '종로구' },
  { id: 'seongdong', name: '성동구' },
]

export const INDUSTRIES: { id: string; name: string }[] = [
  { id: 'cafe', name: '카페' },
  { id: 'restaurant', name: '음식점' },
  { id: 'convenience', name: '편의점' },
  { id: 'gym', name: '헬스장' },
]

export const DEFAULT_SELECTION = { districtId: 'gangnam', industryId: 'cafe' }

// 대표 예시 데이터 — 실제 수치가 아니다.
const SAMPLES: Record<string, Omit<DemoSample, 'districtId' | 'industryId'>> = {
  'gangnam:cafe': {
    salesTrend: [82, 88, 91, 87, 95, 100],
    salesChangePct: 5.3,
    footTraffic: '일평균 4.2만 명',
    competition: 'high',
    insight: '유동인구는 많지만 카페 밀도가 높아 경쟁이 치열합니다.',
  },
  'mapo:cafe': {
    salesTrend: [70, 74, 78, 83, 88, 92],
    salesChangePct: 4.5,
    footTraffic: '일평균 3.1만 명',
    competition: 'medium',
    insight: '20~30대 유입이 꾸준해 카페 수요가 안정적입니다.',
  },
  'jongno:restaurant': {
    salesTrend: [95, 92, 90, 93, 96, 98],
    salesChangePct: 2.1,
    footTraffic: '일평균 5.0만 명',
    competition: 'high',
    insight: '직장인 점심 수요가 크지만 기존 음식점 경쟁이 강합니다.',
  },
  'seongdong:cafe': {
    salesTrend: [60, 66, 72, 79, 85, 90],
    salesChangePct: 6.2,
    footTraffic: '일평균 2.4만 명',
    competition: 'low',
    insight: '상권이 성장 중이라 카페 진입 여지가 있습니다.',
  },
  'mapo:restaurant': {
    salesTrend: [78, 80, 83, 82, 86, 89],
    salesChangePct: 3.4,
    footTraffic: '일평균 3.4만 명',
    competition: 'medium',
    insight: '저녁 상권이 활발해 음식점 회전이 빠른 편입니다.',
  },
  'gangnam:convenience': {
    salesTrend: [88, 90, 89, 92, 94, 96],
    salesChangePct: 2.2,
    footTraffic: '일평균 4.2만 명',
    competition: 'medium',
    insight: '오피스 수요로 편의점 매출이 평일에 집중됩니다.',
  },
}

const FALLBACK: Omit<DemoSample, 'districtId' | 'industryId'> = {
  salesTrend: [72, 75, 78, 80, 83, 86],
  salesChangePct: 3.0,
  footTraffic: '일평균 3.0만 명',
  competition: 'medium',
  insight: '대표 예시 기준으로 수요와 경쟁이 보통 수준입니다.',
}

export function getDemoSample(
  districtId: string,
  industryId: string,
): DemoSample {
  const base = SAMPLES[`${districtId}:${industryId}`] ?? FALLBACK
  return { districtId, industryId, ...base }
}
