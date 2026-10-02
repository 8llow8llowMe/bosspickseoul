import { describe, expect, it } from 'vitest'

import { DEFAULT_SELECTION } from '@/data/home-demo'
import { parseAnalysisSelection } from '@/lib/analysis/selection'
import { parseRecommendUrlState } from '@/lib/recommend/recommend-url'

import { STORY_STEPS, resolveStoryCta } from './story-steps'

const [STATUS, ANALYSIS, RECOMMEND, SIMULATION] = STORY_STEPS
const MAPO_GYM = { districtId: 'mapo', industryId: 'gym' }
const NONHYEON2 = '11680545'

const searchParamsOf = (href: string) =>
  new URL(href, 'https://example.test').searchParams

/**
 * 판단 흐름 CTA 가 고른 조건을 다음 화면으로 들고 가는지 지킨다
 * (measurement-and-deep-link.md D3). 예전엔 02 가 「이 조건으로」라고 말하면서 빈
 * `/analysis` 로 갔다.
 */
describe('resolveStoryCta', () => {
  describe('02 상권 분석', () => {
    it('고른 자치구를 /analysis 에 싣는다', () => {
      const cta = resolveStoryCta(ANALYSIS, DEFAULT_SELECTION, null)

      expect(cta.href).toBe('/analysis?districtCode=11680')
      expect(cta.carried).toBe(true)
    })

    it('칩을 바꾸면 링크와 문구가 함께 바뀐다', () => {
      const cta = resolveStoryCta(ANALYSIS, MAPO_GYM, null)

      expect(cta.href).toBe('/analysis?districtCode=11440')
      expect(cta.label).toBe('마포구 분석하고 AI 리포트 받기')
    })

    // 분석 화면은 행정동을 고르는 순간 업종을 지운다 — 싣지도, 약속하지도 않는다.
    it('업종은 싣지 않고 문구도 「이 조건으로」라고 하지 않는다', () => {
      const cta = resolveStoryCta(ANALYSIS, DEFAULT_SELECTION, null)

      expect(cta.href).not.toContain('serviceCode')
      expect(cta.label).not.toContain('이 조건으로')
    })

    it('분석 화면이 그 링크를 자치구 선택으로 복원한다', () => {
      const cta = resolveStoryCta(ANALYSIS, DEFAULT_SELECTION, null)

      expect(
        parseAnalysisSelection(searchParamsOf(cta.href)).districtCode,
      ).toBe('11680')
    })
  })

  describe('03 후보 추천', () => {
    it('행정동이 풀리면 홈이 쓴 조건 그대로 결과 화면에 착지한다', () => {
      const cta = resolveStoryCta(RECOMMEND, DEFAULT_SELECTION, NONHYEON2)
      const restored = parseRecommendUrlState(searchParamsOf(cta.href))

      expect(restored.district?.code).toBe('11680')
      expect(restored.administration?.code).toBe(NONHYEON2)
      expect(restored.service?.code).toBe('CS100010')
      expect(restored.isResultsView).toBe(true)
      expect(cta.label).toBe('이 조건으로 추천 결과 보기')
    })

    // 연쇄 로딩 중·실패 — 결과를 낼 수 없으니 조건 화면에 둔다.
    it('행정동이 없으면 자치구·업종만 싣고 결과 화면으로 보내지 않는다', () => {
      const cta = resolveStoryCta(RECOMMEND, DEFAULT_SELECTION, null)

      expect(cta.href).toBe(
        '/recommend?districtCode=11680&serviceCode=CS100010',
      )
      expect(cta.label).toBe(RECOMMEND.cta.label)
      expect(cta.carried).toBe(true)
    })

    it('홈 업종 코드 네 개를 추천 화면이 모두 복원한다', () => {
      for (const industryId of ['cafe', 'restaurant', 'convenience', 'gym']) {
        const cta = resolveStoryCta(
          RECOMMEND,
          { districtId: 'gangnam', industryId },
          NONHYEON2,
        )
        expect(
          parseRecommendUrlState(searchParamsOf(cta.href)).service,
          industryId,
        ).not.toBeNull()
      }
    })
  })

  it('01·04 는 조건을 싣지 않는다', () => {
    expect(resolveStoryCta(STATUS, MAPO_GYM, NONHYEON2)).toEqual({
      ...STATUS.cta,
      carried: false,
    })
    expect(resolveStoryCta(SIMULATION, MAPO_GYM, NONHYEON2)).toEqual({
      ...SIMULATION.cta,
      carried: false,
    })
  })
})
