import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/lib/api/client'
import {
  buildFranchiseeSearchParams,
  buildSimulationHistorySaveRequest,
  buildSimulationReportRequest,
  createSimulationReport,
  createSimulationReportPair,
  fetchSimulationFranchisees,
  fetchSimulationHistories,
  fetchSimulationStoreSizes,
  saveSimulationHistory,
} from './simulation'

const ok = <T>(dataBody: T) => ({
  dataHeader: { success: true, resultCode: null, resultMessage: null },
  dataBody,
})

describe('buildFranchiseeSearchParams', () => {
  it('첫 조회에는 keyword/lastId 키 자체를 싣지 않는다', () => {
    // lastId=0 을 보내면 "0번 다음부터"라는 커서 의미가 되어 첫 페이지가 아니게 된다.
    expect(
      buildFranchiseeSearchParams({ serviceCode: 'CS100001' }).toString(),
    ).toBe('serviceCode=CS100001')
  })

  it('빈 문자열·공백 keyword 는 생략한다', () => {
    expect(
      buildFranchiseeSearchParams({
        serviceCode: 'CS100001',
        keyword: '   ',
        lastId: null,
      }).toString(),
    ).toBe('serviceCode=CS100001')
  })

  it('커서와 키워드가 있으면 함께 싣는다', () => {
    expect(
      buildFranchiseeSearchParams({
        serviceCode: 'CS100001',
        keyword: '본가',
        lastId: 17208,
      }).toString(),
    ).toBe('serviceCode=CS100001&keyword=%EB%B3%B8%EA%B0%80&lastId=17208')
  })

  it('lastId 0 은 유효한 커서라 유지한다', () => {
    expect(
      buildFranchiseeSearchParams({
        serviceCode: 'CS100001',
        lastId: 0,
      }).toString(),
    ).toBe('serviceCode=CS100001&lastId=0')
  })
})

describe('buildSimulationReportRequest', () => {
  it('비프랜차이즈면 franchiseeId 키를 넣지 않는다', () => {
    const request = buildSimulationReportRequest({
      franchisee: false,
      franchiseeId: 101,
      districtCode: '11740',
      serviceCode: 'CS100001',
      storeSize: 66,
      floorType: 'FIRST_FLOOR',
    })

    expect(request).toEqual({
      franchisee: false,
      districtCode: '11740',
      serviceCode: 'CS100001',
      storeSize: 66,
      floorType: 'FIRST_FLOOR',
    })
    expect('franchiseeId' in request).toBe(false)
  })

  it('프랜차이즈면 franchiseeId 를 싣는다', () => {
    expect(
      buildSimulationReportRequest({
        franchisee: true,
        franchiseeId: 16186,
        districtCode: '11680',
        serviceCode: 'CS100001',
        storeSize: 66,
        floorType: 'OTHER',
      }).franchiseeId,
    ).toBe(16186)
  })

  it('빈 periodCode 는 제거해 서버 기본값(20233)을 쓰게 한다', () => {
    // '' 를 그대로 보내면 400 SIMULATION_106 (yyyyQ 패턴 위반)이다.
    const request = buildSimulationReportRequest({
      franchisee: false,
      districtCode: '11740',
      serviceCode: 'CS100001',
      storeSize: 66,
      floorType: 'FIRST_FLOOR',
      periodCode: '',
    })

    expect('periodCode' in request).toBe(false)
  })

  it('periodCode 가 있으면 유지한다', () => {
    expect(
      buildSimulationReportRequest({
        franchisee: false,
        districtCode: '11740',
        serviceCode: 'CS100001',
        storeSize: 66,
        floorType: 'FIRST_FLOOR',
        periodCode: '20233',
      }).periodCode,
    ).toBe('20233')
  })
})

