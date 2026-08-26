/**
 * `/analysis/simulation` 진입 시 상단 sticky 카드에 띄울 **분석 컨텍스트** 파싱.
 *
 * 어디서 읽는가: 쿼리스트링이다. `/analysis` 흐름의 관용구(`parseAnalysisSelection`)와 같은
 * `districtCode` / `serviceCode` / `commercialCode` 키를 먼저 보고, 실제로 링크를 만드는
 * `analysis-result-view.tsx`가 아직 V1 시절 파라미터(`gugun` = 자치구 **이름**)를 보내고 있어
 * 그 형태도 함께 받아준다. (해당 파일은 다른 브랜치 소유라 이번 슬라이스에서 수정하지 않는다.)
 *
 * 파싱 결과는 **표시와 초기값 채우기에만** 쓴다. 컨텍스트가 없으면 null을 돌려주고,
 * 화면은 카드 없이 `/simulation`과 동일하게 동작해야 한다.
 */

import {
  findDistrictByCode,
  findDistrictByName,
  describeSimulationServiceName,
} from '@/lib/simulation/conditions'
import { isSimulationServiceCode } from '@/data/simulation-service-types'

type SearchParamsReader = {
  get(name: string): string | null
}

export type SimulationAnalysisContext = {
  districtCode: string | null
  districtName: string | null
  serviceCode: string | null
  serviceName: string | null
  /** 분석 화면에서 보고 있던 상권 코드. 이름은 쿼리로 오지 않아 코드만 보관한다. */
  commercialCode: string | null
}

const read = (params: SearchParamsReader, name: string): string | null => {
  const value = params.get(name)?.trim()
  return value ? value : null
}

/**
 * 쿼리스트링에서 분석 컨텍스트를 읽는다. 쓸 값이 하나도 없으면 **null**.
 *
 * 지원하지 않는 업종 코드는 버린다 — 그대로 채워 넣으면 사용자가 고르지도 않은 조건으로
 * `store-sizes`가 404 `SIMULATION_001`을 내고, 원인이 화면에 드러나지 않는다.
 */
export const parseSimulationAnalysisContext = (
  params: SearchParamsReader,
): SimulationAnalysisContext | null => {
  const districtByCode = findDistrictByCode(read(params, 'districtCode'))
  const districtByName = districtByCode
    ? null
    : findDistrictByName(read(params, 'gugun'))
  const district = districtByCode ?? districtByName

  const rawServiceCode = read(params, 'serviceCode')
  const serviceCode = isSimulationServiceCode(rawServiceCode)
    ? rawServiceCode
    : null

  const commercialCode = read(params, 'commercialCode')

  if (!district && !serviceCode && !commercialCode) return null

  return {
    districtCode: district?.code ?? null,
    districtName: district?.name ?? null,
    serviceCode,
    serviceName: describeSimulationServiceName(serviceCode),
    commercialCode,
  }
}

/**
 * 지금 화면의 선택이 **여전히 분석에서 가져온 조건 그대로인가.**
 *
 * 이게 필요한 이유: 컨텍스트 카드가 "조건을 그대로 채워 뒀어요"라고 말하는데 사용자가
 * 자치구·업종을 바꿔 버리면 카드가 거짓말을 하게 된다. 실제로 카드는 `서대문구`·`한식음식점`인데
 * 계산 결과는 `강동구`·`치킨전문점`인 화면이 나왔다. 어느 쪽이 진짜인지 알 수 없다.
 *
 * 판정은 **컨텍스트가 실제로 채운 값만** 본다. 자치구만 넘어온 링크에서 사용자가 업종을 고르는 건
 * "조건을 바꾼" 것이 아니라 원래 비어 있던 칸을 채운 것이므로 어긋남이 아니다.
 */
export const isSimulationContextApplied = (
  context: SimulationAnalysisContext,
  selection: {
    districtCode: string | null
    serviceCode: string | null
  },
): boolean => {
  if (context.districtCode && context.districtCode !== selection.districtCode) {
    return false
  }
  if (context.serviceCode && context.serviceCode !== selection.serviceCode) {
    return false
  }
  return true
}
