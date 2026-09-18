import { describe, expect, it } from 'vitest'

import {
  hasExpenseByCategory,
  hasRegionalExpense,
  toExpenseCategoryRows,
  toExpenseProvenanceView,
  toRegionalExpenseProxyNote,
  toRegionalExpenseRows,
} from '@/lib/analysis/expense-presentation'
import type {
  CommercialExpenseProvenance,
  CommercialIncomeAndExpense,
  CommercialIncomeSummary,
} from '@/types/commercial-analysis'

/**
 * 소비 표시 로직의 세 갈래를 고정한다(#416).
 *
 * 1. 상권 네이티브 — 9항목, 배지도 면책도 없다.
 * 2. 행정동 대체 — 10항목(여가·문화가 합쳐지고 기타·음식이 더해진다) + 면책·출처.
 * 3. 제공 없음 — 항목이 없고 이때만 섹션이 빈 상태가 된다.
 */

const COMMERCIAL_LABELS = [
  '식료품',
  '의류·신발',
  '의료',
  '생활용품',
  '교통',
  '여가',
  '문화',
  '교육',
  '유흥',
] as const

const ADMINISTRATION_LABELS = [
  '식료품',
  '의류·신발',
  '의료',
  '생활용품',
  '교통',
  '여가·문화',
  '교육',
  '유흥',
  '음식',
  '기타',
] as const

const categories = (labels: readonly string[]) =>
  labels.map((label, index) => ({
    key: `KEY_${index}`,
    label,
    amount: (index + 1) * 1_000,
  }))

const NATIVE_PROVENANCE: CommercialExpenseProvenance = {
  scope: {
    code: 'COMMERCIAL',
    name: '상권',
    description: '상권 단위 원천 그대로입니다.',
  },
  scopeCode: '3110971',
  scopeName: '역삼역',
  sourceId: 'VwsmTrdarNcmCnsmpQq',
  sourceLabel: '서울시 상권분석서비스(소득소비-상권)',
  sourceUrl: 'https://data.seoul.go.kr/dataList/OA-15572/S/1/datasetView.do',
  effectivePeriodCode: '20233',
  disclaimer: null,
}

const PROXY_PROVENANCE: CommercialExpenseProvenance = {
  scope: {
    code: 'ADMINISTRATION_PROXY',
    name: '행정동 대체',
    description:
      '상권 단위 원천이 중단돼 소속 행정동 값으로 대체한 추정치입니다.',
  },
  scopeCode: '11110515',
  scopeName: '청운효자동',
  sourceId: 'VwsmAdstrdNcmCnsmpW',
  sourceLabel: '서울시 상권분석서비스(소득소비-행정동)',
  sourceUrl: 'https://data.seoul.go.kr/dataList/OA-22166/S/1/datasetView.do',
  effectivePeriodCode: '20261',
  disclaimer:
    '2024년 1분기부터 서울 열린데이터광장이 상권 단위 소비 제공을 중단해, 소속 행정동(청운효자동)의 추정 소비로 대체 표시합니다. 같은 행정동 안의 상권은 같은 값입니다.',
}

const UNAVAILABLE_PROVENANCE: CommercialExpenseProvenance = {
  scope: {
    code: 'UNAVAILABLE',
    name: '제공 없음',
    description: '이 분기에는 대체할 행정동 값도 없습니다.',
  },
  scopeCode: null,
  scopeName: null,
  sourceId: 'VwsmTrdarNcmCnsmpQq',
  sourceLabel: '서울시 상권분석서비스(소득소비-상권)',
  sourceUrl: 'https://data.seoul.go.kr/dataList/OA-15572/S/1/datasetView.do',
  effectivePeriodCode: null,
  disclaimer: '이 분기에는 상권 소비도 소속 행정동 소비도 제공되지 않습니다.',
}

const nativeIncome: CommercialIncomeAndExpense = {
  expenseCategories: categories(COMMERCIAL_LABELS),
  totalExpenseAmount: 45_000,
  provenance: NATIVE_PROVENANCE,
}

const proxyIncome: CommercialIncomeAndExpense = {
  expenseCategories: categories(ADMINISTRATION_LABELS),
  totalExpenseAmount: 55_000,
  provenance: PROXY_PROVENANCE,
}

const unavailableIncome: CommercialIncomeAndExpense = {
  expenseCategories: null,
  totalExpenseAmount: null,
  provenance: UNAVAILABLE_PROVENANCE,
}

