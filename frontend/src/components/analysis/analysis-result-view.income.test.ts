import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'

import AnalysisResultView from '@/components/analysis/analysis-result-view'
import type {
  CommercialExpenseProvenance,
  CommercialIncomeAndExpense,
  CommercialIncomeSummary,
} from '@/types/commercial-analysis'

/**
 * 생활권 탭 소비 두 섹션의 **배선** 검증 (#414 → #416).
 *
 * 브라우저로 확인할 수 없는 화면이라 쿼리 캐시를 심어 서버 렌더로 본다
 * (`analysis-result-view.policy.test.ts` 와 같은 이유·같은 방식).
 *
 * 여기서 잡으려는 회귀는 네 가지다.
 *
 * 1. 항목별 소비가 **서버가 준 항목 구성**(9개/10개)을 그대로 그리는가 — 프런트가 키
 *    목록을 들고 있으면 대체 스코프에서 항목이 사라지거나 빈 줄이 생긴다.
 * 2. 대체값이 **대체라고 말하는가** — 배지·면책·출처. 숫자만 보면 상권 실측과
 *    구분되지 않는다.
 * 3. 네이티브에는 그 표시가 **붙지 않는가** — 늘 붙는 표시는 아무 말도 하지 못한다.
 * 4. 지역별 소비에서 값이 없는 단위의 **줄이 사라지지 않는가**, 그리고 대체 구간에서
 *    행정동 줄과 상권 줄이 같은 숫자일 때 그 이유가 화면에 적히는가.
 */

const searchParamsBox = vi.hoisted(() => ({ current: new URLSearchParams() }))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: () => undefined,
    replace: () => undefined,
    back: () => undefined,
  }),
  usePathname: () => '/analysis/result',
  useSearchParams: () => searchParamsBox.current,
}))

const BASE_PARAMS = {
  districtCode: '11680',
  administrationCode: '11680640',
  commercialCode: '3110971',
  serviceCode: 'CS100001',
  periodCode: '20261',
}

const PROXY_BADGE = '행정동 기준 (대체)'
const PROXY_DISCLAIMER =
  '2024년 1분기부터 서울 열린데이터광장이 상권 단위 소비 제공을 중단해, 소속 행정동(역삼1동)의 추정 소비로 대체 표시합니다. 같은 행정동 안의 상권은 같은 값입니다.'
const UNAVAILABLE_DISCLAIMER =
  '이 분기에는 상권 소비도 소속 행정동 소비도 제공되지 않습니다.'
const ADMINISTRATION_SOURCE = '서울시 상권분석서비스(소득소비-행정동)'
const ADMINISTRATION_SOURCE_URL =
  'https://data.seoul.go.kr/dataList/OA-22166/S/1/datasetView.do'

const ok = (body: unknown) => ({
  dataHeader: { success: true, resultCode: null, resultMessage: null },
  dataBody: body,
})

const render = (
  income: CommercialIncomeAndExpense | null,
  incomeSummary: CommercialIncomeSummary | null,
) => {
  searchParamsBox.current = new URLSearchParams({
    ...BASE_PARAMS,
    tab: 'living',
  })
  const client = new QueryClient()

  client.setQueryData(
    ['analysis', 'income', BASE_PARAMS.commercialCode, BASE_PARAMS.periodCode],
    ok(income),
  )
  client.setQueryData(
    [
      'analysis',
      'income-summary',
      BASE_PARAMS.commercialCode,
      BASE_PARAMS.districtCode,
      BASE_PARAMS.administrationCode,
      BASE_PARAMS.periodCode,
    ],
    ok(incomeSummary),
  )

  return renderToStaticMarkup(
    createElement(
      QueryClientProvider,
      { client },
      createElement(AnalysisResultView, null),
    ),
  )
}

const NATIVE_PROVENANCE: CommercialExpenseProvenance = {
  scope: { code: 'COMMERCIAL', name: '상권', description: null },
  scopeCode: BASE_PARAMS.commercialCode,
  scopeName: '역삼역',
  sourceId: 'VwsmTrdarNcmCnsmpQq',
  sourceLabel: '서울시 상권분석서비스(소득소비-상권)',
  sourceUrl: 'https://data.seoul.go.kr/dataList/OA-15572/S/1/datasetView.do',
  effectivePeriodCode: BASE_PARAMS.periodCode,
  disclaimer: null,
}

