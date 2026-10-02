import { describe, expect, it } from 'vitest'

import {
  isWellFormedAnalysisPeriod,
  readAnalysisPeriod,
  readCatalogLatest,
  resolveAnalysisPeriod,
  toAnalysisPeriodRange,
} from '@/lib/analysis/period-catalog'

/**
 * 분기 범위와 해석(period-catalog.md D5-1 · D7 #1·#2).
 *
 * 범위는 2021년 1분기 ~ 서버 기본 분기다(사용자 결정 D0). 교집합(`availablePeriodCodes`)으로 좁히지 않는다.
 */

describe('readAnalysisPeriod', () => {
  it('형식이 맞고 2021년 이상이면 그대로 읽는다 — 상한은 보지 않는다', () => {
    expect(readAnalysisPeriod('20211')).toBe('20211')
    expect(readAnalysisPeriod(' 20233 ')).toBe('20233')
    expect(readAnalysisPeriod('20304')).toBe('20304')
  })

  it('형식이 틀리거나 하한보다 이르면 null(= 지정 없음, 최신)', () => {
    for (const value of [
      '',
      '2026',
      '20265',
      '20204',
      'abcde',
      null,
      undefined,
    ]) {
      expect(readAnalysisPeriod(value)).toBeNull()
    }
    expect(isWellFormedAnalysisPeriod('20194')).toBe(false)
  })
})

describe('toAnalysisPeriodRange', () => {
  const range = toAnalysisPeriodRange('20261')!

  it('연도는 2021 ~ 최신 분기의 연도다', () => {
    expect(range.latest).toBe('20261')
    expect(range.years).toEqual([2021, 2022, 2023, 2024, 2025, 2026])
  })

  it('최신 연도는 최신 분기까지만, 지난 연도는 네 분기를 연다', () => {
    expect(range.quartersOf(2026)).toEqual([1])
    expect(range.quartersOf(2025)).toEqual([1, 2, 3, 4])
    expect(range.quartersOf(2021)).toEqual([1, 2, 3, 4])
    expect(range.quartersOf(2020)).toEqual([])
    expect(range.quartersOf(2027)).toEqual([])
  })

  it('옛 공유 링크의 분기(20233)는 범위 안이다', () => {
    expect(range.isSupported('20233')).toBe(true)
    expect(range.isSupported('20211')).toBe(true)
    expect(range.isSupported('20261')).toBe(true)
    expect(range.isSupported('20262')).toBe(false)
    expect(range.isSupported('20204')).toBe(false)
    expect(range.isSupported('2026')).toBe(false)
  })

  it('연도를 바꾸면 없는 분기를 그 연도의 마지막 분기로 내린다', () => {
    expect(range.clampQuarter(2026, 4)).toBe(1)
    expect(range.clampQuarter(2025, 3)).toBe(3)
    expect(range.clampQuarter(2019, 3)).toBe(3)
  })

  it('새 분기가 적재되면 상한이 따라간다 — 상수를 올리지 않는다', () => {
    const next = toAnalysisPeriodRange('20262')!
    expect(next.quartersOf(2026)).toEqual([1, 2])
    expect(next.isSupported('20262')).toBe(true)
  })

  it('최신 분기가 없거나 틀리면 범위도 없다', () => {
    for (const value of [null, undefined, '', '2026Q1', '20194']) {
      expect(toAnalysisPeriodRange(value)).toBeNull()
    }
  })
})

describe('resolveAnalysisPeriod (D5-1)', () => {
  const range = toAnalysisPeriodRange('20261')

  it('URL 분기가 있고 카탈로그를 기다리는 중이면 URL 분기로 먼저 요청한다', () => {
    expect(resolveAnalysisPeriod('20233', null)).toBe('20233')
  })

  it('URL 분기가 범위 안이면 그대로', () => {
    expect(resolveAnalysisPeriod('20233', range)).toBe('20233')
  })

  it('URL 분기가 최신보다 새로우면 최신으로 내린다', () => {
    expect(resolveAnalysisPeriod('20263', range)).toBe('20261')
  })

  it('URL 분기가 없으면 최신', () => {
    expect(resolveAnalysisPeriod(null, range)).toBe('20261')
  })

  it('URL 분기도 카탈로그도 없으면 아직 정할 수 없다', () => {
    expect(resolveAnalysisPeriod(null, null)).toBeNull()
  })
})

describe('readCatalogLatest', () => {
  it('defaultPeriodCode 를 읽고, 없거나 틀리면 null', () => {
    expect(readCatalogLatest({ defaultPeriodCode: '20261' })).toBe('20261')
    expect(readCatalogLatest({ defaultPeriodCode: null })).toBeNull()
    expect(readCatalogLatest({ defaultPeriodCode: '2026-1' })).toBeNull()
    expect(readCatalogLatest(null)).toBeNull()
  })
})
