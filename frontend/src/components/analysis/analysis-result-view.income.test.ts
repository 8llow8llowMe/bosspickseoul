import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'

import AnalysisResultView from '@/components/analysis/analysis-result-view'
import type {
  CommercialIncomeAndExpense,
  CommercialIncomeSummary,
} from '@/types/commercial-analysis'

/**
 * 생활권 탭 소비 두 섹션의 **배선** 검증 (#414).
 *
 * 브라우저로 확인할 수 없는 화면이라 쿼리 캐시를 심어 서버 렌더로 본다
 * (`analysis-result-view.policy.test.ts` 와 같은 이유·같은 방식).
 *
 * 여기서 잡으려는 회귀는 두 가지다.
 *
 * 1. 상권 항목별 소비가 없을 때 9줄이 「데이터 없음」으로 늘어서는 것 — 섹션 단위
 *    빈 상태여야 한다.
 * 2. 지역별 소비에서 값이 없는 단위의 **줄이 사라지는** 것 — 상권만 비는 것이 정상
 *    상태라, 줄을 지우면 위에 남은 자치구 값이 상권 값처럼 읽힌다.
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

const EMPTY_CATEGORY_NOTICE =
  '서울 열린데이터광장이 2024년 1분기부터 상권 단위 항목별 소비 제공을 중단했어요'

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

const LIVE_SUMMARY: CommercialIncomeSummary = {
  district: {
    code: '11680',
    name: '강남구',
    totalExpenseAmount: 3_000_000_000,
  },
  administration: {
    code: '11680640',
    name: '역삼1동',
    totalExpenseAmount: 200_000_000,
  },
  commercial: null,
}

describe('AnalysisResultView · 소비 두 섹션', () => {
  it('두 섹션을 따로 세우고 기준 분기를 함께 적는다', () => {
    const markup = render(
      {
        expenseByCategoryItem: {
          groceryExpenseAmount: 10_000_000,
          clothingExpenseAmount: 2_000_000,
        },
      },
      LIVE_SUMMARY,
    )

    expect(markup).toContain('항목별 소비')
    expect(markup).toContain('지역별 소비')
    expect(markup).toContain('2026년 1분기 기준')
    expect(markup).toContain('식료품')
  })

  /* 소득은 화면에서 완전히 없앴다 — 원천이 사라졌다(2026-05-13 컬럼 삭제). */
  it('월 평균 소득을 어디에도 그리지 않는다', () => {
    const markup = render(null, LIVE_SUMMARY)

    expect(markup).not.toContain('월 평균 소득')
    expect(markup).not.toContain('월평균 소득')
  })

  /**
   * 20241 분기부터 상권 단위 원천이 전 행 0 이라 백엔드가 항목 묶음을 null 로 강등한다.
   * 9줄을 「데이터 없음」으로 늘어놓지 말고 섹션 단위 빈 상태로 사실을 적는다.
   */
  it('항목별 소비가 null 이면 9줄 대신 섹션 빈 상태로 원천 중단을 적는다', () => {
    const markup = render({ expenseByCategoryItem: null }, LIVE_SUMMARY)

    expect(markup).toContain('항목별 소비 데이터가 없어요')
    expect(markup).toContain(EMPTY_CATEGORY_NOTICE)
    expect(markup).not.toContain('식료품')
    expect(markup).not.toContain('유흥')
  })

  /**
   * 세 단위는 각각 독립적으로 null 이다. 상권만 비는 것이 지금의 정상 상태이므로
   * 항목별이 비어도 지역별은 살아 있어야 한다 — 한 섹션이었다면 같이 사라졌다.
   */
  it('항목별이 비어도 지역별 소비는 자치구·행정동 값을 그린다', () => {
    const markup = render({ expenseByCategoryItem: null }, LIVE_SUMMARY)

    expect(markup).toContain('강남구')
    expect(markup).toContain('역삼1동')
    expect(markup).not.toContain('지역별 소비 데이터가 없어요')
  })

  it('상권만 null 이어도 상권 줄을 지우지 않고 「데이터 없음」으로 둔다', () => {
    const markup = render({ expenseByCategoryItem: null }, LIVE_SUMMARY)

    const regionalAt = markup.indexOf('지역별 소비')
    const regional = markup.slice(regionalAt)

    expect(regionalAt).toBeGreaterThanOrEqual(0)
    // 이름이 없는 단위는 기본 라벨로 남는다.
    expect(regional).toContain('상권')
    expect(regional).toContain('데이터 없음')
  })

  it('세 단위가 모두 없으면 지역별 소비만 빈 상태가 된다', () => {
    const markup = render(
      {
        expenseByCategoryItem: {
          groceryExpenseAmount: 10_000_000,
        },
      },
      { district: null, administration: null, commercial: null },
    )

    expect(markup).toContain('지역별 소비 데이터가 없어요')
    expect(markup).toContain(
      '이 분기에는 자치구·행정동·상권 어느 단위에도 소비 데이터가 없어요.',
    )
    expect(markup).not.toContain(EMPTY_CATEGORY_NOTICE)
    expect(markup).toContain('식료품')
  })
})