describe('buildSimulationHistorySaveRequest', () => {
  it('저장 계약에 없는 periodCode 는 버리고 totalPrice 를 더한다', () => {
    expect(
      buildSimulationHistorySaveRequest(
        {
          franchisee: true,
          franchiseeId: 16186,
          districtCode: '11680',
          serviceCode: 'CS100001',
          storeSize: 66,
          floorType: 'OTHER',
          periodCode: '20233',
        },
        28489,
      ),
    ).toEqual({
      franchisee: true,
      franchiseeId: 16186,
      districtCode: '11680',
      serviceCode: 'CS100001',
      storeSize: 66,
      floorType: 'OTHER',
      totalPrice: 28489,
    })
  })

  it('비프랜차이즈면 franchiseeId 를 넣지 않는다', () => {
    expect(
      'franchiseeId' in
        buildSimulationHistorySaveRequest(
          {
            franchisee: false,
            districtCode: '11740',
            serviceCode: 'CS100001',
            storeSize: 66,
            floorType: 'FIRST_FLOOR',
          },
          6591,
        ),
    ).toBe(false)
  })
})

describe('simulation API endpoints', () => {
  afterEach(() => vi.restoreAllMocks())

  it('store-sizes 는 V2 경로에 serviceCode 를 실어 부른다', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: ok({}) })

    await fetchSimulationStoreSizes('CS100001')

    expect(get).toHaveBeenCalledWith(
      '/simulations/store-sizes?serviceCode=CS100001',
    )
  })

  it('franchisees 는 커서 파라미터를 붙여 부른다', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: ok({}) })

    await fetchSimulationFranchisees({
      serviceCode: 'CS100001',
      keyword: '본',
      lastId: 17208,
    })

    expect(get).toHaveBeenCalledWith(
      '/simulations/franchisees?serviceCode=CS100001&keyword=%EB%B3%B8&lastId=17208',
    )
  })

  it('reports 는 POST 동기 계산이다 (폴링·SSE 경로가 아니다)', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: ok({}) })
    const payload = {
      franchisee: false as const,
      districtCode: '11740',
      serviceCode: 'CS100001',
      storeSize: 66,
      floorType: 'FIRST_FLOOR' as const,
    }

    await createSimulationReport(payload)

    expect(post).toHaveBeenCalledWith('/simulations/reports', payload)
  })

  it('비교는 reports 를 2회 호출한다 (비교 API 가 없다)', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: ok({}) })
    const left = {
      franchisee: false as const,
      districtCode: '11740',
      serviceCode: 'CS100001',
      storeSize: 66,
      floorType: 'FIRST_FLOOR' as const,
    }
    const right = { ...left, districtCode: '11680' }

    await createSimulationReportPair([left, right])

    expect(post).toHaveBeenCalledTimes(2)
    expect(post).toHaveBeenNthCalledWith(1, '/simulations/reports', left)
    expect(post).toHaveBeenNthCalledWith(2, '/simulations/reports', right)
  })

  it('histories 저장은 POST /simulations/histories 다', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: ok({}) })
    const payload = {
      franchisee: false as const,
      districtCode: '11740',
      serviceCode: 'CS100001',
      storeSize: 66,
      floorType: 'FIRST_FLOOR' as const,
      totalPrice: 6591,
    }

    await saveSimulationHistory(payload)

    expect(post).toHaveBeenCalledWith('/simulations/histories', payload)
  })

  it('histories 목록은 page/size 를 쿼리로 넘기고 기본값은 0/10 이다', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: ok({}) })

    await fetchSimulationHistories()
    expect(get).toHaveBeenCalledWith('/simulations/histories?page=0&size=10')

    await fetchSimulationHistories(2, 50)
    expect(get).toHaveBeenCalledWith('/simulations/histories?page=2&size=50')
  })

  it('V1 경로(/simulation, /simulation/store)를 더는 부르지 않는다', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: ok({}) })
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: ok({}) })

    await fetchSimulationStoreSizes('CS100001')
    await fetchSimulationHistories()
    await createSimulationReport({
      franchisee: false,
      districtCode: '11740',
      serviceCode: 'CS100001',
      storeSize: 66,
      floorType: 'FIRST_FLOOR',
    })

    const paths = [
      ...get.mock.calls.map(call => call[0]),
      ...post.mock.calls.map(call => call[0]),
    ]

    for (const path of paths) {
      expect(String(path).startsWith('/simulations/')).toBe(true)
    }
  })
})
