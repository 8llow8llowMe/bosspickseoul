import { describe, expect, it } from 'vitest'

import type { DistrictRhythm } from '@/components/home/district-rhythm'
import { SEOUL_STATUS_FEATURES } from '@/data/seoul-status-map'
import { parseAnalysisSelection } from '@/lib/analysis/selection'

import {
  HERO_PICKER_OPTIONS,
  describePickPreview,
  heroPickerName,
  resolveHeroPrimaryCta,
} from './hero-picker'

const rhythm = (over: Partial<DistrictRhythm> = {}): DistrictRhythm => ({
  latest: { periodCode: '20242', total: 12_345_678, changeRate: 3.14 },
  indicatorName: '다이나믹',
  slots: [
    { start: 0, end: 6, perHour: 1, peak: false },
    { start: 14, end: 17, perHour: 9, peak: true },
  ],
  days: [],
  weekendDeltaPct: null,
  ...over,
})

/**
 * 히어로 자치구 피커의 화면 규칙(hero-picker-and-mobile-first-screen.md D3-2·D4-2·D4-3).
 */
describe('HERO_PICKER_OPTIONS', () => {
  it('25개 자치구를 가나다순으로 둔다', () => {
    const names = HERO_PICKER_OPTIONS.map(option => option.name)

    expect(names).toHaveLength(25)
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'ko')))
    expect(names[0]).toBe('강남구')
  })

  it('모든 코드가 히어로 지도에 있다', () => {
    const mapCodes = new Set(SEOUL_STATUS_FEATURES.map(f => f.districtCode))

    for (const option of HERO_PICKER_OPTIONS) {
      expect(mapCodes.has(option.code), option.name).toBe(true)
    }
  })

  it('코드로 이름을 찾고, 모르는 코드는 null', () => {
    expect(heroPickerName('11440')).toBe('마포구')
    expect(heroPickerName('99999')).toBeNull()
  })
})

describe('resolveHeroPrimaryCta', () => {
  it('고르기 전에는 빈 분석 화면으로 간다', () => {
    expect(resolveHeroPrimaryCta(null)).toEqual({
      href: '/analysis',
      label: '내 상권 분석하기',
      carried: false,
    })
  })

  it('고른 자치구를 /analysis 에 싣고 라벨에 이름을 쓴다', () => {
    const cta = resolveHeroPrimaryCta('11440')

    expect(cta.href).toBe('/analysis?districtCode=11440')
    expect(cta.label).toBe('마포구 분석하기')
    expect(cta.carried).toBe(true)
    // 분석 화면이 실제로 그 구를 읽는다 — 빌더가 바뀌어도 왕복이 깨지지 않게 잠근다.
    const params = new URL(cta.href, 'https://example.test').searchParams
    expect(parseAnalysisSelection(params).districtCode).toBe('11440')
  })

  it('지도에 없는 코드는 싣지 않는다', () => {
    expect(resolveHeroPrimaryCta('99999').carried).toBe(false)
  })
})

describe('describePickPreview', () => {
  it('분기 유동인구(전분기 대비) · 최다 시간대 순서로 말한다', () => {
    expect(describePickPreview(rhythm())).toEqual([
      '2024년 2분기 유동인구 1,235만명 (전분기 대비 +3.1%)',
      '14~17시 최다',
    ])
  })

  it('변화율이 없으면 괄호 조각을 뺀다', () => {
    const [first] = describePickPreview(
      rhythm({
        latest: { periodCode: '20242', total: 12_345_678, changeRate: null },
      }),
    )

    expect(first).toBe('2024년 2분기 유동인구 1,235만명')
  })

  it('말할 값이 없으면 빈 배열이다(→ 줄을 숨긴다)', () => {
    expect(describePickPreview(rhythm({ latest: null, slots: [] }))).toEqual([])
  })
})
