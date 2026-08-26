import { describe, expect, it } from 'vitest'
import { simulationCatalog } from './simulation-catalog'
import {
  SIMULATION_FLOOR_TYPES,
  SIMULATION_SEED_BASE_YEAR,
  SIMULATION_SERVICE_TYPES,
  findSimulationServiceType,
  isSimulationServiceCode,
} from './simulation-service-types'

describe('SIMULATION_SERVICE_TYPES', () => {
  it('시뮬레이션 지원 업종은 30종이다', () => {
    // 백엔드 시드(simulation_service_type)와 같은 개수. 시드가 바뀌면 여기서 먼저 깨진다.
    expect(SIMULATION_SERVICE_TYPES).toHaveLength(30)
  })

  it('코드가 중복 없이 CS + 6자리 형식이다', () => {
    const codes = SIMULATION_SERVICE_TYPES.map(item => item.code)

    expect(new Set(codes).size).toBe(codes.length)
    for (const code of codes) {
      expect(code).toMatch(/^CS\d{6}$/)
    }
  })

  it('코드 오름차순으로 정렬돼 있다', () => {
    const codes = SIMULATION_SERVICE_TYPES.map(item => item.code)

    expect(codes).toEqual([...codes].sort())
  })

  it('카테고리 그룹 UI 데이터(simulation-catalog)와 코드·이름이 일치한다', () => {
    // simulation-catalog 는 recommend 화면도 함께 쓰는 공유 데이터라 한쪽만 바뀌면 조용히 어긋난다.
    const catalogEntries = Object.values(simulationCatalog)
      .flat()
      .map(item => `${item.code}|${item.name}`)
      .sort()
    const supported = SIMULATION_SERVICE_TYPES.map(
      item => `${item.code}|${item.name}`,
    ).sort()

    expect(supported).toEqual(catalogEntries)
  })

  it('기준 연도 상수가 시드 base_year 와 같다', () => {
    expect(SIMULATION_SEED_BASE_YEAR).toBe('2024')
  })
})

describe('isSimulationServiceCode', () => {
  it('지원 업종이면 true', () => {
    expect(isSimulationServiceCode('CS100001')).toBe(true)
  })

  it('미지원 업종이면 false — store-sizes 404(SIMULATION_001)를 선택 단계에서 막는다', () => {
    expect(isSimulationServiceCode('CS999999')).toBe(false)
  })

  it('null·undefined·빈 문자열을 안전하게 걸러낸다', () => {
    expect(isSimulationServiceCode(null)).toBe(false)
    expect(isSimulationServiceCode(undefined)).toBe(false)
    expect(isSimulationServiceCode('')).toBe(false)
  })
})

describe('findSimulationServiceType', () => {
  it('지원 업종은 이름을 돌려준다', () => {
    expect(findSimulationServiceType('CS100010')).toEqual({
      code: 'CS100010',
      name: '커피-음료',
    })
  })

  it('미지원 업종은 null', () => {
    expect(findSimulationServiceType('CS999999')).toBeNull()
  })
})

describe('SIMULATION_FLOOR_TYPES', () => {
  it('요청 enum 두 종만 노출한다', () => {
    expect(SIMULATION_FLOOR_TYPES.map(item => item.code)).toEqual([
      'FIRST_FLOOR',
      'OTHER',
    ])
  })
})