describe('toExpenseCategoryRows', () => {
  it('상권 네이티브는 서버가 준 9항목을 배열 순서대로 만든다', () => {
    const rows = toExpenseCategoryRows(nativeIncome)

    expect(rows.map(row => row.label)).toEqual([...COMMERCIAL_LABELS])
    expect(rows[0]).toEqual({ label: '식료품', value: 1_000 })
    expect(rows[8]).toEqual({ label: '유흥', value: 9_000 })
  })

  /**
   * 항목 수가 고정이 아니다. 대체는 여가·문화가 한 항목으로 합쳐지고 음식·기타가
   * 더해져 10개다. 프런트가 키 목록을 들고 있으면 여기서 틀린다.
   */
  it('행정동 대체는 구성이 다른 10항목도 그대로 받아 그린다', () => {
    const rows = toExpenseCategoryRows(proxyIncome)

    expect(rows.map(row => row.label)).toEqual([...ADMINISTRATION_LABELS])
    expect(rows).toHaveLength(10)
  })

  it('항목이 없으면 빈 배열이다 — 없는 줄을 만들어 채우지 않는다', () => {
    expect(toExpenseCategoryRows(unavailableIncome)).toEqual([])
    expect(toExpenseCategoryRows(null)).toEqual([])
    expect(toExpenseCategoryRows(undefined)).toEqual([])
  })

  it('라벨이 비면 키로 물러나고, 둘 다 없는 항목은 버린다', () => {
    const rows = toExpenseCategoryRows({
      ...proxyIncome,
      expenseCategories: [
        { key: 'GROCERY', label: '   ', amount: 10 },
        { key: null, label: null, amount: 20 },
        { key: 'DINING', label: '음식', amount: 30 },
      ],
    })

    expect(rows).toEqual([
      { label: 'GROCERY', value: 10 },
      { label: '음식', value: 30 },
    ])
  })

  it('금액이 숫자가 아니면 값만 null 로 두고 줄은 남긴다', () => {
    const rows = toExpenseCategoryRows({
      ...proxyIncome,
      expenseCategories: [{ key: 'GROCERY', label: '식료품', amount: null }],
    })

    expect(rows).toEqual([{ label: '식료품', value: null }])
  })
})

describe('hasExpenseByCategory', () => {
  it('네이티브와 대체는 모두 그린다', () => {
    expect(hasExpenseByCategory(nativeIncome)).toBe(true)
    expect(hasExpenseByCategory(proxyIncome)).toBe(true)
  })

  /** 빈 상태는 제공이 아예 없을 때뿐이다. */
  it('제공 없음이면 그리지 않는다', () => {
    expect(hasExpenseByCategory(unavailableIncome)).toBe(false)
  })

  it('응답 본문이 통째로 없어도 그리지 않는다', () => {
    expect(hasExpenseByCategory(null)).toBe(false)
    expect(hasExpenseByCategory(undefined)).toBe(false)
  })

  /**
   * 0 은 「그 항목에 안 쓴다」는 정보다. 대체값이 전부 0 이어도 「제공 없음」과는
   * 다른 사실이라 빈 상태로 접지 않는다 — 그 판정은 스코프가 한다.
   */
  it('전 항목이 0 이어도 스코프가 값을 약속했으면 그린다', () => {
    const allZero: CommercialIncomeAndExpense = {
      ...proxyIncome,
      expenseCategories: ADMINISTRATION_LABELS.map((label, index) => ({
        key: `KEY_${index}`,
        label,
        amount: 0,
      })),
    }

    expect(hasExpenseByCategory(allZero)).toBe(true)
  })

  /** 스코프가 값을 약속했는데 배열이 비는 건 계약 위반이다. 빈 네모 대신 사실을 적는다. */
  it('스코프가 값을 약속해도 그릴 행이 없으면 그리지 않는다', () => {
    expect(
      hasExpenseByCategory({ ...proxyIncome, expenseCategories: [] }),
    ).toBe(false)
  })
})

