export type DistrictMetric = {
  districtCode: string
  salesLabel: string
  footTrafficLabel: string
  trend: number[]
}

// 대표 예시 수치(실데이터 아님). hover 툴팁의 "느낌" 전달용.
const METRICS: DistrictMetric[] = [
  { districtCode: '11110', salesLabel: '월 매출 2.4억', footTrafficLabel: '일 유동 5.1만', trend: [42, 45, 43, 48, 52, 55, 58] },
  { districtCode: '11140', salesLabel: '월 매출 2.1억', footTrafficLabel: '일 유동 4.7만', trend: [38, 40, 39, 41, 44, 43, 46] },
  { districtCode: '11170', salesLabel: '월 매출 2.8억', footTrafficLabel: '일 유동 6.0만', trend: [50, 52, 55, 54, 58, 60, 63] },
  { districtCode: '11200', salesLabel: '월 매출 1.9억', footTrafficLabel: '일 유동 4.2만', trend: [30, 33, 32, 35, 37, 39, 40] },
  { districtCode: '11215', salesLabel: '월 매출 2.2억', footTrafficLabel: '일 유동 4.9만', trend: [40, 42, 41, 44, 46, 45, 48] },
  { districtCode: '11230', salesLabel: '월 매출 2.0억', footTrafficLabel: '일 유동 4.4만', trend: [35, 36, 38, 37, 40, 42, 43] },
  { districtCode: '11260', salesLabel: '월 매출 2.5억', footTrafficLabel: '일 유동 5.3만', trend: [44, 46, 45, 49, 51, 53, 56] },
  { districtCode: '11290', salesLabel: '월 매출 2.3억', footTrafficLabel: '일 유동 5.0만', trend: [41, 43, 42, 45, 47, 49, 50] },
  { districtCode: '11305', salesLabel: '월 매출 1.7억', footTrafficLabel: '일 유동 3.8만', trend: [28, 30, 29, 31, 33, 34, 35] },
  { districtCode: '11320', salesLabel: '월 매출 1.8억', footTrafficLabel: '일 유동 4.0만', trend: [30, 31, 33, 32, 35, 36, 38] },
  { districtCode: '11350', salesLabel: '월 매출 2.0억', footTrafficLabel: '일 유동 4.5만', trend: [34, 36, 35, 38, 40, 41, 43] },
  { districtCode: '11380', salesLabel: '월 매출 1.9억', footTrafficLabel: '일 유동 4.3만', trend: [32, 34, 33, 36, 38, 39, 40] },
  { districtCode: '11410', salesLabel: '월 매출 2.6억', footTrafficLabel: '일 유동 5.6만', trend: [46, 48, 47, 51, 53, 55, 58] },
  { districtCode: '11440', salesLabel: '월 매출 3.1억', footTrafficLabel: '일 유동 7.2만', trend: [55, 58, 60, 62, 66, 69, 72] },
  { districtCode: '11470', salesLabel: '월 매출 1.8억', footTrafficLabel: '일 유동 4.1만', trend: [31, 33, 32, 35, 37, 38, 39] },
  { districtCode: '11500', salesLabel: '월 매출 2.2억', footTrafficLabel: '일 유동 4.8만', trend: [39, 41, 40, 43, 45, 47, 49] },
  { districtCode: '11530', salesLabel: '월 매출 2.1억', footTrafficLabel: '일 유동 4.6만', trend: [37, 39, 38, 41, 43, 44, 46] },
  { districtCode: '11545', salesLabel: '월 매출 2.0억', footTrafficLabel: '일 유동 4.4만', trend: [35, 37, 36, 39, 41, 42, 44] },
  { districtCode: '11560', salesLabel: '월 매출 2.7억', footTrafficLabel: '일 유동 5.8만', trend: [48, 50, 49, 53, 55, 57, 60] },
  { districtCode: '11590', salesLabel: '월 매출 1.9억', footTrafficLabel: '일 유동 4.2만', trend: [32, 34, 33, 36, 38, 39, 41] },
  { districtCode: '11620', salesLabel: '월 매출 1.8억', footTrafficLabel: '일 유동 4.0만', trend: [30, 32, 31, 34, 36, 37, 38] },
  { districtCode: '11650', salesLabel: '월 매출 2.3억', footTrafficLabel: '일 유동 5.0만', trend: [41, 43, 42, 46, 48, 50, 52] },
  { districtCode: '11680', salesLabel: '월 매출 3.6억', footTrafficLabel: '일 유동 8.4만', trend: [60, 64, 66, 70, 74, 78, 82] },
  { districtCode: '11710', salesLabel: '월 매출 3.0억', footTrafficLabel: '일 유동 6.9만', trend: [52, 55, 57, 60, 63, 66, 70] },
  { districtCode: '11740', salesLabel: '월 매출 2.4억', footTrafficLabel: '일 유동 5.2만', trend: [43, 45, 44, 48, 50, 52, 54] },
]

const METRIC_BY_CODE = new Map(METRICS.map(m => [m.districtCode, m]))

export function getDistrictMetric(
  districtCode: string,
): DistrictMetric | undefined {
  return METRIC_BY_CODE.get(districtCode)
}

// pulse/glow로 강조할 상위 상권(강남·마포·송파).
export const TOP_DISTRICT_CODES = ['11680', '11440', '11710'] as const
