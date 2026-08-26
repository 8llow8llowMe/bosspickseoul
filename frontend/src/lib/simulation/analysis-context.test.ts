import { describe, expect, it } from 'vitest'

import { parseSimulationAnalysisContext } from '@/lib/simulation/analysis-context'

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
