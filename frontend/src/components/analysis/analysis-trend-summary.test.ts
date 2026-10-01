import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import AnalysisTrendSummary, {
  describeFlatTrend,
  resolveTrendSectionState,
  shortPeriod,
  sparklineDomain,
  withRo,
} from '@/components/analysis/analysis-trend-summary'
import type { NormalizedApiError } from '@/lib/api/api-error'

const apiError = (kind: NormalizedApiError['kind']): NormalizedApiError =>
  ({ kind, status: null, code: null, message: '오류' }) as NormalizedApiError

const pt = (periodLabel: string, value: number | null) => ({
  periodLabel,
  value,
  changeRate: null,
})

describe('AnalysisTrendSummary', () => {
  it('값이 모두 같으면 「N분기째 같아요」 문장을 만든다', () => {
    expect(
      describeFlatTrend(
        [pt('a', 10), pt('b', 10), pt('c', 10), pt('d', 10)],
        '점포 수가',
        '개',
      ),
    ).toBe('점포 수가 4분기째 10개로 같아요')
    expect(
      describeFlatTrend([pt('a', 10), pt('b', 11)], '점포 수가', '개'),
    ).toBeNull()
    expect(
      describeFlatTrend([pt('a', 10), pt('b', null)], '점포 수가', '개'),
    ).toBeNull()
  })

  it('shortPeriod 는 연도를 두 자리로 줄인다', () => {
    expect(shortPeriod('2025년 2분기')).toBe('25년 2분기')
    expect(shortPeriod('시점 정보 없음')).toBe('시점 정보 없음')
  })

  it('지표마다 현재값·직전 분기 대비 문장·분기별 값을 한 줄로 그린다', () => {
    const markup = renderToStaticMarkup(
      createElement(AnalysisTrendSummary, {
        items: [
          {
            key: 'FOOT_TRAFFIC',
            label: '유동인구',
            subject: '유동인구가',
            unit: '명',
            points: [pt('2025년 4분기', 200), pt('2026년 1분기', 150)],
          },
          {
            key: 'STORE',
            label: '점포 수',
            subject: '점포 수가',
            unit: '개',
            points: [],
          },
        ],
      }),
    )
    expect(markup).toContain('유동인구가 직전 분기보다 25% 줄었어요')
    expect(markup).toContain('25년 4분기 200명 → 26년 1분기 150명')
    expect(markup).toContain('이 조건에서 제공되는 분기별 값이 없어요.')
  })

  it('받침에 맞춰 「로/으로」를 붙인다', () => {
    expect(withRo('10개')).toBe('10개로')
    expect(withRo('1억 9866만원')).toBe('1억 9866만원으로')
    expect(withRo('3,000명')).toBe('3,000명으로')
    expect(withRo('서울')).toBe('서울로')
    expect(
      describeFlatTrend([pt('a', 3000), pt('b', 3000)], '유동인구가', '명'),
    ).toBe('유동인구가 2분기째 3,000명으로 같아요')
  })

  it('스파크라인은 범위가 평균의 10% 보다 좁으면 넓혀 작은 변화를 부풀리지 않는다', () => {
    const [low, high] = sparklineDomain([3_000_000, 3_001_000])
    expect(high - low).toBeCloseTo(300_050, -1)
    expect(sparklineDomain([100, 200])).toEqual([100, 200])
    expect(sparklineDomain([0, 0])).toEqual([-0.5, 0.5])
  })

  it('섹션 상태: 하나만 실패하면 섹션 오류가 아니라 행 단위로 그린다', () => {
    expect(
      resolveTrendSectionState([
        { pending: false, error: null, hasData: true },
        { pending: false, error: apiError('server'), hasData: false },
      ]),
    ).toEqual({ loading: false, error: null, empty: false })
  })

  it('섹션 상태: 값이 하나도 없고 오류가 섞이면 재시도 가능한 오류를 고른다', () => {
    const server = apiError('server')
    const state = resolveTrendSectionState([
      { pending: false, error: apiError('not-found'), hasData: false },
      { pending: false, error: server, hasData: false },
      { pending: false, error: null, hasData: false },
    ])
    expect(state.error).toBe(server)
    expect(state.empty).toBe(false)
  })

  it('섹션 상태: 하나라도 불러오는 중이면 loading, 모두 비면 empty', () => {
    expect(
      resolveTrendSectionState([
        { pending: true, error: null, hasData: false },
        { pending: false, error: null, hasData: true },
      ]).loading,
    ).toBe(true)
    expect(
      resolveTrendSectionState([
        { pending: false, error: null, hasData: false },
      ]),
    ).toEqual({ loading: false, error: null, empty: true })
  })

  it('실패한 행은 「값 없음」이 아니라 불러오지 못했다고 적고 재시도를 둔다', () => {
    const markup = renderToStaticMarkup(
      createElement(AnalysisTrendSummary, {
        items: [
          {
            key: 'SALES',
            label: '매출',
            subject: '매출이',
            unit: '원',
            points: [],
            error: apiError('server'),
            onRetry: () => undefined,
          },
        ],
      }),
    )
    expect(markup).toContain('매출 정보를 불러오지 못했어요.')
    expect(markup).toContain('다시 시도')
    expect(markup).not.toContain('제공되는 분기별 값이 없어요')
  })
})
