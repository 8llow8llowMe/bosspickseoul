// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'

import {
  buildSimulationBuilderMirrorHref,
  mirrorSimulationConditionsToUrl,
  SIMULATION_CONDITION_PARAM_NAMES,
} from '@/lib/simulation/builder-url'
import { createSimulationConditionState } from '@/lib/simulation/conditions'
import {
  parseSimulationConditionState,
  toSimulationConditionSearchParams,
} from '@/lib/simulation/report-route'

const FRANCHISE = createSimulationConditionState({
  franchisee: true,
  franchiseeId: 14955,
  brandName: '맛나감자탕',
  districtCode: '11440',
  serviceCode: 'CS100001',
  storeSize: 66,
  floorType: 'FIRST_FLOOR',
})

const PARTIAL = createSimulationConditionState({
  franchisee: false,
  districtCode: '11680',
})

const readBack = (href: string) => {
  const url = new URL(href, 'http://localhost')
  return parseSimulationConditionState(url.searchParams)
}

/**
 * #568 — 입력 중인 조건을 주소창에 보존한다. 쓰는 쪽(거울)과 읽는 쪽(`parseSimulationConditionState`)이
 * 같은 키를 써야 새로고침·공유로 같은 조건이 돌아온다.
 */
describe('buildSimulationBuilderMirrorHref — 직렬화 왕복', () => {
  it('완성된 조건은 브랜드명까지 그대로 돌아온다', () => {
    const href = buildSimulationBuilderMirrorHref(
      { pathname: '/simulation', search: '', hash: '' },
      FRANCHISE,
    )

    expect(href.startsWith('/simulation?')).toBe(true)
    expect(readBack(href)).toEqual(FRANCHISE)
  })

  it('계산 전(미완성) 조건도 고른 만큼 돌아온다 — 계산 전 조건도 링크로 보낼 수 있다', () => {
    const href = buildSimulationBuilderMirrorHref(
      { pathname: '/simulation', search: '', hash: '' },
      PARTIAL,
    )

    expect(readBack(href)).toEqual(PARTIAL)
    expect(href).not.toContain('storeSize')
  })

  it('아무것도 고르지 않았으면 쿼리 없이 경로만 남긴다', () => {
    expect(
      buildSimulationBuilderMirrorHref(
        { pathname: '/simulation', search: '?districtCode=11680', hash: '' },
        createSimulationConditionState(),
      ),
    ).toBe('/simulation')
  })

  it('비워진 칸은 주소창에서도 지운다 — 업종을 바꿔 비워진 면적이 옛 값으로 남지 않는다', () => {
    const href = buildSimulationBuilderMirrorHref(
      {
        pathname: '/simulation',
        search: '?franchisee=false&districtCode=11680&storeSize=66',
        hash: '',
      },
      PARTIAL,
    )

    expect(
      new URL(href, 'http://localhost').searchParams.has('storeSize'),
    ).toBe(false)
  })

  it('조건이 아닌 키(분석 컨텍스트)와 해시는 그대로 둔다', () => {
    const href = buildSimulationBuilderMirrorHref(
      {
        pathname: '/analysis/simulation',
        search: '?gugun=%EA%B0%95%EB%82%A8%EA%B5%AC&commercialCode=3110001',
        hash: '#simulation-section-store',
      },
      PARTIAL,
    )
    const url = new URL(href, 'http://localhost')

    expect(url.pathname).toBe('/analysis/simulation')
    expect(url.searchParams.get('gugun')).toBe('강남구')
    expect(url.searchParams.get('commercialCode')).toBe('3110001')
    expect(url.hash).toBe('#simulation-section-store')
    expect(parseSimulationConditionState(url.searchParams)).toEqual(PARTIAL)
  })

  it('지우는 키 목록이 조건 코덱이 쓰는 키를 모두 덮는다', () => {
    const written = [...toSimulationConditionSearchParams(FRANCHISE).keys()]

    expect(written.length).toBeGreaterThan(0)
    for (const name of written) {
      expect(SIMULATION_CONDITION_PARAM_NAMES).toContain(name)
    }
  })
})

