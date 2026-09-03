import { describe, expect, it } from 'vitest'
import {
  formatRankingWindow,
  formatViewCount,
  resolveDistrictName,
  toPopularDistricts,
  toPopularDistrictsView,
} from '@/lib/home/popular-districts'
import type { AnalysisRankingBody } from '@/types/status'

describe('resolveDistrictName', () => {
  it('서버가 준 이름을 그대로 쓴다', () => {
    expect(resolveDistrictName('11680', '강남구')).toBe('강남구')
  })

  it('areaName 이 null 이면 정적 표로 메운다', () => {
    // 스냅샷: "영역 이름 (수집되지 않았으면 null)". 빈 이름은 무엇인지 모르는 버튼이 된다.
    expect(resolveDistrictName('11680', null)).toBe('강남구')
  })

  it('areaName 이 공백뿐이어도 정적 표로 메운다', () => {
    expect(resolveDistrictName('11740', '   ')).toBe('강동구')
  })

  it('표에 없는 코드면 코드라도 적는다 — 절대 비우지 않는다', () => {
    expect(resolveDistrictName('99999', null)).toBe('99999')
  })
})

describe('formatViewCount', () => {
  it('천단위 구분과 「회」 단위를 붙인다', () => {
    expect(formatViewCount(1234)).toBe('1,234회')
  })

  it('음수는 0 으로 눌러 적는다', () => {
    expect(formatViewCount(-5)).toBe('0회')
  })

  it('소수는 버린다', () => {
    expect(formatViewCount(12.9)).toBe('12회')
  })
})

describe('formatRankingWindow', () => {
  it('24시간은 그대로 시간으로 읽는다', () => {
    expect(formatRankingWindow(24)).toBe('최근 24시간')
  })

  it('24의 배수는 일 단위로 읽는다', () => {
    expect(formatRankingWindow(72)).toBe('최근 3일')
  })

  it('배수가 아니면 시간으로 읽는다', () => {
    expect(formatRankingWindow(6)).toBe('최근 6시간')
  })

  it('이상한 값이면 창 표기를 포기한다 — 틀린 기간을 적지 않는다', () => {
    expect(formatRankingWindow(0)).toBeNull()
    expect(formatRankingWindow(-1)).toBeNull()
    expect(formatRankingWindow(Number.NaN)).toBeNull()
  })
})

describe('toPopularDistricts', () => {
  it('자치구를 1단계로 채운 상권분석 링크를 만든다', () => {
    const [item] = toPopularDistricts([
      { rank: 1, areaCode: '11680', areaName: '강남구', viewCount: 100 },
    ])

    expect(item.href).toBe('/analysis?districtCode=11680')
    expect(item.name).toBe('강남구')
    expect(item.rank).toBe(1)
  })

  it('areaCode 가 비면 버린다 — 누를 곳 없는 행을 남기지 않는다', () => {
    const items = toPopularDistricts([
      { rank: 1, areaCode: '', areaName: '이름만 있음', viewCount: 10 },
      { rank: 2, areaCode: '11740', areaName: null, viewCount: 5 },
    ])

    expect(items).toHaveLength(1)
    expect(items[0].districtCode).toBe('11740')
    expect(items[0].name).toBe('강동구')
  })

  it('변화율 필드를 만들어 내지 않는다 — 집계에 전기가 없다', () => {
    const [item] = toPopularDistricts([
      { rank: 1, areaCode: '11680', areaName: '강남구', viewCount: 100 },
    ])

    expect(item).not.toHaveProperty('changeRate')
  })
})

describe('toPopularDistrictsView', () => {
  it('항목과 창 문구를 함께 낸다', () => {
    const body: AnalysisRankingBody = {
      areaType: { code: 'DISTRICT', name: '자치구', description: '' },
      windowHours: 24,
      rankings: [
        { rank: 1, areaCode: '11680', areaName: '강남구', viewCount: 100 },
      ],
    }

    const view = toPopularDistrictsView(body)

    expect(view.windowLabel).toBe('최근 24시간')
    expect(view.items).toHaveLength(1)
  })

  it('rankings 가 없어도 터지지 않는다', () => {
    const body = {
      areaType: { code: 'DISTRICT', name: '자치구', description: '' },
      windowHours: 24,
    } as AnalysisRankingBody

    expect(toPopularDistrictsView(body).items).toEqual([])
  })
})
