import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import SimulationConditionCompactEditor, {
  compareFieldDomId,
} from '@/components/simulation/compare/simulation-condition-compact-editor'
import {
  createEmptySimulationConditionState,
  type SimulationConditionState,
} from '@/lib/simulation/conditions'
import type { SimulationConditionsController } from '@/lib/simulation/use-simulation-conditions'

/** 표시만 보는 테스트라 동작 함수는 비워 둔다. */
const controller = (
  state: Partial<SimulationConditionState>,
): SimulationConditionsController =>
  ({
    state: { ...createEmptySimulationConditionState(), ...state },
    isComplete: false,
    gap: null,
    reportRequest: null,
    isSectionComplete: () => false,
    setFranchisee: () => {},
    setDistrict: () => {},
    setService: () => {},
    setBrand: () => {},
    setStoreSize: () => {},
    setFloorType: () => {},
  }) as unknown as SimulationConditionsController

const render = (state: Partial<SimulationConditionState>) =>
  renderToStaticMarkup(
    createElement(SimulationConditionCompactEditor, {
      label: '조건 A',
      conditions: controller(state),
      idPrefix: 'compare-a',
    }),
  )

describe('SimulationConditionCompactEditor', () => {
  it('고른 브랜드는 「브랜드 · 변경」 한 줄로 접고 검색 목록을 펼치지 않는다 (C1)', () => {
    const html = render({
      franchisee: true,
      serviceCode: 'CS100001',
      franchiseeId: 14955,
      brandName: '맛나감자탕',
    })

    expect(html).toContain('맛나감자탕')
    expect(html).toContain('aria-label="조건 A 브랜드 변경"')
    // 검색칸(브랜드 검색)이 그려지지 않는다 — 목록 10건이 펼쳐져 A 가 B 의 두 배였다.
    expect(html).not.toContain('<input type="search"')
    expect(html).not.toContain('브랜드명 일부만 입력해도 찾아요')
    // 접힌 줄이 오류 CTA 의 브랜드 목적지다.
    expect(html).toContain(`id="${compareFieldDomId('compare-a', 'brand')}"`)
  })

  it('브랜드명이 URL 에 없으면 지어내지 않고 「선택한 브랜드」로 쓴다', () => {
    const html = render({
      franchisee: true,
      serviceCode: 'CS100001',
      franchiseeId: 14955,
      brandName: null,
    })

    expect(html).toContain('선택한 브랜드')
  })

  it('창업 형태는 입력 화면과 같은 순서다 — 프랜차이즈 먼저 (C7)', () => {
    const html = render({})

    expect(html.indexOf('>프랜차이즈</option>')).toBeLessThan(
      html.indexOf('>개인 창업</option>'),
    )
  })

  it('오류 CTA 가 찾아갈 필드 id 를 섹션마다 둔다 (C5)', () => {
    const html = render({})

    for (const section of [
      'franchise',
      'district',
      'service',
      'store',
    ] as const) {
      expect(html).toContain(`id="${compareFieldDomId('compare-a', section)}"`)
    }
  })
})
