// @vitest-environment jsdom
import { createElement, type ComponentProps } from 'react'
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { SubmittedRecommendation } from '@/lib/recommend/recommend-state'
import type { CandidateCommercial } from '@/types/recommend'
import RecommendPanel from './recommend-panel'

/*
  결과 헤더의 상호작용 계약(recommend.md S3-5·S3-6, #569·#570)을 실제 DOM 에서 잠근다.
  마크업 계약은 recommend-panel.test.ts.
*/

afterEach(() => {
  cleanup()
})

const submitted: SubmittedRecommendation = {
  district: { code: '11680', name: '강남구' },
  administration: { code: '11680640', name: '역삼1동' },
  service: { code: 'CS100010', name: '커피-음료' },
  commercialCodes: ['3110008'],
  commercialCodesKey: '3110008',
  requestKey: 'request',
}

const result: CandidateCommercial = {
  rank: 1,
  commercialCode: '3110008',
  commercialName: '역삼역',
  compositeScore: 89,
  grade: 'HIGH',
  summaryLabel: null,
  selectionReason: null,
  opportunityLabel: null,
  riskLabel: null,
  metricBreakdown: [],
  reasonTags: [],
}

type PanelProps = ComponentProps<typeof RecommendPanel>

const renderResults = (overrides: Partial<PanelProps> = {}) =>
  render(
    createElement(RecommendPanel, {
      view: 'results',
      draft: {
        district: submitted.district,
        administration: submitted.administration,
        service: submitted.service,
      },
      submitted,
      administrations: [],
      candidatesCount: 1,
      results: [result],
      recommendationBasis: {
        presetName: '공격형',
        presetDescription: null,
        priorityMetricName: '기회도',
        priorityMetricDescription:
          '매출과 유동인구를 종합한 상권 기회 지표입니다.',
        summary: null,
      },
      selectedCommercialCode: null,
      periodLabel: '2026년 1분기 기준',
      isAdministrationsLoading: false,
      isCandidatesLoading: false,
      isRecommendationLoading: false,
      feedback: null,
      onOpenStep: vi.fn(),
      onClosePicker: vi.fn(),
      onPickerSelect: vi.fn(),
      onSubmit: vi.fn(),
      onEdit: vi.fn(),
      onResultSelect: vi.fn(),
      onRetry: vi.fn(),
      ...overrides,
    }),
  )

describe('RecommendPanel — 「이 순서를 정한 기준」 펼치기 (#569)', () => {
  it('누르면 본문이 보이고, 본문 id 가 버튼의 aria-controls 와 같다', async () => {
    const view = renderResults()
    const toggle = view.getByRole('button', { name: /이 순서를 정한 기준/ })
    const bodyId = toggle.getAttribute('aria-controls') ?? ''
    const body = document.getElementById(bodyId)

    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(body).not.toBeNull()
    expect(body?.hidden).toBe(true)

    await act(async () => {
      fireEvent.click(toggle)
    })

    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    expect(body?.hidden).toBe(false)
    expect(body?.textContent).toContain(
      '매출과 유동인구를 종합한 상권 기회 지표입니다.',
    )

    await act(async () => {
      fireEvent.click(toggle)
    })

    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(body?.hidden).toBe(true)
  })
})

describe('RecommendPanel — 결과 헤더 조건 칩 (#570)', () => {
  it.each([
    ['자치구', '강남구', 'district'],
    ['행정동', '역삼1동', 'administration'],
    ['업종', '커피-음료', 'service'],
  ] as const)(
    '%s 칩을 누르면 onEditStep(%s → %s) 를 부른다',
    async (label, name, step) => {
      const onEditStep = vi.fn()
      const view = renderResults({ onEditStep })

      await act(async () => {
        fireEvent.click(
          view.getByRole('button', {
            name: `${label} 바꾸기, 지금 조건 ${name}`,
          }),
        )
      })

      expect(onEditStep).toHaveBeenCalledTimes(1)
      expect(onEditStep).toHaveBeenCalledWith(step)
    },
  )

  it('조건 화면의 「이전 결과로 돌아가기」는 포커스 자리 표시를 단다', async () => {
    const onRestorePreviousResults = vi.fn()
    const view = renderResults({ view: 'criteria', onRestorePreviousResults })
    const restore = view.getByRole('button', { name: '이전 결과로 돌아가기' })

    expect(restore.getAttribute('data-criteria-focus')).toBe('true')
    expect(
      view
        .getByRole('heading', { name: '어디에 어떤 가게를 열까요?' })
        .getAttribute('data-criteria-focus'),
    ).toBeNull()

    await act(async () => {
      fireEvent.click(restore)
    })

    expect(onRestorePreviousResults).toHaveBeenCalledTimes(1)
  })

  it('이전 결과가 없으면 조건 화면 제목이 포커스 자리다', () => {
    const view = renderResults({
      view: 'criteria',
      submitted: null,
      onRestorePreviousResults: vi.fn(),
    })

    expect(
      view
        .getByRole('heading', { name: '어디에 어떤 가게를 열까요?' })
        .getAttribute('data-criteria-focus'),
    ).toBe('true')
  })
})
