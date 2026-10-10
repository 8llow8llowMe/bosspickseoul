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

/** #567 — B 는 A 복사본으로 시작한다. 바꾼 칸에만 「A와 다름」을 단다. */
describe('SimulationConditionCompactEditor — 기준(조건 A)과 다른 칸', () => {
  const a: Partial<SimulationConditionState> = {
    franchisee: false,
    districtCode: '11680',
    serviceCode: 'CS100001',
    storeSize: 66,
    floorType: 'FIRST_FLOOR',
  }

  const renderB = (state: Partial<SimulationConditionState>) =>
    renderToStaticMarkup(
      createElement(SimulationConditionCompactEditor, {
        label: '조건 B',
        conditions: controller(state),
        idPrefix: 'compare-b',
        reference: { ...createEmptySimulationConditionState(), ...a },
      }),
    )

  it('복사 직후에는 배지가 없다', () => {
    expect(renderB(a)).not.toContain('A와 다름')
  })

  it('층만 바꾸면 층 칸에만 배지를 달고 낭독기에도 잇는다', () => {
    const html = renderB({ ...a, floorType: 'OTHER' })

    expect(html.match(/A와 다름/g)).toHaveLength(1)
    expect(html).toContain('id="compare-b-floorType-changed"')
    expect(html).toContain('aria-describedby="compare-b-floorType-changed"')
  })

  it('면적을 바꾸면 면적 칸 이름 옆에 배지를 단다', () => {
    const html = renderB({ ...a, storeSize: 40 })

    expect(html).toContain('id="compare-b-storeSize-changed"')
    // TextField 가 helper id 를 뒤에 이어 붙이므로 배지 id 가 맨 앞에 오는지만 본다
    expect(html).toMatch(
      /aria-describedby="compare-b-storeSize-changed( [^"]*)?"/,
    )
  })

  it('기준을 넘기지 않는 조건 A 편집기에는 배지가 없다', () => {
    expect(render({ ...a, floorType: 'OTHER' })).not.toContain('A와 다름')
  })
})
