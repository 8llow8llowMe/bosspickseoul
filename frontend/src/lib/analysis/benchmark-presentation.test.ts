import { describe, expect, it } from 'vitest'

import {
  formatSalesPerStoreIndex,
  formatStoreCount,
  toBenchmarkSalesView,
} from '@/lib/analysis/benchmark-presentation'
import type {
  CommercialBenchmark,
  CommercialSalesPerStoreSummary,
} from '@/types/commercial-analysis'

/**
 * 「지역 평균 대비」 탭 「비교 분석」의 매출 비교 표시 로직을 고정한다(#544).
 *
 * 1. 값 있음 — 지수 두 개(자치구 = 100, 행정동 = 100)와 세 단위 점포당 월 매출·점포 수.
 * 2. 점포 결측 — 점포 행이 없거나 점포 수가 0 이면 점포당 매출이 0 원이 아니라 「데이터 없음」.
 * 3. 지수 null — 지수가 0 이 아니라 「데이터 없음」이고 결론 문장은 남은 지수로 말한다.
 * 4. 키 없음(#485 이전 응답) — 기존 총액 3개로 물러선다.
 */

/** dev 실측 응답(`3110438` · `CS100010` · `20261`). */
const SALES_PER_STORE: CommercialSalesPerStoreSummary = {
  serviceCode: 'CS100010',
  serviceName: '커피-음료',
  district: {
    code: '11350',
    name: '노원구',
    monthlySalesAmount: 15_415_802_889,
    storeCount: 809,
    monthlySalesPerStore: 19_055_381,
  },
  administration: {
    code: '11350600',
    name: '공릉2동',
    monthlySalesAmount: 1_326_394_061,
    storeCount: 102,
    monthlySalesPerStore: 13_003_863,
  },
  commercial: {
    code: '3110438',
    name: '경춘선숲길 우측',
    monthlySalesAmount: 164_964_564,
    storeCount: 20,
    monthlySalesPerStore: 8_248_228,
  },
  indexVsDistrict: 43.3,
  indexVsAdministration: 63.4,
}

const BASE_BENCHMARK: CommercialBenchmark = {
  commercialCode: '3110438',
  commercialName: '경춘선숲길 우측',
  districtCode: '11350',
  districtName: '노원구',
  administrationCode: '11350600',
  administrationName: '공릉2동',
  summary: null,
  salesSummary: {
    district: {
      code: '11350',
      name: '노원구',
      monthlySalesAmount: 15_415_802_889,
    },
    administration: {
      code: '11350600',
      name: '공릉2동',
      monthlySalesAmount: 1_326_394_061,
    },
    commercial: {
      code: '3110438',
      name: '경춘선숲길 우측',
      monthlySalesAmount: 164_964_564,
    },
  },
  incomeSummary: null,
  benchmarkHighlights: null,
}

