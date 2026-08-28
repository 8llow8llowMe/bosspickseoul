import { describe, expect, it } from 'vitest'
import { Coffee, Scissors, Soup } from 'lucide-react'

import { simulationCatalog } from '@/data/simulation-catalog'

import { POPULAR_SERVICE_CODES } from './popular-services'
import { resolveServiceIcon } from './service-icons'

const catalogCodes = new Set(
  Object.values(simulationCatalog).flatMap(services =>
    services.map(service => service.code),
  ),
)

describe('POPULAR_SERVICE_CODES', () => {
  // 선택 뷰는 정적 카탈로그로 목록을 만든다. 카탈로그에 없는 코드를 인기로
  // 올리면 그 칸만 조용히 빠져 5개가 나온다.
  it('every code exists in the static catalog', () => {
    for (const code of POPULAR_SERVICE_CODES) {
      expect(catalogCodes.has(code), code).toBe(true)
    }
  })

  it('has no duplicates', () => {
    expect(new Set(POPULAR_SERVICE_CODES).size).toBe(
      POPULAR_SERVICE_CODES.length,
    )
  })

  // A-3-1 — 두 집계 방식이 일치하는 상위 6개까지만 쓴다.
  it('keeps the count within the evidence range', () => {
    expect(POPULAR_SERVICE_CODES.length).toBeGreaterThanOrEqual(6)
    expect(POPULAR_SERVICE_CODES.length).toBeLessThanOrEqual(8)
  })

  // A-3-2 — 인기 섹션에만 아이콘을 붙이는 근거는 「6개가 서로 다른 아이콘을
  // 갖는다」는 것이다. 대분류 폴백으로 뭉치면 아이콘이 구분에 기여하지 않는다.
  it('each popular service has its own distinct icon', () => {
    const icons = POPULAR_SERVICE_CODES.map(resolveServiceIcon)

    expect(new Set(icons).size).toBe(icons.length)
    expect(resolveServiceIcon('CS100001')).toBe(Soup)
    expect(resolveServiceIcon('CS100010')).toBe(Coffee)
    expect(resolveServiceIcon('CS200028')).toBe(Scissors)
  })
})
