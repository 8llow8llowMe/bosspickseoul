import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import SimulationResultPanel, {
  type SimulationResultPanelProps,
} from '@/components/simulation/simulation-result-panel'
import type { NormalizedApiError } from '@/lib/api/api-error'
import {
  createEmptySimulationConditionState,
  describeSimulationConditionGap,
  type SimulationConditionState,
} from '@/lib/simulation/conditions'
import type { SimulationReport } from '@/types/simulation'

const completeState = (
  overrides: Partial<SimulationConditionState> = {},
): SimulationConditionState => ({
  franchisee: false,
  franchiseeId: null,
  brandName: null,
  districtCode: '11740',
  serviceCode: 'CS100001',
  storeSize: 66,
  floorType: 'FIRST_FLOOR',
  ...overrides,
})

const report = (): SimulationReport => ({
  condition: {
    franchisee: false,
    franchiseeId: null,
    brandName: null,
    districtCode: '11740',
    districtName: '강동구',
    serviceCode: 'CS100001',
    serviceName: '한식음식점',
    storeSize: 66,
    floorType: { code: 'FIRST_FLOOR', name: '1층', description: '1층 점포' },
    periodCode: '20233',
  },
  dataBaseYear: '2024',
  totalPrice: 23_450,
  keyMoney: { keyMoneyRatio: 62, keyMoneyAverage: 4_200, keyMoneyLevel: 63 },
  costDetail: { rentPrice: 300, deposit: 3_000, interior: 5_000, levy: null },
  similarFranchisees: [],
  genderAgeAnalysis: null,
  seasonAnalysis: null,
})

const render = (overrides: Partial<SimulationResultPanelProps> = {}) => {
  const state = overrides.state ?? createEmptySimulationConditionState()
  return renderToStaticMarkup(
    createElement(SimulationResultPanel, {
      state,
      gap: describeSimulationConditionGap(state),
      report: null,
      reportHref: null,
      error: null,
      isPending: false,
      onCalculate: () => {},
      onReselect: () => {},
      ...overrides,
    }),
  )
}

describe('SimulationResultPanel', () => {
  it('계산 전에도 비워 두지 않는다 — 무엇을 계산하는지와 남은 조건을 보여준다', () => {
    const markup = render()

    expect(markup).toContain('예상 총 창업 비용')
    // 4개 조건이 모두 이름과 함께 나열되고, 비어 있으면 "선택 전"이다.
    expect(markup).toContain('창업 형태')
    expect(markup).toContain('자치구')
    expect(markup).toContain('업종')
    expect(markup).toContain('매장 조건')
    expect(markup).toContain('선택 전')
    expect(markup).toContain('프랜차이즈 창업인지 먼저 선택해 주세요')
    expect(markup).toContain('계산하기')
  })

  it('고른 조건은 값 그대로 체크리스트에 반영된다', () => {
    const markup = render({ state: completeState() })

    expect(markup).toContain('개인 창업')
    expect(markup).toContain('강동구')
    expect(markup).toContain('한식음식점')
    expect(markup).toContain('66㎡ · 1층')
    expect(markup).toContain('지금 조건으로 계산할 수 있어요')
  })

  it('계산 결과가 오면 금액과 기준 연도 안내만 남는다', () => {
    const markup = render({
      state: completeState(),
      report: report(),
      reportHref: '/simulation/report?franchisee=false',
    })

    expect(markup).toContain('2억 3,450만원')
    expect(markup).toContain('2024년 기준 데이터로 계산된 결과입니다.')
    // 결과가 있는 동안에는 계산 CTA·체크리스트를 겹쳐 보여주지 않는다.
    expect(markup).not.toContain('계산하기')
    expect(markup).not.toContain('선택 전')
  })

  it('오류는 계산 CTA를 대체한다 — 404는 재시도 버튼 없이 서버 문구만', () => {
    const error: NormalizedApiError = {
      kind: 'not-found',
      status: 404,
      code: 'SIMULATION_002',
      message: '해당 자치구의 임대료 데이터가 없습니다.',
      fieldErrors: [],
    }

    const markup = render({ state: completeState(), error })

    expect(markup).toContain('해당 자치구의 임대료 데이터가 없습니다.')
    expect(markup).toContain('자치구 다시 선택')
    expect(markup).not.toContain('다시 시도')
    expect(markup).not.toContain('계산하기')
  })
})