describe('toExpenseProvenanceView', () => {
  it('네이티브에는 배지도 면책도 없다', () => {
    const view = toExpenseProvenanceView(NATIVE_PROVENANCE)

    expect(view.scopeCode).toBe('COMMERCIAL')
    expect(view.isProxy).toBe(false)
    expect(view.badgeLabel).toBeNull()
    expect(view.disclaimer).toBeNull()
  })

  it('대체는 배지·면책·출처·기준 분기를 함께 편다', () => {
    const view = toExpenseProvenanceView(PROXY_PROVENANCE)

    expect(view.isProxy).toBe(true)
    expect(view.badgeLabel).toBe('행정동 기준 (대체)')
    expect(view.scopeName).toBe('청운효자동')
    expect(view.disclaimer).toContain('소속 행정동(청운효자동)의 추정 소비')
    expect(view.sourceLabel).toBe('서울시 상권분석서비스(소득소비-행정동)')
    expect(view.sourceUrl).toContain('data.seoul.go.kr')
    expect(view.effectivePeriodCode).toBe('20261')
  })

  it('제공 없음은 대체가 아니므로 배지를 붙이지 않는다', () => {
    const view = toExpenseProvenanceView(UNAVAILABLE_PROVENANCE)

    expect(view.scopeCode).toBe('UNAVAILABLE')
    expect(view.isProxy).toBe(false)
    expect(view.badgeLabel).toBeNull()
    expect(view.disclaimer).not.toBeNull()
  })

  /**
   * 출처를 모르는 값을 상권 실측이라고 단언하는 쪽이, 값을 못 그리는 쪽보다 나쁘다.
   */
  it('모르는 스코프 코드는 네이티브가 아니라 제공 없음으로 떨어뜨린다', () => {
    expect(toExpenseProvenanceView(null).scopeCode).toBe('UNAVAILABLE')
    expect(
      toExpenseProvenanceView({
        scope: { code: 'SOMETHING_NEW' as never },
      }).scopeCode,
    ).toBe('UNAVAILABLE')
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
      commercialProvenance: NATIVE_PROVENANCE,
    }

    expect(toRegionalExpenseRows(summary)).toEqual([
      {
        scope: 'district',
        label: '강남구',
        totalExpenseAmount: 300,
        isProxy: false,
      },
      {
        scope: 'administration',
        label: '역삼1동',
        totalExpenseAmount: 200,
        isProxy: false,
      },
      {
        scope: 'commercial',
        label: '역삼역',
        totalExpenseAmount: 100,
        isProxy: false,
      },
    ])
  })

  /**
   * 대체 구간에서는 상권 줄과 행정동 줄이 **같은 숫자**다. 값을 감추거나 바꾸지 않고
   * 상권 줄에만 표식을 세운다.
   */
  it('대체 구간에서는 상권 줄에만 대체 표식을 세운다', () => {
    const rows = toRegionalExpenseRows({
      district: { code: '11110', name: '종로구', totalExpenseAmount: 900 },
      administration: {
        code: '11110515',
        name: '청운효자동',
        totalExpenseAmount: 200,
      },
      commercial: {
        code: '3110001',
        name: '청운상권',
        totalExpenseAmount: 200,
      },
      commercialProvenance: PROXY_PROVENANCE,
    })

    expect(rows.map(row => row.isProxy)).toEqual([false, false, true])
    expect(rows[1].totalExpenseAmount).toBe(rows[2].totalExpenseAmount)
  })

  /**
   * 세 단위는 각각 독립적으로 null 이다. 줄을 지우면 「이 상권은 값이 없다」는 사실
   * 자체가 화면에서 사라진다.
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
      commercialProvenance: UNAVAILABLE_PROVENANCE,
    })

    expect(rows).toHaveLength(3)
    expect(rows[2]).toEqual({
      scope: 'commercial',
      label: '상권',
      totalExpenseAmount: null,
      isProxy: false,
    })
    expect(hasRegionalExpense(rows)).toBe(true)
  })

  /** 값이 없는데 대체 배지만 남으면 「대체했는데 비었다」는 모순이 화면에 뜬다. */
  it('대체 스코프라도 상권 값이 없으면 표식을 세우지 않는다', () => {
    const rows = toRegionalExpenseRows({
      commercial: null,
      commercialProvenance: PROXY_PROVENANCE,
    })

    expect(rows[2].isProxy).toBe(false)
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

describe('toRegionalExpenseProxyNote', () => {
  /** 막대 두 줄이 같아 보이는 이유를 화면이 먼저 말한다. */
  it('대체 구간이면 왜 행정동 줄과 같은 값인지 적는다', () => {
    const note = toRegionalExpenseProxyNote({
      commercialProvenance: PROXY_PROVENANCE,
    })

    expect(note).toContain('청운효자동')
    expect(note).toContain('행정동 줄과 같은 값')
  })

  it('영역 이름이 없으면 일반 표현으로 물러난다', () => {
    const note = toRegionalExpenseProxyNote({
      commercialProvenance: { ...PROXY_PROVENANCE, scopeName: null },
    })

    expect(note).toContain('소속 행정동')
  })

  it('네이티브·제공 없음·출처 메타 부재에는 각주를 붙이지 않는다', () => {
    expect(
      toRegionalExpenseProxyNote({ commercialProvenance: NATIVE_PROVENANCE }),
    ).toBeNull()
    expect(
      toRegionalExpenseProxyNote({
        commercialProvenance: UNAVAILABLE_PROVENANCE,
      }),
    ).toBeNull()
    expect(toRegionalExpenseProxyNote(null)).toBeNull()
  })
})
