import { describe, expect, it } from 'vitest'

import {
  buildSimulationAnalysisHref,
  isSimulationContextApplied,
  parseSimulationAnalysisContext,
  readSimulationAnalysisContextParams,
  toSimulationAnalysisContextSearchParams,
  withSimulationAnalysisContext,
  type SimulationAnalysisContext,
} from '@/lib/simulation/analysis-context'

const params = (init: Record<string, string>) => new URLSearchParams(init)

describe('parseSimulationAnalysisContext', () => {
  it('컨텍스트가 없으면 null이다 (카드 없이 정상 동작)', () => {
    expect(parseSimulationAnalysisContext(params({}))).toBeNull()
  })

  it('/analysis 관용구인 districtCode·serviceCode를 읽는다', () => {
    const context = parseSimulationAnalysisContext(
      params({ districtCode: '11740', serviceCode: 'CS100001' }),
    )

    expect(context).toEqual({
      districtCode: '11740',
      districtName: '강동구',
      serviceCode: 'CS100001',
      serviceName: '한식음식점',
      administrationCode: null,
      commercialCode: null,
    })
  })

  it('분석 결과 화면이 아직 보내는 gugun(자치구 이름)도 받아준다', () => {
    const context = parseSimulationAnalysisContext(
      params({ gugun: '강동구', serviceCode: 'CS100001' }),
    )

    expect(context?.districtCode).toBe('11740')
    expect(context?.districtName).toBe('강동구')
  })

  it('districtCode가 있으면 gugun보다 우선한다', () => {
    const context = parseSimulationAnalysisContext(
      params({ districtCode: '11680', gugun: '강동구' }),
    )

    expect(context?.districtName).toBe('강남구')
  })

  it('지원하지 않는 업종 코드는 버린다', () => {
    const context = parseSimulationAnalysisContext(
      params({ districtCode: '11740', serviceCode: 'CS999999' }),
    )

    expect(context?.serviceCode).toBeNull()
    expect(context?.serviceName).toBeNull()
  })

  it('ctx 키가 있으면 그것을 컨텍스트로 읽고 조건 키는 컨텍스트로 보지 않는다 (#635)', () => {
    const context = parseSimulationAnalysisContext(
      params({
        ctxDistrictCode: '11440',
        ctxAdministrationCode: '11440660',
        ctxCommercialCode: '3110567',
        ctxServiceCode: 'CS100001',
        // 사용자가 입력 화면에서 바꾼 조건이다. 분석 조건이 아니다.
        districtCode: '11680',
        serviceCode: 'CS100002',
      }),
    )

    expect(context).toEqual({
      districtCode: '11440',
      districtName: '마포구',
      serviceCode: 'CS100001',
      serviceName: '한식음식점',
      administrationCode: '11440660',
      commercialCode: '3110567',
    })
  })

  it('ctx 키가 하나라도 있으면 옛 키로 빈칸을 메우지 않는다 — 두 형식을 섞지 않는다', () => {
    const context = parseSimulationAnalysisContext(
      params({
        ctxCommercialCode: '3110567',
        districtCode: '11680',
        gugun: '강동구',
        serviceCode: 'CS100002',
      }),
    )

    expect(context?.districtCode).toBeNull()
    expect(context?.serviceCode).toBeNull()
    expect(context?.commercialCode).toBe('3110567')
  })

  it('빈 문자열 파라미터는 없는 것으로 본다', () => {
    expect(
      parseSimulationAnalysisContext(
        params({ serviceCode: '', gugun: '  ', commercialCode: '' }),
      ),
    ).toBeNull()
  })
})

describe('buildSimulationAnalysisHref', () => {
  it('분석 화면의 선택을 ctx 키에만 싣는다 — 조건 키는 비워 둔다 (#635)', () => {
    const href = buildSimulationAnalysisHref({
      districtCode: '11440',
      administrationCode: '11440660',
      commercialCode: '3110567',
      serviceCode: 'CS100001',
    })
    const url = new URL(href, 'http://localhost')

    expect(url.pathname).toBe('/analysis/simulation')
    expect(Object.fromEntries(url.searchParams)).toEqual({
      ctx: '1',
      ctxDistrictCode: '11440',
      ctxAdministrationCode: '11440660',
      ctxCommercialCode: '3110567',
      ctxServiceCode: 'CS100001',
    })
    expect(parseSimulationAnalysisContext(url.searchParams)?.districtName).toBe(
      '마포구',
    )
  })

  it('비어 있는 코드는 키째 뺀다', () => {
    expect(
      buildSimulationAnalysisHref({
        districtCode: '11440',
        administrationCode: '',
        commercialCode: '3110567',
        serviceCode: '',
      }),
    ).toBe(
      '/analysis/simulation?ctx=1&ctxDistrictCode=11440&ctxCommercialCode=3110567',
    )
  })
})

