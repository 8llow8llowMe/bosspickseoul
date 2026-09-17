import { describe, expect, it } from 'vitest'

import {
  hasExpenseByCategory,
  hasRegionalExpense,
  toExpenseCategoryRows,
  toRegionalExpenseRows,
} from '@/lib/analysis/expense-presentation'
import type {
  CommercialIncomeAndExpense,
  CommercialIncomeSummary,
} from '@/types/commercial-analysis'

const income = (
  overrides: Partial<CommercialIncomeAndExpense> = {},
): CommercialIncomeAndExpense => ({
  expenseByCategoryItem: {
    groceryExpenseAmount: 1_000,
    clothingExpenseAmount: 2_000,
    medicalExpenseAmount: 3_000,
    householdExpenseAmount: 4_000,
    transportationExpenseAmount: 5_000,
    leisureExpenseAmount: 6_000,
    cultureExpenseAmount: 7_000,
    educationExpenseAmount: 8_000,
    entertainmentExpenseAmount: 9_000,
  },
  ...overrides,
})

describe('toExpenseCategoryRows', () => {
  it('9개 항목을 정의 순서대로 만든다', () => {
    const rows = toExpenseCategoryRows(income())

    expect(rows).toHaveLength(9)
    expect(rows[0]).toEqual({ label: '식료품', value: 1_000 })
    expect(rows[8]).toEqual({ label: '유흥', value: 9_000 })
  })

  it('expenseByCategoryItem 이 null 이어도 9줄 구조는 유지하고 값만 null 로 둔다', () => {
    const rows = toExpenseCategoryRows(income({ expenseByCategoryItem: null }))

    expect(rows).toHaveLength(9)
    expect(rows.every(row => row.value === null)).toBe(true)
  })
})

describe('hasExpenseByCategory', () => {
  it('값이 하나라도 양수면 그린다', () => {
    expect(hasExpenseByCategory(income())).toBe(true)
  })

  /**
   * 20241 분기 이후 상권 단위 원천이 전 행 0 이라 백엔드가 항목 묶음을 null 로
   * 강등해 내려준다. 이때 9줄을 「데이터 없음」으로 늘어놓지 않고 섹션을 빈 상태로 둔다.
   */
  it('expenseByCategoryItem 이 null 이면 그리지 않는다', () => {
    expect(hasExpenseByCategory(income({ expenseByCategoryItem: null }))).toBe(
      false,
    )
  })

  it('응답 본문이 통째로 없어도 그리지 않는다', () => {
    expect(hasExpenseByCategory(null)).toBe(false)
    expect(hasExpenseByCategory(undefined)).toBe(false)
  })

  /** 백엔드가 강등을 놓쳐 0 만 담아 보내도 화면이 스스로 막는다. */
  it('전 항목이 0 이면 그리지 않는다', () => {
    const allZero = income({
      expenseByCategoryItem: {
        groceryExpenseAmount: 0,
        clothingExpenseAmount: 0,
        medicalExpenseAmount: 0,
        householdExpenseAmount: 0,
        transportationExpenseAmount: 0,
        leisureExpenseAmount: 0,
        cultureExpenseAmount: 0,
        educationExpenseAmount: 0,
        entertainmentExpenseAmount: 0,
      },
    })

    expect(hasExpenseByCategory(allZero)).toBe(false)
  })

  it('일부 항목만 0 이면 그대로 그린다 — 0 은 「그 항목에 안 쓴다」는 정보다', () => {
    const partialZero = income({
      expenseByCategoryItem: {
        ...income().expenseByCategoryItem,
        entertainmentExpenseAmount: 0,
      },
    })

    expect(hasExpenseByCategory(partialZero)).toBe(true)
    expect(toExpenseCategoryRows(partialZero)[8].value).toBe(0)
  })
})

describe('toRegionalExpenseRows', () => {
  it('자치구·행정동·상권 순서로 세 줄을 만든다', () => {
    const summary: CommercialIncomeSummary = {
      district: { code: '11680', name: '강남구', totalExpenseAmount: 300 },
      administration: {
        code: '11680640',
        name: '역삼1동',
        totalExpenseAmount: 200,
      },
      commercial: { code: '3110971', name: '역삼역', totalExpenseAmount: 100 },
    }

    expect(toRegionalExpenseRows(summary)).toEqual([
      { scope: 'district', label: '강남구', totalExpenseAmount: 300 },
      { scope: 'administration', label: '역삼1동', totalExpenseAmount: 200 },
      { scope: 'commercial', label: '역삼역', totalExpenseAmount: 100 },
    ])
  })

  /**
   * 세 단위는 각각 독립적으로 null 이다. 상권만 비는 것이 지금의 정상 상태이고,
   * 그 줄을 지우면 「이 상권은 값이 없다」는 사실 자체가 화면에서 사라진다.
   */
  it('상권만 null 이어도 세 줄을 그대로 남기고 값만 null 로 둔다', () => {
    const rows = toRegionalExpenseRows({
      district: { code: '11680', name: '강남구', totalExpenseAmount: 300 },
      administration: {
        code: '11680640',
        name: '역삼1동',
        totalExpenseAmount: 200,
      },
      commercial: null,
    })

    expect(rows).toHaveLength(3)
    expect(rows[2]).toEqual({
      scope: 'commercial',
      label: '상권',
      totalExpenseAmount: null,
    })
    expect(hasRegionalExpense(rows)).toBe(true)
  })

  it('행정동만 남아도 자치구·상권 줄은 기본 라벨로 유지한다', () => {
    const rows = toRegionalExpenseRows({
      administration: {
        code: '11680640',
        name: '역삼1동',
        totalExpenseAmount: 200,
      },
    })

    expect(rows.map(row => row.label)).toEqual(['자치구', '역삼1동', '상권'])
    expect(rows.map(row => row.totalExpenseAmount)).toEqual([null, 200, null])
  })

  it('이름이 비거나 공백이면 단위 기본 라벨로 물러난다', () => {
    const rows = toRegionalExpenseRows({
      district: { code: '11680', name: '   ', totalExpenseAmount: 300 },
      administration: { code: '11680640', name: null, totalExpenseAmount: 200 },
      commercial: { code: '3110971', totalExpenseAmount: 100 },
    })

    expect(rows.map(row => row.label)).toEqual(['자치구', '행정동', '상권'])
  })

  it('총 지출액이 유한수가 아니면 null 로 떨어뜨린다', () => {
    const rows = toRegionalExpenseRows({
      district: { code: '11680', name: '강남구', totalExpenseAmount: null },
      administration: null,
      commercial: null,
    })

    expect(rows.every(row => row.totalExpenseAmount === null)).toBe(true)
    expect(hasRegionalExpense(rows)).toBe(false)
  })
})

describe('hasRegionalExpense', () => {
  it('응답이 통째로 없으면 빈 상태다', () => {
    expect(hasRegionalExpense(toRegionalExpenseRows(null))).toBe(false)
    expect(hasRegionalExpense(toRegionalExpenseRows(undefined))).toBe(false)
  })

  /** 0 은 「안 썼다」는 값이라 빈 상태가 아니다. */
  it('총 지출액 0 도 값으로 센다', () => {
    const rows = toRegionalExpenseRows({
      district: { code: '11680', name: '강남구', totalExpenseAmount: 0 },
      administration: null,
      commercial: null,
    })

    expect(hasRegionalExpense(rows)).toBe(true)
  })
})
