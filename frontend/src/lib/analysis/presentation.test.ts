import { describe, expect, it } from 'vitest'

import {
  ANALYSIS_TABS,
  formatAnalysisValue,
  formatKoreanMoney,
  formatPeriodCode,
  getMetricMaximum,
  hasPositiveRow,
  normalizeAnalysisTab,
  splitPeerStoreRows,
  toMetricRows,
  toPeerStoreRows,
} from '@/lib/analysis/presentation'

describe('analysis presentation', () => {
  it('지원하지 않는 탭은 요약으로 정규화한다', () => {
    expect(normalizeAnalysisTab('trend')).toBe('trend')
    expect(normalizeAnalysisTab('unknown')).toBe('summary')
    expect(normalizeAnalysisTab(null)).toBe('summary')
  })

  it('null 지표를 0으로 바꾸지 않는다', () => {
    expect(formatAnalysisValue(null, '원')).toBe('데이터 없음')
    expect(formatAnalysisValue(undefined, '명')).toBe('데이터 없음')
    expect(formatAnalysisValue(12000, '명')).toBe('12,000명')
  })

  it('금액을 억/만원 단위로 절사해 표기한다', () => {
    expect(formatKoreanMoney(345345345)).toBe('3억 4534만원')
    expect(formatKoreanMoney(3234278)).toBe('323만원')
    expect(formatKoreanMoney(471000000000)).toBe('4,710억원')
    expect(formatKoreanMoney(300000000)).toBe('3억원')
    expect(formatKoreanMoney(5000)).toBe('5,000원')
    expect(formatKoreanMoney(0)).toBe('0원')
    expect(formatKoreanMoney(null)).toBe('데이터 없음')
  })

  it("formatAnalysisValue는 unit이 '원'이면 억/만원 표기로 위임한다", () => {
    expect(formatAnalysisValue(345345345, '원')).toBe('3억 4534만원')
    expect(formatAnalysisValue(12000, '명')).toBe('12,000명')
  })

  it('분기 코드를 사용자 문구로 바꾼다', () => {
    expect(formatPeriodCode('20233')).toBe('2023년 3분기')
    expect(formatPeriodCode('invalid')).toBe('기준 시점 정보 없음')
  })

  it('객체 필드를 표시용 지표 배열로 바꾸고 최댓값을 구한다', () => {
    const rows = toMetricRows(
      { mondayFootTraffic: 10, tuesdayFootTraffic: null },
      [
        ['월', 'mondayFootTraffic'],
        ['화', 'tuesdayFootTraffic'],
      ] as const,
    )

    expect(rows).toEqual([
      { label: '월', value: 10 },
      { label: '화', value: null },
    ])
    expect(getMetricMaximum(rows)).toBe(10)
  })

  it('benchmark 탭 라벨이 내용과 맞는다', () => {
    // 「비교」는 상권끼리 비교한다는 기대를 만든다. 이 탭은 지역 평균 대비다.
    const benchmark = ANALYSIS_TABS.find(tab => tab.value === 'benchmark')

    expect(benchmark?.label).toBe('지역 평균 대비')
  })

  it('탭 쿼리 값은 바꾸지 않는다', () => {
    // 값을 바꾸면 공유된 ?tab=benchmark 링크가 깨진다.
    expect(ANALYSIS_TABS.map(tab => tab.value)).toContain('benchmark')
  })
})

/*
 * `peerStores` 는 **선택한 업종을 뺀** 나머지 업종이다(커피-음료로 조회하면 커피-음료가
 * 목록에 없다). 실측 응답 그대로를 표본으로 쓴다.
 */
describe('toPeerStoreRows', () => {
  const sample = [
    { serviceName: '한식음식점', totalStoreCount: 40 },
    { serviceName: '치킨전문점', totalStoreCount: 0 },
    { serviceName: '양식음식점', totalStoreCount: 13 },
    { serviceName: '분식전문점', totalStoreCount: 5 },
  ]

  it('점포 수 많은 순으로 세운다', () => {
    expect(toPeerStoreRows(sample).map(row => row.label)).toEqual([
      '한식음식점',
      '양식음식점',
      '분식전문점',
      '치킨전문점',
    ])
  })

  /* 「치킨전문점 0개」는 비어 있는 자리를 뜻하는 정보다 — 지우면 그 사실이 사라진다. */
  it('0 개인 업종도 남긴다', () => {
    expect(toPeerStoreRows(sample)).toContainEqual({
      label: '치킨전문점',
      value: 0,
    })
  })

  it('이름이나 수가 없는 항목은 버린다', () => {
    expect(
      toPeerStoreRows([
        { serviceName: null, totalStoreCount: 3 },
        { serviceName: '  ', totalStoreCount: 3 },
        { serviceName: '제과점', totalStoreCount: null },
        { serviceName: '제과점', totalStoreCount: 2 },
      ]),
    ).toEqual([{ label: '제과점', value: 2 }])
  })

  it('없거나 빈 배열이면 빈 목록이다', () => {
    expect(toPeerStoreRows(null)).toEqual([])
    expect(toPeerStoreRows(undefined)).toEqual([])
    expect(toPeerStoreRows([])).toEqual([])
  })
})

describe('hasPositiveRow', () => {
  /* 길이 0 인 막대만 늘어선 차트는 눈금도 못 만들고 아무것도 말하지 않는다. */
  it('전부 0 이면 그리지 않는다', () => {
    expect(hasPositiveRow([{ label: 'a', value: 0 }])).toBe(false)
    expect(hasPositiveRow([])).toBe(false)
    expect(
      hasPositiveRow([
        { label: 'a', value: 0 },
        { label: 'b', value: 1 },
      ]),
    ).toBe(true)
  })
})

/*
 * recharts 는 길이 0 인 막대에 값 라벨을 그리지 않는다 — 실측에서 「치킨전문점」이
 * 이름만 있고 숫자가 없는 줄로 나왔다. 0 은 「그 업종이 없다」는 정보라 버리지 않고
 * 차트 밖 문장으로 옮긴다.
 */
describe('splitPeerStoreRows', () => {
  const rows = [
    { label: '한식음식점', value: 40 },
    { label: '치킨전문점', value: 0 },
    { label: '제과점', value: 2 },
    { label: '중식음식점', value: 0 },
  ]

  it('0 은 차트에서 빼고 이름만 따로 모은다', () => {
    const { charted, absentLabels } = splitPeerStoreRows(rows)

    expect(charted.map(row => row.label)).toEqual(['한식음식점', '제과점'])
    expect(absentLabels).toEqual(['치킨전문점', '중식음식점'])
  })

  it('전부 0 이면 그릴 것이 없다', () => {
    const { charted, absentLabels } = splitPeerStoreRows([
      { label: 'a', value: 0 },
    ])

    expect(charted).toEqual([])
    expect(absentLabels).toEqual(['a'])
  })
})