describe('새 형식 표식 ctx=1 (#635 리뷰)', () => {
  it('표식만 있으면 옛 키를 읽지 않는다 — 거울이 쓴 조건을 분석 조건으로 오독하지 않는다', () => {
    expect(
      parseSimulationAnalysisContext(
        params({ ctx: '1', districtCode: '11680', serviceCode: 'CS100001' }),
      ),
    ).toBeNull()
  })

  it('컨텍스트가 없어도 새 형식 쿼리에는 표식이 실린다', () => {
    expect(toSimulationAnalysisContextSearchParams(null).toString()).toBe(
      'ctx=1',
    )
  })
})

describe('readSimulationAnalysisContextParams — 리포트·비교 왕복 (#635 리뷰)', () => {
  it('ctx 키만 옮기고 계산 조건 키는 컨텍스트로 읽지 않는다', () => {
    const carried = readSimulationAnalysisContextParams(
      params({
        franchisee: 'false',
        districtCode: '11440',
        serviceCode: 'CS100001',
        ctx: '1',
        ctxDistrictCode: '11410',
        ctxCommercialCode: '3110001',
      }),
    )

    expect(Object.fromEntries(carried)).toEqual({
      ctx: '1',
      ctxDistrictCode: '11410',
      ctxCommercialCode: '3110001',
    })
  })

  it('컨텍스트 없는 리포트 주소(옛 링크)에서도 표식만 싣는다 — 계산 조건이 분석 조건으로 읽히지 않게', () => {
    const carried = readSimulationAnalysisContextParams(
      params({ districtCode: '11440', serviceCode: 'CS100001' }),
    )

    expect(carried.toString()).toBe('ctx=1')
  })
})

describe('withSimulationAnalysisContext', () => {
  const carried = new URLSearchParams('ctx=1&ctxDistrictCode=11410')

  it('쿼리 뒤, 해시 앞에 덧붙인다', () => {
    expect(
      withSimulationAnalysisContext(
        '/analysis/simulation?districtCode=11440#simulation-section-store',
        carried,
      ),
    ).toBe(
      '/analysis/simulation?districtCode=11440&ctx=1&ctxDistrictCode=11410#simulation-section-store',
    )
  })

  it('쿼리가 없는 경로에는 ? 로 붙이고, 컨텍스트가 없으면 그대로 둔다', () => {
    expect(withSimulationAnalysisContext('/analysis/simulation', carried)).toBe(
      '/analysis/simulation?ctx=1&ctxDistrictCode=11410',
    )
    expect(withSimulationAnalysisContext('/simulation?a=1', null)).toBe(
      '/simulation?a=1',
    )
  })
})

describe('isSimulationContextApplied', () => {
  const context: SimulationAnalysisContext = {
    districtCode: '11410',
    districtName: '서대문구',
    serviceCode: 'CS100001',
    serviceName: '한식음식점',
    administrationCode: null,
    commercialCode: null,
  }

  it('가져온 조건 그대로면 true', () => {
    expect(
      isSimulationContextApplied(context, {
        districtCode: '11410',
        serviceCode: 'CS100001',
      }),
    ).toBe(true)
  })

  it('하나라도 바뀌면 false — 카드가 "그대로 채워 뒀어요"를 못 쓰게 한다', () => {
    expect(
      isSimulationContextApplied(context, {
        districtCode: '11740',
        serviceCode: 'CS100001',
      }),
    ).toBe(false)
    expect(
      isSimulationContextApplied(context, {
        districtCode: '11410',
        serviceCode: 'CS100007',
      }),
    ).toBe(false)
    expect(
      isSimulationContextApplied(context, {
        districtCode: null,
        serviceCode: null,
      }),
    ).toBe(false)
  })

  it('컨텍스트가 채우지 않은 칸을 사용자가 고르는 건 어긋남이 아니다', () => {
    const districtOnly: SimulationAnalysisContext = {
      ...context,
      serviceCode: null,
      serviceName: null,
    }

    expect(
      isSimulationContextApplied(districtOnly, {
        districtCode: '11410',
        serviceCode: 'CS100007',
      }),
    ).toBe(true)
  })
})
