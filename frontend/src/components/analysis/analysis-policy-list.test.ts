import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import AnalysisPolicyList from '@/components/analysis/analysis-policy-list'
import type { PolicyItem } from '@/types/policy'

const policy = (overrides: Partial<PolicyItem> = {}): PolicyItem => ({
  policyId: '9000000000000000003',
  title: '소상공인 스마트기술 도입 지원',
  organization: '중소벤처기업부',
  supportType: 'SUBSIDY',
  supportTypeName: '보조금',
  targetSummary: '스마트기기 도입 희망 소상공인',
  supportContent: '도입비의 70%, 최대 500만원 보조',
  districtCode: null,
  serviceCategoryCode: null,
  applyStartAt: '2026-03-01',
  applyEndAt: '2026-09-30',
  detailUrl: 'https://www.mss.go.kr',
  ...overrides,
})

const render = (policies: PolicyItem[]) =>
  renderToStaticMarkup(
    createElement(AnalysisPolicyList, {
      policies,
      districtCode: '11680',
      districtName: '강남구',
    }),
  )

describe('AnalysisPolicyList', () => {
  it('정책의 사실을 그대로 적는다', () => {
    const markup = render([policy()])

    expect(markup).toContain('소상공인 스마트기술 도입 지원')
    expect(markup).toContain('중소벤처기업부')
    expect(markup).toContain('보조금')
    expect(markup).toContain('도입비의 70%, 최대 500만원 보조')
    expect(markup).toContain('스마트기기 도입 희망 소상공인')
    expect(markup).toContain('2026.03.01 ~ 2026.09.30')
  })

  /* 전국 정책이 섞여 오므로 출처를 적어야 한다. */
  it('적용 범위를 적는다', () => {
    const markup = render([policy()])

    expect(markup).toContain('서울 전역·전국')
    expect(markup).toContain('전업종')
  })

  it('자치구 전용이면 자치구명으로 적는다', () => {
    const markup = render([policy({ districtCode: '11680' })])

    expect(markup).toContain('강남구 전용')
  })

  /*
   * 외부 링크다. `rel` 이 없으면 열린 탭이 `window.opener` 로 원본을 만질 수 있다.
   */
  it('상세 링크는 새 탭으로 열고 opener 를 끊는다', () => {
    const markup = render([policy()])

    expect(markup).toContain('href="https://www.mss.go.kr"')
    expect(markup).toContain('target="_blank"')
    expect(markup).toContain('rel="noopener noreferrer"')
  })

  it('마감일이 없으면 상시 모집으로 적는다', () => {
    const markup = render([policy({ applyStartAt: null, applyEndAt: null })])

    expect(markup).toContain('상시 모집')
  })

  it('여러 건을 받은 순서대로 그린다', () => {
    const markup = render([
      policy({ policyId: '1', title: '첫째 정책' }),
      policy({ policyId: '2', title: '둘째 정책' }),
    ])

    expect(markup.indexOf('첫째 정책')).toBeLessThan(
      markup.indexOf('둘째 정책'),
    )
  })

  /* 섹션이 빈 상태를 맡으므로 리스트는 아무것도 그리지 않는다. */
  it('빈 목록이면 아무것도 그리지 않는다', () => {
    expect(render([])).toBe('')
  })
})