const PROXY_PROVENANCE: CommercialExpenseProvenance = {
  scope: {
    code: 'ADMINISTRATION_PROXY',
    name: '행정동 대체',
    description: null,
  },
  scopeCode: BASE_PARAMS.administrationCode,
  scopeName: '역삼1동',
  sourceId: 'VwsmAdstrdNcmCnsmpW',
  sourceLabel: ADMINISTRATION_SOURCE,
  sourceUrl: ADMINISTRATION_SOURCE_URL,
  effectivePeriodCode: BASE_PARAMS.periodCode,
  disclaimer: PROXY_DISCLAIMER,
}

const UNAVAILABLE_PROVENANCE: CommercialExpenseProvenance = {
  scope: { code: 'UNAVAILABLE', name: '제공 없음', description: null },
  scopeCode: null,
  scopeName: null,
  sourceId: 'VwsmTrdarNcmCnsmpQq',
  sourceLabel: '서울시 상권분석서비스(소득소비-상권)',
  sourceUrl: 'https://data.seoul.go.kr/dataList/OA-15572/S/1/datasetView.do',
  effectivePeriodCode: null,
  disclaimer: UNAVAILABLE_DISCLAIMER,
}

const NATIVE_INCOME: CommercialIncomeAndExpense = {
  expenseCategories: [
    { key: 'GROCERY', label: '식료품', amount: 10_000_000 },
    { key: 'CLOTHING_FOOTWEAR', label: '의류·신발', amount: 2_000_000 },
    { key: 'ENTERTAINMENT', label: '유흥', amount: 1_000_000 },
  ],
  totalExpenseAmount: 13_000_000,
  provenance: NATIVE_PROVENANCE,
}

const PROXY_INCOME: CommercialIncomeAndExpense = {
  expenseCategories: [
    { key: 'GROCERY', label: '식료품', amount: 9_000_000 },
    { key: 'LEISURE_CULTURE', label: '여가·문화', amount: 3_000_000 },
    { key: 'DINING', label: '음식', amount: 4_000_000 },
    { key: 'OTHER', label: '기타', amount: 500_000 },
  ],
  totalExpenseAmount: 16_500_000,
  provenance: PROXY_PROVENANCE,
}

const UNAVAILABLE_INCOME: CommercialIncomeAndExpense = {
  expenseCategories: null,
  totalExpenseAmount: null,
  provenance: UNAVAILABLE_PROVENANCE,
}

const LIVE_SUMMARY: CommercialIncomeSummary = {
  district: {
    code: BASE_PARAMS.districtCode,
    name: '강남구',
    totalExpenseAmount: 3_000_000_000,
  },
  administration: {
    code: BASE_PARAMS.administrationCode,
    name: '역삼1동',
    totalExpenseAmount: 200_000_000,
  },
  commercial: null,
  commercialProvenance: UNAVAILABLE_PROVENANCE,
}

/** 대체 구간: 상권 leg 에 행정동 총액이 그대로 들어와 두 줄이 같은 값이 된다. */
const PROXY_SUMMARY: CommercialIncomeSummary = {
  district: {
    code: BASE_PARAMS.districtCode,
    name: '강남구',
    totalExpenseAmount: 3_000_000_000,
  },
  administration: {
    code: BASE_PARAMS.administrationCode,
    name: '역삼1동',
    totalExpenseAmount: 200_000_000,
  },
  commercial: {
    code: BASE_PARAMS.commercialCode,
    name: '역삼역',
    totalExpenseAmount: 200_000_000,
  },
  commercialProvenance: PROXY_PROVENANCE,
}

