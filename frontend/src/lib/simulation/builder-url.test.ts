// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'

import {
  buildSimulationBuilderMirrorHref,
  mirrorSimulationConditionsToUrl,
  SIMULATION_CONDITION_PARAM_NAMES,
} from '@/lib/simulation/builder-url'
import {
  buildSimulationAnalysisHref,
  isSimulationContextApplied,
  parseSimulationAnalysisContext,
} from '@/lib/simulation/analysis-context'
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
 * #635 — 분석 경유 화면도 자치구·업종을 주소에 남긴다. 컨텍스트는 `ctx` 키에 따로 있어 겹치지 않는다.
 * 분석 화면이 실제로 만드는 진입 형식(`buildSimulationAnalysisHref`)과 #635 이전의 옛 형식을 둘 다 확인한다.
 */
describe('buildSimulationBuilderMirrorHref — 분석 경유 화면', () => {
  const ENTRY = new URL(
    buildSimulationAnalysisHref({
      districtCode: '11440',
      administrationCode: '11440660',
      commercialCode: '3110567',
      serviceCode: 'CS100001',
    }),
    'http://localhost',
  ).search
  const LEGACY_ENTRY =
    '?districtCode=11440&administrationCode=11440660&commercialCode=3110567&serviceCode=CS100001'

  const EDITED = createSimulationConditionState({
    franchisee: false,
    districtCode: '11680', // 사용자가 강남구로 바꿨다
    serviceCode: 'CS100002', // 업종도 바꿨다
    storeSize: 66,
    floorType: 'OTHER',
  })

  /** 화면이 마운트 때 고정하는 컨텍스트 — 진입 주소에서 한 번 읽는다. */
  const entryContext = (search: string) =>
    parseSimulationAnalysisContext(new URLSearchParams(search))

  /** `search` 는 지금 주소, `context` 는 마운트 때 고정한 값이다. 기본은 지금 주소가 곧 진입 주소인 경우다. */
  const mirror = (
    search: string,
    state = EDITED,
    context = entryContext(search),
  ) =>
    new URL(
      buildSimulationBuilderMirrorHref(
        { pathname: '/analysis/simulation', search, hash: '' },
        state,
        'analysis',
        context,
      ),
      'http://localhost',
    ).searchParams

  it('바꾼 자치구·업종도 조건 키에 싣고 ctx 키는 진입 값 그대로 둔다', () => {
    const params = mirror(ENTRY)

    expect(parseSimulationConditionState(params)).toEqual(EDITED)
    expect(params.get('ctxDistrictCode')).toBe('11440')
    expect(params.get('ctxServiceCode')).toBe('CS100001')
    expect(params.get('ctxAdministrationCode')).toBe('11440660')
    expect(params.get('ctxCommercialCode')).toBe('3110567')
  })

  it('새로고침하면 바꾼 조건과 분석 컨텍스트가 각자 그대로 읽힌다', () => {
    const params = mirror(ENTRY)
    const context = parseSimulationAnalysisContext(params)

    expect(parseSimulationConditionState(params).districtCode).toBe('11680')
    expect(context?.districtCode).toBe('11440')
    expect(context?.serviceCode).toBe('CS100001')
    expect(context && isSimulationContextApplied(context, EDITED)).toBe(false)
  })

  it('옛 형식 링크는 진입 주소의 컨텍스트를 ctx 키로 옮기고 옛 컨텍스트 키를 지운다', () => {
    const entryState = parseSimulationConditionState(
      new URLSearchParams(LEGACY_ENTRY),
    )
    const params = mirror(LEGACY_ENTRY, entryState)

    expect(Object.fromEntries(params)).toEqual({
      ctx: '1',
      ctxDistrictCode: '11440',
      ctxAdministrationCode: '11440660',
      ctxCommercialCode: '3110567',
      ctxServiceCode: 'CS100001',
      districtCode: '11440',
      serviceCode: 'CS100001',
    })
  })

  it('옮긴 뒤 조건을 바꿔도 컨텍스트는 옛 진입 값에 머문다', () => {
    const context = entryContext(LEGACY_ENTRY)
    const migrated = mirror(
      LEGACY_ENTRY,
      parseSimulationConditionState(new URLSearchParams(LEGACY_ENTRY)),
      context,
    )
    const params = mirror(`?${migrated}`, EDITED, context)

    expect(parseSimulationAnalysisContext(params)?.districtCode).toBe('11440')
    expect(parseSimulationConditionState(params)).toEqual(EDITED)
  })

  it('지금 주소를 다시 읽지 않는다 — 고정한 컨텍스트만 쓴다', () => {
    // 지금 주소에 다른 ctx 값이 있어도(손으로 고친 주소 등) 마운트 때 고정한 값으로 되쓴다.
    const params = mirror(
      '?ctx=1&ctxDistrictCode=11680&districtCode=11680',
      EDITED,
      entryContext(ENTRY),
    )

    expect(params.get('ctxDistrictCode')).toBe('11440')
  })

  it('옛 형식의 gugun(자치구 이름)도 코드로 바꿔 ctx 키에 옮긴다', () => {
    const params = mirror(
      '?gugun=%EA%B0%95%EB%8F%99%EA%B5%AC&commercialCode=3110001',
      createSimulationConditionState({ districtCode: '11740' }),
    )

    expect(params.has('gugun')).toBe(false)
    expect(params.has('commercialCode')).toBe(false)
    expect(params.get('ctxDistrictCode')).toBe('11740')
    expect(params.get('ctxCommercialCode')).toBe('3110001')
  })

  it('컨텍스트 없이 연 화면은 표식과 조건만 싣는다', () => {
    expect(
      buildSimulationBuilderMirrorHref(
        { pathname: '/analysis/simulation', search: '', hash: '' },
        createSimulationConditionState({ districtCode: '11680' }),
        'analysis',
        null,
      ),
    ).toBe('/analysis/simulation?ctx=1&districtCode=11680')
  })

  it('컨텍스트 없이 연 화면에서 조건을 여러 번 바꿔도 조건이 컨텍스트로 굳지 않는다 (#635 리뷰)', () => {
    const first = mirror(
      '',
      createSimulationConditionState({ districtCode: '11680' }),
      null,
    )
    const second = mirror(
      `?${first}`,
      createSimulationConditionState({
        districtCode: '11680',
        serviceCode: 'CS100001',
      }),
      null,
    )

    expect(second.has('ctxDistrictCode')).toBe(false)
    // 새로고침: 지금 주소가 진입 주소가 된다. 카드는 뜨지 않는다.
    expect(parseSimulationAnalysisContext(second)).toBeNull()
  })

  it('단독 화면은 옛 컨텍스트 키를 옮기지 않는다 — 단독 화면에는 컨텍스트가 없다', () => {
    const href = buildSimulationBuilderMirrorHref(
      { pathname: '/simulation', search: LEGACY_ENTRY, hash: '' },
      createSimulationConditionState({ districtCode: '11680' }),
    )
    const params = new URL(href, 'http://localhost').searchParams

    expect(params.get('districtCode')).toBe('11680')
    expect(params.has('ctxDistrictCode')).toBe(false)
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