describe('toBenchmarkSalesView', () => {
  it('값이 있으면 지수 두 개와 세 단위 점포당 매출·점포 수를 낸다', () => {
    const view = toBenchmarkSalesView({
      ...BASE_BENCHMARK,
      salesPerStore: SALES_PER_STORE,
    })

    expect(view).toEqual({
      mode: 'per-store',
      conclusion:
        '경춘선숲길 우측 커피-음료 점포의 월 매출은 노원구 점포 평균의 43.3% 수준이에요.',
      indices: [
        { scope: 'district', baseName: '노원구', value: 43.3 },
        { scope: 'administration', baseName: '공릉2동', value: 63.4 },
      ],
      units: [
        {
          scope: 'district',
          label: '노원구',
          monthlySalesPerStore: 19_055_381,
          storeCount: 809,
          monthlySalesAmount: 15_415_802_889,
        },
        {
          scope: 'administration',
          label: '공릉2동',
          monthlySalesPerStore: 13_003_863,
          storeCount: 102,
          monthlySalesAmount: 1_326_394_061,
        },
        {
          scope: 'commercial',
          label: '경춘선숲길 우측',
          monthlySalesPerStore: 8_248_228,
          storeCount: 20,
          monthlySalesAmount: 164_964_564,
        },
      ],
    })
  })

  it('점포 행이 없거나 점포 수가 0 이면 점포당 매출을 0 이 아니라 null 로 둔다', () => {
    const view = toBenchmarkSalesView({
      ...BASE_BENCHMARK,
      salesPerStore: {
        ...SALES_PER_STORE,
        administration: {
          ...SALES_PER_STORE.administration,
          storeCount: 0,
          monthlySalesPerStore: null,
        },
        commercial: {
          ...SALES_PER_STORE.commercial,
          storeCount: null,
          monthlySalesPerStore: null,
        },
        indexVsDistrict: null,
        indexVsAdministration: null,
      },
    })

    expect(view.mode).toBe('per-store')
    if (view.mode !== 'per-store') return
    expect(view.units[1]).toMatchObject({
      label: '공릉2동',
      storeCount: 0,
      monthlySalesPerStore: null,
    })
    expect(view.units[2]).toMatchObject({
      label: '경춘선숲길 우측',
      storeCount: null,
      monthlySalesPerStore: null,
      // 총액은 점포와 무관하게 남는다.
      monthlySalesAmount: 164_964_564,
    })
    expect(view.indices.map(index => index.value)).toEqual([null, null])
    expect(view.conclusion).toBeNull()
  })

  it('자치구 지수만 null 이면 결론 문장을 행정동 지수로 말한다', () => {
    const view = toBenchmarkSalesView({
      ...BASE_BENCHMARK,
      salesPerStore: { ...SALES_PER_STORE, indexVsDistrict: null },
    })

    expect(view.mode).toBe('per-store')
    if (view.mode !== 'per-store') return
    expect(view.indices).toEqual([
      { scope: 'district', baseName: '노원구', value: null },
      { scope: 'administration', baseName: '공릉2동', value: 63.4 },
    ])
    expect(view.conclusion).toBe(
      '경춘선숲길 우측 커피-음료 점포의 월 매출은 공릉2동 점포 평균의 63.4% 수준이에요.',
    )
  })

  it('업종 이름이 없으면 결론 문장을 비운다', () => {
    const view = toBenchmarkSalesView({
      ...BASE_BENCHMARK,
      salesPerStore: { ...SALES_PER_STORE, serviceName: null },
    })

    expect(view.mode === 'per-store' && view.conclusion).toBeNull()
  })

  it('salesPerStore 키가 없는 구 응답이면 총액 3개로 물러선다', () => {
    expect(toBenchmarkSalesView(BASE_BENCHMARK)).toEqual({
      mode: 'total',
      units: [
        {
          scope: 'district',
          label: '노원구',
          monthlySalesAmount: 15_415_802_889,
        },
        {
          scope: 'administration',
          label: '공릉2동',
          monthlySalesAmount: 1_326_394_061,
        },
        {
          scope: 'commercial',
          label: '경춘선숲길 우측',
          monthlySalesAmount: 164_964_564,
        },
      ],
    })
  })

  it('응답이 비어도 단위 줄을 지우지 않고 이름 대신 단위명을 쓴다', () => {
    expect(toBenchmarkSalesView(null)).toEqual({
      mode: 'total',
      units: [
        { scope: 'district', label: '자치구', monthlySalesAmount: null },
        { scope: 'administration', label: '행정동', monthlySalesAmount: null },
        { scope: 'commercial', label: '상권', monthlySalesAmount: null },
      ],
    })
  })
})

describe('formatSalesPerStoreIndex', () => {
  it('소수 첫째 자리까지 적고 null 은 데이터 없음으로 둔다', () => {
    expect(formatSalesPerStoreIndex(43.3)).toBe('43.3')
    expect(formatSalesPerStoreIndex(100)).toBe('100')
    expect(formatSalesPerStoreIndex(null)).toBe('데이터 없음')
    expect(formatSalesPerStoreIndex(undefined)).toBe('데이터 없음')
  })
})

describe('formatStoreCount', () => {
  it('점포 수를 개 단위로 적고 0 은 그대로, null 은 데이터 없음으로 둔다', () => {
    expect(formatStoreCount(809)).toBe('점포 809개')
    expect(formatStoreCount(0)).toBe('점포 0개')
    expect(formatStoreCount(null)).toBe('점포 수 데이터 없음')
  })
})