describe('AnalysisResultView · 소비 두 섹션', () => {
  it('두 섹션을 따로 세우고 기준 분기를 함께 적는다', () => {
    const markup = render(NATIVE_INCOME, LIVE_SUMMARY)

    expect(markup).toContain('항목별 소비')
    expect(markup).toContain('지역별 소비')
    expect(markup).toContain('2026년 1분기 기준')
    expect(markup).toContain('식료품')
  })

  /* 소득은 화면에서 완전히 없앴다 — 원천이 사라졌다(2026-05-13 컬럼 삭제). */
  it('월 평균 소득을 어디에도 그리지 않는다', () => {
    const markup = render(NATIVE_INCOME, LIVE_SUMMARY)

    expect(markup).not.toContain('월 평균 소득')
    expect(markup).not.toContain('월평균 소득')
  })

  /**
   * 갈래 1 — 상권 네이티브. 값이 상권 실측이므로 배지도 면책도 붙이지 않는다.
   * 늘 붙는 표시는 아무 말도 하지 못한다.
   */
  it('상권 네이티브에는 대체 배지도 면책도 붙이지 않는다', () => {
    const markup = render(NATIVE_INCOME, LIVE_SUMMARY)

    expect(markup).toContain('유흥')
    expect(markup).not.toContain(PROXY_BADGE)
    expect(markup).not.toContain('상권 단위 소비 제공을 중단해')
    expect(markup).not.toContain(ADMINISTRATION_SOURCE)
  })

  /**
   * 갈래 2 — 행정동 대체. 항목 구성이 네이티브와 달라(여가·문화가 합쳐지고 음식·기타가
   * 더해진다) 서버가 준 순서 그대로 그려야 하고, 대체라는 사실을 배지·면책·출처로 말한다.
   */
  it('행정동 대체는 서버가 준 항목 구성을 그대로 그리고 대체임을 드러낸다', () => {
    const markup = render(PROXY_INCOME, PROXY_SUMMARY)

    expect(markup).toContain('여가·문화')
    expect(markup).toContain('음식')
    expect(markup).toContain('기타')
    expect(markup).toContain(PROXY_BADGE)
    expect(markup).toContain('소속 행정동(역삼1동)의 추정 소비로 대체 표시')
    expect(markup).toContain(ADMINISTRATION_SOURCE)
    expect(markup).toContain(ADMINISTRATION_SOURCE_URL)
  })

  /**
   * 대체 구간에서는 행정동 leg 와 상권 leg 가 **같은 값**이다. 데이터가 실제로 그런
   * 것이라 값을 감추지 않고, 같아 보이는 이유를 각주로 적는다.
   */
  it('지역별 소비에서 상권 줄이 대체값이면 그 이유를 적는다', () => {
    const markup = render(PROXY_INCOME, PROXY_SUMMARY)
    const regional = markup.slice(markup.indexOf('지역별 소비'))

    expect(regional).toContain(PROXY_BADGE)
    expect(regional).toContain('행정동 줄과 같은 값으로 보입니다')
    // 값 자체는 그대로 둔다 — 두 줄이 같은 것이 사실이다.
    expect(regional).toContain('역삼1동')
    expect(regional).toContain('역삼역')
  })

  /**
   * 갈래 3 — 제공 없음. 이때만 섹션 단위 빈 상태이고, 왜 없는지는 서버 면책 문장이 말한다.
   */
  it('제공이 없을 때만 항목 줄 대신 섹션 빈 상태로 사실을 적는다', () => {
    const markup = render(UNAVAILABLE_INCOME, LIVE_SUMMARY)

    expect(markup).toContain('항목별 소비 데이터가 없어요')
    expect(markup).toContain(UNAVAILABLE_DISCLAIMER)
    expect(markup).not.toContain('식료품')
    expect(markup).not.toContain(PROXY_BADGE)
  })

  /**
   * 세 단위는 각각 독립적으로 null 이다. 항목별이 비어도 지역별은 살아 있어야 한다 —
   * 한 섹션이었다면 같이 사라졌다.
   */
  it('항목별이 비어도 지역별 소비는 자치구·행정동 값을 그린다', () => {
    const markup = render(UNAVAILABLE_INCOME, LIVE_SUMMARY)

    expect(markup).toContain('강남구')
    expect(markup).toContain('역삼1동')
    expect(markup).not.toContain('지역별 소비 데이터가 없어요')
  })

  it('상권만 null 이어도 상권 줄을 지우지 않고 「데이터 없음」으로 둔다', () => {
    const markup = render(UNAVAILABLE_INCOME, LIVE_SUMMARY)

    const regionalAt = markup.indexOf('지역별 소비')
    const regional = markup.slice(regionalAt)

    expect(regionalAt).toBeGreaterThanOrEqual(0)
    // 이름이 없는 단위는 기본 라벨로 남는다.
    expect(regional).toContain('상권')
    expect(regional).toContain('데이터 없음')
  })

  it('세 단위가 모두 없으면 지역별 소비만 빈 상태가 된다', () => {
    const markup = render(NATIVE_INCOME, {
      district: null,
      administration: null,
      commercial: null,
      commercialProvenance: UNAVAILABLE_PROVENANCE,
    })

    expect(markup).toContain('지역별 소비 데이터가 없어요')
    expect(markup).toContain(
      '이 분기에는 자치구·행정동·상권 어느 단위에도 소비 데이터가 없어요.',
    )
    expect(markup).not.toContain('항목별 소비 데이터가 없어요')
    expect(markup).toContain('식료품')
  })
})
