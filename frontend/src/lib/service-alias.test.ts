import { describe, expect, it } from 'vitest'

import { SIMULATION_SERVICE_TYPES } from '@/data/simulation-service-types'
import { filterOptions, matchesOption } from '@/lib/option-filter'
import { SERVICE_ALIASES } from '@/lib/service-alias'

const services = [
  { code: 'CS100001', name: '한식음식점' },
  { code: 'CS100005', name: '제과점' },
  { code: 'CS100006', name: '패스트푸드점' },
  { code: 'CS100007', name: '치킨전문점' },
  { code: 'CS100009', name: '호프-간이주점' },
  { code: 'CS100010', name: '커피-음료' },
  { code: 'CS200001', name: '일반교습학원' },
  { code: 'CS200028', name: '미용실' },
  { code: 'CS300002', name: '편의점' },
  { code: 'CS300025', name: '자전거 및 기타운송장비' },
]

const names = (query: string) =>
  filterOptions(services, query).map(item => item.name)

describe('업종 별칭 검색 (#571)', () => {
  it.each([
    ['카페', ['커피-음료']],
    ['커피', ['커피-음료']],
    ['술집', ['호프-간이주점']],
    ['빵', ['제과점']],
    ['치킨', ['치킨전문점']],
    ['피자', ['패스트푸드점']],
    ['미용실', ['미용실']],
    ['헤어', ['미용실']],
    ['편의점', ['편의점']],
    ['학원', ['일반교습학원']],
  ])('%s → %j', (query, expected) => {
    expect(names(query)).toEqual(expected)
  })

  it('검색어가 별칭을 품으면 걸린다', () => {
    expect(names('동네 카페')).toEqual(['커피-음료'])
  })

  it('별칭을 치는 도중에도 걸린다', () => {
    expect(names('베이')).toEqual(['제과점'])
  })

  it('공백을 무시하고 대소문자를 구분하지 않는다', () => {
    expect(names(' C U ')).toEqual(['편의점'])
  })

  it('한 글자 별칭은 완전 일치만 인정한다 — 「바」가 「바이크」를 끌어오지 않는다', () => {
    expect(names('바')).toEqual(['호프-간이주점'])
    // 「바이」는 호프가 아니라 바이크(별칭 시작 일치)만 잡는다.
    expect(names('바이')).toEqual(['자전거 및 기타운송장비'])
    expect(names('바나')).toEqual([])
    expect(names('바이크')).toEqual(['자전거 및 기타운송장비'])
    expect(names('술')).toEqual(['호프-간이주점'])
    expect(names('술안주')).toEqual([])
  })

  it('한 글자 검색어는 별칭 시작 일치를 하지 않는다', () => {
    expect(names('카')).toEqual([])
  })

  it('별칭이 없는 코드(자치구·상권)는 이름 매칭만 한다', () => {
    expect(matchesOption({ code: '11680', name: '강남구' }, '카페')).toBe(false)
    expect(matchesOption({ code: '11680', name: '강남구' }, '강남')).toBe(true)
  })

  /* 포함 판정 과확장 회귀 — 전체 30종을 대상으로 한다. */
  const allNames = (query: string) =>
    filterOptions(SIMULATION_SERVICE_TYPES, query).map(item => item.name)

  it.each([
    ['한식당', ['한식음식점']],
    ['일식당', ['일식음식점']],
    ['영어학원', ['외국어학원']],
    ['미술학원', ['예술학원']],
    ['피아노학원', ['예술학원']],
    ['고양이카페', ['애완동물']],
  ])('포함 판정은 가장 구체적인 별칭만 잡는다: %s → %j', (query, expected) => {
    expect(allNames(query)).toEqual(expected)
  })

  it('여러 업종에 걸린 별칭은 그대로 입력할 때만 여러 업종을 부른다', () => {
    expect(allNames('식당')).toEqual([
      '한식음식점',
      '중식음식점',
      '일식음식점',
      '양식음식점',
    ])
    expect(allNames('학원')).toEqual(['일반교습학원', '외국어학원', '예술학원'])
  })

  it('동물병원은 어떤 업종도 별칭으로 잡지 않는다', () => {
    expect(allNames('동물병원')).toEqual([])
  })

  it('네일·피부관리는 서버에 따로 있는 업종이라 미용실로 잡지 않는다', () => {
    expect(allNames('네일')).toEqual([])
    expect(allNames('피부관리')).toEqual([])
  })

  it('디저트는 제과점과 커피-음료 둘 다 잡는다', () => {
    expect(allNames('디저트')).toEqual(['제과점', '커피-음료'])
  })

  it('별칭 표의 키는 모두 시뮬레이션 지원 업종 코드다', () => {
    const codes = new Set(SIMULATION_SERVICE_TYPES.map(item => item.code))
    Object.keys(SERVICE_ALIASES).forEach(code => {
      expect(codes.has(code)).toBe(true)
    })
  })

  it('별칭 표의 코드는 CS 업종 코드 형식이다', () => {
    Object.keys(SERVICE_ALIASES).forEach(code => {
      expect(code).toMatch(/^CS\d{6}$/)
    })
  })
})
