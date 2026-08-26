import { describe, expect, it } from 'vitest'

import {
  isSimulationContextApplied,
  parseSimulationAnalysisContext,
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

  it('빈 문자열 파라미터는 없는 것으로 본다', () => {
    expect(
      parseSimulationAnalysisContext(
        params({ serviceCode: '', gugun: '  ', commercialCode: '' }),
      ),
    ).toBeNull()
  })
})

describe('isSimulationContextApplied', () => {
  const context: SimulationAnalysisContext = {
    districtCode: '11410',
    districtName: '서대문구',
    serviceCode: 'CS100001',
    serviceName: '한식음식점',
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
