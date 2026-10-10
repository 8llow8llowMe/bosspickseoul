import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'

import AnalysisResultView from '@/components/analysis/analysis-result-view'
import type { CommercialProfile } from '@/types/recommend'

/**
 * 결과 화면 다음 행동의 **배선** 검증 (#563).
 *
 * 저장 시트의 동작은 `analysis-save-sheet.interaction.test.ts`, 항목 → 북마크 연결은
 * `lib/analysis/save-options.test.ts` 가 고정한다. 여기서는 결과 화면이 그 부품을 제자리에
 * 놓는지 본다 — 주 버튼 문구, 버튼 묶음이 핵심 지표 아래인지, 저장 버튼 하나, 요약 끝 AI 해석
 * 링크, 비로그인 표시. 쿼리 캐시를 심어 서버 렌더로 본다(`analysis-result-view.summary.test.ts` 와 같다).
 */

const searchParamsBox = vi.hoisted(() => ({ current: new URLSearchParams() }))
const authBox = vi.hoisted(() => ({
  current: {
    hasHydrated: false,
    isLoggedIn: false,
    memberInfo: null as { memberId: string } | null,
  },
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: () => undefined,
    replace: () => undefined,
    back: () => undefined,
  }),
  usePathname: () => '/analysis/result',
  useSearchParams: () => searchParamsBox.current,
}))

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (selector: (state: unknown) => unknown) =>
    selector(authBox.current),
}))

const BASE_PARAMS = {
  districtCode: '11440',
  administrationCode: '11440660',
  commercialCode: '3130191',
  serviceCode: 'CS100010',
  periodCode: '20261',
}

const ok = (body: unknown) => ({
  dataHeader: { success: true, resultCode: null, resultMessage: null },
  dataBody: body,
})

const PROFILE = {
  periodCode: '20261',
  commercialCode: '3130191',
  commercialName: '홍대 걷고싶은 거리',
  districtCode: '11440',
  districtName: '마포구',
  administrationCode: '11440660',
  administrationName: '서교동',
  keyMetrics: {
    totalSalesAmount: 2_635_270_379,
    totalFootTraffic: 542_312,
    totalStoreCount: 48,
    similarStoreCount: 59,
    totalResidentPopulation: 478,
  },
  policyRecommendations: [],
} as unknown as CommercialProfile

const render = (auth: { hasHydrated: boolean; isLoggedIn: boolean }) => {
  authBox.current = {
    ...auth,
    memberInfo: auth.isLoggedIn ? { memberId: '1' } : null,
  }
  searchParamsBox.current = new URLSearchParams({
    ...BASE_PARAMS,
    tab: 'summary',
  })
  const { commercialCode, serviceCode, periodCode } = BASE_PARAMS
  const client = new QueryClient()
  client.setQueryData(
    ['analysis', 'profile', commercialCode, serviceCode, periodCode],
    ok(PROFILE),
  )
  client.setQueryData(
    ['analysis', 'services', commercialCode],
    ok([{ serviceCode, serviceName: '커피-음료' }]),
  )

  return renderToStaticMarkup(
    createElement(
      QueryClientProvider,
      { client },
      createElement(AnalysisResultView, null),
    ),
  )
}

const AI_HREF =
  '/analysis/report?districtCode=11440&amp;administrationCode=11440660&amp;commercialCode=3130191&amp;serviceCode=CS100010&amp;periodCode=20261'

describe('AnalysisResultView · 다음 행동 (#563)', () => {
  it('주 버튼은 「이 상권 창업 비용 계산하기」이고 핵심 지표 아래, 지원 정책 위에 있다', () => {
    const markup = render({ hasHydrated: true, isLoggedIn: true })
    const core = markup.indexOf('핵심 지표')
    const primary = markup.indexOf('이 상권 창업 비용 계산하기')
    const policy = markup.indexOf('받을 수 있는 지원')

    expect(primary).toBeGreaterThan(core)
    expect(primary).toBeLessThan(policy)
    // 예전 문구·버튼이 남아 있지 않다.
    expect(markup).not.toContain('>시뮬레이션<')
    expect(markup).not.toContain('화면 보관')
    expect(markup).not.toContain('상권 저장')
  })

  it('저장은 시트를 여는 버튼 하나다', () => {
    const markup = render({ hasHydrated: true, isLoggedIn: true })

    expect(markup.match(/aria-haspopup="dialog"/g)).toHaveLength(1)
    expect(markup).toMatch(/aria-haspopup="dialog" aria-expanded="false"/)
  })

  it('요약 끝에 이 상권 AI 해석 링크가 있고 선택 전체를 싣는다', () => {
    const markup = render({ hasHydrated: true, isLoggedIn: true })
    const link = /<a[^>]*data-analysis-ai-report-link="true"[^>]*>/.exec(
      markup,
    )?.[0]

    expect(link).toBeDefined()
    expect(link).toContain(`href="${AI_HREF}"`)
    expect(markup).toContain('이 상권 AI 해석 보기')
    expect(markup).not.toContain('로그인하고 이 상권 AI 해석 보기')
    expect(markup).not.toContain('자물쇠가 붙은 저장과 AI 해석은')
    // 요약 섹션 끝 — 다음 섹션(유동인구)보다 앞이다.
    expect(markup.indexOf('data-analysis-ai-report-link')).toBeLessThan(
      markup.indexOf('id="report-foot-traffic"'),
    )
  })

  it('비로그인이면 AI 링크 문구가 로그인을 말하고 버튼 묶음 아래에 자물쇠 안내를 둔다', () => {
    const markup = render({ hasHydrated: true, isLoggedIn: false })

    expect(markup).toContain('로그인하고 이 상권 AI 해석 보기')
    expect(markup).toContain(
      '자물쇠가 붙은 저장과 AI 해석은 로그인한 뒤 쓸 수 있어요.',
    )
    expect(markup.indexOf('자물쇠가 붙은')).toBeGreaterThan(
      markup.indexOf('이 상권 창업 비용 계산하기'),
    )
  })

  it('하이드레이트 전에는 비로그인으로 단정하지 않는다', () => {
    const markup = render({ hasHydrated: false, isLoggedIn: false })

    expect(markup).not.toContain('자물쇠가 붙은')
    expect(markup).toContain('이 상권 AI 해석 보기')
  })
})
