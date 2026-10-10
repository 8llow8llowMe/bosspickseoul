import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  applyRememberedService,
  LAST_ANALYSIS_SERVICE_STORAGE_KEY,
  parseRememberedAnalysisService,
  readLastAnalysisService,
  rememberLastAnalysisService,
  subscribeLastAnalysisService,
} from '@/lib/analysis/last-service'
import {
  createEmptyAnalysisSelection,
  selectAnalysisValue,
  type AnalysisSelection,
} from '@/lib/analysis/selection'

const createStorage = () => {
  const map = new Map<string, string>()
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
  }
}

let store: ReturnType<typeof createStorage>

beforeEach(() => {
  store = createStorage()
  vi.stubGlobal('window', { localStorage: store })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const regionOnly: AnalysisSelection = {
  ...createEmptyAnalysisSelection(),
  districtCode: '11440',
  administrationCode: '11440660',
  commercialCode: '3110565',
}

describe('마지막으로 쓴 업종 기억 (#562)', () => {
  it('기억한 업종을 그대로 읽는다', () => {
    rememberLastAnalysisService({ code: 'CS100010', name: '커피-음료' })
    expect(readLastAnalysisService()).toEqual({
      code: 'CS100010',
      name: '커피-음료',
    })
  })

  it('쓰면 구독자에게 알린다 (같은 탭에는 storage 이벤트가 오지 않는다)', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeLastAnalysisService(listener)
    rememberLastAnalysisService({ code: 'CS100001', name: '한식음식점' })
    expect(listener).toHaveBeenCalledTimes(1)
    unsubscribe()
    rememberLastAnalysisService({ code: 'CS100010', name: '커피-음료' })
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('빈 코드·이름은 기억하지 않는다', () => {
    rememberLastAnalysisService({ code: ' ', name: '한식음식점' })
    rememberLastAnalysisService({ code: 'CS100001', name: '' })
    expect(store.getItem(LAST_ANALYSIS_SERVICE_STORAGE_KEY)).toBeNull()
  })

  it('손상된 값은 기억이 없는 것으로 본다', () => {
    expect(parseRememberedAnalysisService('{not json')).toBeNull()
    expect(parseRememberedAnalysisService('{"code":1,"name":"x"}')).toBeNull()
    expect(parseRememberedAnalysisService(null)).toBeNull()
  })

  it('저장소 접근이 막혀도 던지지 않는다', () => {
    vi.stubGlobal('window', {
      get localStorage(): Storage {
        throw new Error('SecurityError')
      },
    })
    expect(() =>
      rememberLastAnalysisService({ code: 'CS100001', name: '한식음식점' }),
    ).not.toThrow()
    expect(readLastAnalysisService()).toBeNull()
  })
})

describe('applyRememberedService', () => {
  const remembered = { code: 'CS100010', name: '커피-음료' }

  it('업종이 비어 있으면 기억한 업종으로 채운다', () => {
    expect(applyRememberedService(regionOnly, remembered).serviceCode).toBe(
      'CS100010',
    )
  })

  it('이미 고른 업종은 덮어쓰지 않는다', () => {
    const chosen = { ...regionOnly, serviceCode: 'CS100001' }
    expect(applyRememberedService(chosen, remembered)).toBe(chosen)
  })

  it('기억이 없으면 선택을 그대로 둔다', () => {
    expect(applyRememberedService(regionOnly, null)).toBe(regionOnly)
  })

  it('다른 동 상권 하나 더 보기: 행정동을 바꿔도 업종이 남아 상권만 고르면 완료다', () => {
    const complete = { ...regionOnly, serviceCode: 'CS100001' }
    const otherDong = selectAnalysisValue(
      complete,
      'administration',
      '11440680',
    )
    const otherCommercial = selectAnalysisValue(
      otherDong,
      'commercial',
      '3110570',
    )
    expect(
      applyRememberedService(otherCommercial, remembered).serviceCode,
    ).toBe('CS100001')
  })
})
