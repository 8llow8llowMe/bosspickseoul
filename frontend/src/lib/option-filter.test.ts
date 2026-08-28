import { describe, expect, it } from 'vitest'

import {
  canGroupByDescription,
  countOptions,
  filterOptionGroups,
  filterOptions,
  groupOptionsByDescription,
  matchesOption,
  normalizeOptionQuery,
} from '@/lib/option-filter'

const districts = [
  { code: '11680', name: '강남구' },
  { code: '11740', name: '강동구' },
  { code: '11305', name: '강북구' },
  { code: '11110', name: '종로구' },
]

describe('normalizeOptionQuery', () => {
  it('앞뒤 공백을 떼고 소문자로 만든다', () => {
    expect(normalizeOptionQuery('  Cafe  ')).toBe('cafe')
  })
})

describe('matchesOption', () => {
  it('빈 검색어는 전부 통과시킨다', () => {
    expect(matchesOption(districts[0], '')).toBe(true)
    expect(matchesOption(districts[0], '   ')).toBe(true)
  })

  it('이름 부분 문자열로 매칭한다', () => {
    expect(matchesOption(districts[0], '남')).toBe(true)
    expect(matchesOption(districts[0], '강남')).toBe(true)
    expect(matchesOption(districts[0], '종로')).toBe(false)
  })

  it('설명은 매칭 대상이 아니다', () => {
    expect(
      matchesOption(
        { code: 'c', name: '한식음식점', description: '음식점' },
        '음식점',
      ),
    ).toBe(true)
    expect(
      matchesOption(
        { code: 'c', name: '노래방', description: '레저/오락' },
        '레저',
      ),
    ).toBe(false)
  })
})

describe('filterOptions', () => {
  it('접두사가 같은 항목만 남는다', () => {
    expect(filterOptions(districts, '강').map(item => item.name)).toEqual([
      '강남구',
      '강동구',
      '강북구',
    ])
  })

  it('0건이면 빈 배열', () => {
    expect(filterOptions(districts, '없는구')).toEqual([])
  })
})

describe('filterOptionGroups', () => {
  const groups = [
    { label: '음식점', items: [{ code: 'a', name: '한식음식점' }] },
    { label: '학원', items: [{ code: 'b', name: '외국어학원' }] },
  ]

  it('매칭된 항목이 없는 그룹은 통째로 뺀다', () => {
    expect(filterOptionGroups(groups, '한식')).toEqual([
      { label: '음식점', items: [{ code: 'a', name: '한식음식점' }] },
    ])
  })

  it('그룹 라벨 자체는 매칭 대상이 아니다', () => {
    // 「학원」으로 검색해도 라벨이 아니라 항목 이름이 걸려서 남는다.
    expect(
      filterOptionGroups(groups, '학원').map(group => group.label),
    ).toEqual(['학원'])
    // 「음식점」은 항목 이름에도 들어 있어 남지만, 라벨만 맞는 경우는 사라진다.
    expect(filterOptionGroups(groups, '오락')).toEqual([])
  })
})

describe('countOptions', () => {
  it('평면 목록을 센다', () => {
    expect(countOptions(districts, undefined)).toBe(4)
  })

  it('그룹은 항목 수를 합산한다', () => {
    expect(
      countOptions(undefined, [
        { label: 'a', items: [{ code: '1', name: 'x' }] },
        {
          label: 'b',
          items: [
            { code: '2', name: 'y' },
            { code: '3', name: 'z' },
          ],
        },
      ]),
    ).toBe(3)
  })

  it('둘 다 없으면 0', () => {
    expect(countOptions(undefined, undefined)).toBe(0)
  })
})

describe('groupOptionsByDescription', () => {
  const services = [
    { code: 'CS100001', name: '한식음식점', description: '음식점' },
    { code: 'CS200002', name: '외국어학원', description: '학원' },
    { code: 'CS100002', name: '중식음식점', description: '음식점' },
  ]

  it('설명으로 묶고 처음 나온 순서를 유지한다', () => {
    expect(groupOptionsByDescription(services)).toEqual([
      {
        label: '음식점',
        items: [
          { code: 'CS100001', name: '한식음식점' },
          { code: 'CS100002', name: '중식음식점' },
        ],
      },
      { label: '학원', items: [{ code: 'CS200002', name: '외국어학원' }] },
    ])
  })

  it('그룹 라벨이 곧 설명이라 항목에서는 설명을 뗀다', () => {
    const [group] = groupOptionsByDescription(services)
    expect(group.items[0]).not.toHaveProperty('description')
  })

  it('설명이 없으면 기타로 모은다', () => {
    expect(
      groupOptionsByDescription([{ code: 'x', name: '무분류' }]).map(
        g => g.label,
      ),
    ).toEqual(['기타'])
  })
})

describe('canGroupByDescription', () => {
  it('설명 종류가 둘 이상이어야 그룹핑이 의미가 있다', () => {
    expect(
      canGroupByDescription([
        { code: 'a', name: 'x', description: '음식점' },
        { code: 'b', name: 'y', description: '학원' },
      ]),
    ).toBe(true)
  })

  it('설명이 한 종류뿐이면 그룹핑하지 않는다', () => {
    expect(
      canGroupByDescription([
        { code: 'a', name: 'x', description: '음식점' },
        { code: 'b', name: 'y', description: '음식점' },
      ]),
    ).toBe(false)
  })

  it('설명이 아예 없으면 그룹핑하지 않는다', () => {
    expect(canGroupByDescription([{ code: 'a', name: 'x' }])).toBe(false)
  })
})