/**
 * 리뷰 — 분석 경유 화면은 컨텍스트 카드가 `districtCode`·`serviceCode` 를 읽는다. 거울이 덮어쓰면 새로고침 뒤
 * 바뀐 자치구·업종이 「분석 조건」으로 읽혔다. 분석 화면이 실제로 만드는 진입 형식 그대로 확인한다.
 */
describe('buildSimulationBuilderMirrorHref — 분석 경유 화면', () => {
  const ENTRY =
    '?districtCode=11440&administrationCode=11440660&commercialCode=3110567&serviceCode=CS100001'

  it('분석 컨텍스트 키는 진입 값 그대로 두고 나머지 조건만 싣는다', () => {
    const edited = createSimulationConditionState({
      franchisee: false,
      districtCode: '11680', // 사용자가 강남구로 바꿨다
      serviceCode: 'CS100002', // 업종도 바꿨다
      storeSize: 66,
      floorType: 'OTHER',
    })

    const href = buildSimulationBuilderMirrorHref(
      { pathname: '/analysis/simulation', search: ENTRY, hash: '' },
      edited,
      'analysis',
    )
    const params = new URL(href, 'http://localhost').searchParams

    expect(params.get('districtCode')).toBe('11440')
    expect(params.get('serviceCode')).toBe('CS100001')
    expect(params.get('administrationCode')).toBe('11440660')
    expect(params.get('commercialCode')).toBe('3110567')
    expect(params.get('franchisee')).toBe('false')
    expect(params.get('storeSize')).toBe('66')
    expect(params.get('floorType')).toBe('OTHER')
  })

  it('컨텍스트가 실어 오지 않은 키도 분석 화면에서는 싣지 않는다 — 다음 진입의 컨텍스트로 읽힌다', () => {
    const href = buildSimulationBuilderMirrorHref(
      {
        pathname: '/analysis/simulation',
        search: '?commercialCode=3110567',
        hash: '',
      },
      createSimulationConditionState({ districtCode: '11680' }),
      'analysis',
    )

    expect(href).toBe('/analysis/simulation?commercialCode=3110567')
  })

  it('단독 화면은 자치구·업종도 거울에 싣는다', () => {
    const href = buildSimulationBuilderMirrorHref(
      { pathname: '/simulation', search: ENTRY, hash: '' },
      createSimulationConditionState({ districtCode: '11680' }),
    )

    expect(
      new URL(href, 'http://localhost').searchParams.get('districtCode'),
    ).toBe('11680')
  })
})

describe('mirrorSimulationConditionsToUrl — 히스토리', () => {
  afterEach(() => {
    window.history.replaceState(null, '', '/')
  })

  it('replaceState 로 주소만 바꾼다 — 조건마다 히스토리 항목을 쌓지 않는다', () => {
    window.history.replaceState(
      null,
      '',
      '/simulation#simulation-section-store',
    )
    const before = window.history.length

    mirrorSimulationConditionsToUrl(PARTIAL)
    mirrorSimulationConditionsToUrl(FRANCHISE)

    expect(window.history.length).toBe(before)
    expect(
      parseSimulationConditionState(
        new URLSearchParams(window.location.search),
      ),
    ).toEqual(FRANCHISE)
    expect(window.location.hash).toBe('#simulation-section-store')
  })

  it('history.state 를 그대로 넘긴다 — Next 라우터가 내부 호출로 보고 네비게이션을 붙이지 않게', () => {
    const marker = { __NA: true, __PRIVATE_NEXTJS_INTERNALS_TREE: 'tree' }
    window.history.replaceState(marker, '', '/simulation')

    mirrorSimulationConditionsToUrl(PARTIAL)

    expect(window.history.state).toEqual(marker)
  })
})
