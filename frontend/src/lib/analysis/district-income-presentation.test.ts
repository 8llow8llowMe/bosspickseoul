import { describe, expect, it } from 'vitest'

import {
  DISTRICT_INCOME_FALLBACK_EMPTY_DESCRIPTION,
  DISTRICT_INCOME_PROXY_BADGE_LABEL,
  formatReferenceDate,
  toDistrictIncomeView,
} from '@/lib/analysis/district-income-presentation'
import type {
  CommercialIncomeAndExpense,
  DistrictIncomeProvenance,
} from '@/types/commercial-analysis'

/**
 * 「자치구 평균 소득 (대체)」 표시 로직의 세 갈래를 고정한다(#500).
 *
 * 1. 값 있음(`DISTRICT_PROXY`) — 금액 + 대체 배지 + 기준일 + 면책·출처.
 * 2. 제공 없음(`UNAVAILABLE`) — 0 원이 아니라 빈 상태, 사유는 서버 면책 문장.
 * 3. 필드 없음(#415 이전 응답) — 빈 상태, 사유는 기본 문장.
 */

const PROXY_PROVENANCE: DistrictIncomeProvenance = {
  scope: { code: 'DISTRICT_PROXY', name: '자치구 대체', description: '...' },
  scopeCode: '11110',
  scopeName: '종로구',
  sourceId: 'data.go.kr:3046077',
  sourceLabel: '국민연금공단 자격 시군구 신고 평균소득월액',
  sourceUrl: 'https://www.data.go.kr/data/3046077/fileData.do',
  referenceDate: '2024-12-31',
  disclaimer: '… 종로구 평균입니다(기준일 2024-12-31). …',
}

const UNAVAILABLE_DISCLAIMER =
  '이 분기에 쓸 수 있는 자치구 평균 소득 자료가 없어 소득 지표를 제공하지 않습니다.'

const UNAVAILABLE_PROVENANCE: DistrictIncomeProvenance = {
  scope: { code: 'UNAVAILABLE', name: '제공 없음', description: null },
  scopeCode: null,
  scopeName: null,
  sourceId: 'data.go.kr:3046077',
  sourceLabel: '국민연금공단 자격 시군구 신고 평균소득월액',
  sourceUrl: 'https://www.data.go.kr/data/3046077/fileData.do',
  referenceDate: null,
  disclaimer: UNAVAILABLE_DISCLAIMER,
}

const withIncome = (
  districtAverageIncome: CommercialIncomeAndExpense['districtAverageIncome'],
): CommercialIncomeAndExpense => ({
  expenseCategories: null,
  totalExpenseAmount: null,
  provenance: null,
  districtAverageIncome,
})

describe('toDistrictIncomeView', () => {
  it('DISTRICT_PROXY 값은 금액·배지·기준일·면책·출처를 함께 낸다', () => {
    expect(
      toDistrictIncomeView(
        withIncome({ amount: 1_555_244, provenance: PROXY_PROVENANCE }),
      ),
    ).toEqual({
      available: true,
      amount: 1_555_244,
      badgeLabel: DISTRICT_INCOME_PROXY_BADGE_LABEL,
      scopeName: '종로구',
      referenceDateLabel: '2024년 12월 31일',
      description: '종로구 · 2024년 12월 31일 기준',
      disclaimer: PROXY_PROVENANCE.disclaimer,
      sourceLabel: PROXY_PROVENANCE.sourceLabel,
      sourceUrl: PROXY_PROVENANCE.sourceUrl,
    })
  })

  it('UNAVAILABLE 은 빈 상태이고 서버 면책 문장을 사유로 쓴다', () => {
    expect(
      toDistrictIncomeView(
        withIncome({ amount: null, provenance: UNAVAILABLE_PROVENANCE }),
      ),
    ).toEqual({ available: false, emptyDescription: UNAVAILABLE_DISCLAIMER })
  })

  it('필드가 없는 구 응답은 기본 사유로 빈 상태가 된다', () => {
    const legacy: CommercialIncomeAndExpense = {
      expenseCategories: null,
      totalExpenseAmount: null,
      provenance: null,
    }

    for (const income of [legacy, withIncome(null), null, undefined]) {
      expect(toDistrictIncomeView(income)).toEqual({
        available: false,
        emptyDescription: DISTRICT_INCOME_FALLBACK_EMPTY_DESCRIPTION,
      })
    }
  })

  /* 신고 평균소득이 0원인 구는 없다. 0 은 「없음」이 잘못 실린 것이라 0 원으로 그리지 않는다. */
  it('대체 범위여도 금액이 0·null·NaN 이면 그리지 않고 값 설명을 사유로 쓰지 않는다', () => {
    for (const amount of [0, null, Number.NaN]) {
      expect(
        toDistrictIncomeView(
          withIncome({ amount, provenance: PROXY_PROVENANCE }),
        ),
      ).toEqual({
        available: false,
        emptyDescription: DISTRICT_INCOME_FALLBACK_EMPTY_DESCRIPTION,
      })
    }
  })

  it('모르는 범위 코드는 값이 와도 자치구 평균이라고 단언하지 않는다', () => {
    const view = toDistrictIncomeView(
      withIncome({
        amount: 1_555_244,
        provenance: {
          ...PROXY_PROVENANCE,
          scope: { code: 'COMMERCIAL' as never },
        },
      }),
    )

    expect(view.available).toBe(false)
  })

  it('기준일·자치구 이름이 없으면 설명에서 그 조각만 뺀다', () => {
    const view = toDistrictIncomeView(
      withIncome({
        amount: 1_555_244,
        provenance: { ...PROXY_PROVENANCE, referenceDate: null },
      }),
    )
    expect(view.available && view.description).toBe('종로구')

    const bare = toDistrictIncomeView(
      withIncome({
        amount: 1_555_244,
        provenance: { scope: { code: 'DISTRICT_PROXY' } },
      }),
    )
    expect(bare.available && bare.description).toBeNull()
  })
})

describe('formatReferenceDate', () => {
  it('YYYY-MM-DD 만 읽고 월·일의 앞 0 을 뗀다', () => {
    expect(formatReferenceDate('2024-12-31')).toBe('2024년 12월 31일')
    expect(formatReferenceDate('2025-01-05')).toBe('2025년 1월 5일')
  })

  it('형식이 다르면 날짜를 지어내지 않는다', () => {
    expect(formatReferenceDate('20241231')).toBeNull()
    expect(formatReferenceDate('2024-12-31T00:00:00')).toBeNull()
    expect(formatReferenceDate(null)).toBeNull()
    expect(formatReferenceDate('')).toBeNull()
  })
})
