import { describe, expect, it } from 'vitest'

import {
  filterRegionSheetOptions,
  getRegionSheetAllRow,
  getRegionSheetBreadcrumb,
  getRegionSheetInitialStep,
  isRegionSheetValueSelected,
  resolveRegionSheetPick,
  type RegionSheetStep,
} from './region-sheet'

const seongdong = { code: '11200', name: '성동구' }
const seongsu = { code: '1120065000', name: '성수1가1동' }
const districtStep: RegionSheetStep = { level: 'district', district: seongdong }
const administrationStep: RegionSheetStep = {
  level: 'administration',
  district: seongdong,
  administration: seongsu,
}

describe('getRegionSheetAllRow', () => {
  it('최상위 첫 행은 「서울 전체」이고 빈 값으로 필터를 해제한다', () => {
    expect(getRegionSheetAllRow({ level: 'root' })).toEqual({
      label: '서울 전체',
      value: {},
    })
  })

  it('자치구 단계의 첫 행은 그 구 전체를 DISTRICT 로 확정한다', () => {
    expect(getRegionSheetAllRow(districtStep)).toEqual({
      label: '성동구 전체',
      value: {
        targetType: 'DISTRICT',
        targetCode: '11200',
        targetName: '성동구',
      },
    })
  })

  it('행정동 단계의 첫 행은 그 동 전체를 ADMINISTRATION 으로 확정한다', () => {
    expect(getRegionSheetAllRow(administrationStep)).toEqual({
      label: '성수1가1동 전체',
      value: {
        targetType: 'ADMINISTRATION',
        targetCode: '1120065000',
        targetName: '성수1가1동',
      },
    })
  })
})

describe('resolveRegionSheetPick', () => {
  it('최상위에서 자치구를 고르면 그 구의 행정동 단계로 들어간다', () => {
    expect(resolveRegionSheetPick({ level: 'root' }, seongdong)).toEqual({
      type: 'descend',
      step: districtStep,
    })
  })

  it('자치구 단계에서 행정동을 고르면 그 동의 상권 단계로 들어간다', () => {
    expect(resolveRegionSheetPick(districtStep, seongsu)).toEqual({
      type: 'descend',
      step: administrationStep,
    })
  })

  it('상권 단계에서 고른 상권은 들어가지 않고 COMMERCIAL 로 바로 확정한다', () => {
    expect(
      resolveRegionSheetPick(administrationStep, {
        code: '3120015',
        name: '성수역 상권',
      }),
    ).toEqual({
      type: 'commit',
      value: {
        targetType: 'COMMERCIAL',
        targetCode: '3120015',
        targetName: '성수역 상권',
      },
    })
  })
})

describe('getRegionSheetBreadcrumb', () => {
  it('최상위는 「서울 전체」 한 조각이다', () => {
    expect(getRegionSheetBreadcrumb({ level: 'root' })).toEqual([
      { label: '서울 전체', step: { level: 'root' } },
    ])
  })

  it('각 조각이 그 단계로 돌아가는 단계를 들고 있다', () => {
    expect(getRegionSheetBreadcrumb(administrationStep)).toEqual([
      { label: '서울 전체', step: { level: 'root' } },
      { label: '성동구', step: districtStep },
      { label: '성수1가1동', step: administrationStep },
    ])
  })
})

describe('filterRegionSheetOptions', () => {
  const options = [
    { code: '1', name: '성수1가1동' },
    { code: '2', name: '성수1가2동' },
    { code: '3', name: '왕십리도선동' },
  ]

  it('검색어가 비어 있으면 그대로 돌려준다', () => {
    expect(filterRegionSheetOptions(options, '  ')).toEqual(options)
  })

  it('이름에 검색어가 들어간 항목만 남긴다', () => {
    expect(filterRegionSheetOptions(options, '왕십리')).toEqual([options[2]])
  })

  it('검색어와 이름의 공백을 무시한다', () => {
    expect(filterRegionSheetOptions(options, '성수 1가 2')).toEqual([
      options[1],
    ])
    expect(
      filterRegionSheetOptions(
        [{ code: '9', name: '강남역 상권' }],
        '강남역상',
      ),
    ).toHaveLength(1)
  })

  it('맞는 항목이 없으면 빈 배열이다', () => {
    expect(filterRegionSheetOptions(options, '홍대')).toEqual([])
  })
})

describe('isRegionSheetValueSelected', () => {
  it('타입과 코드가 같을 때만 선택된 행이다', () => {
    const value = { targetType: 'DISTRICT' as const, targetCode: '11200' }

    expect(
      isRegionSheetValueSelected(value, {
        targetType: 'DISTRICT',
        targetCode: '11200',
        targetName: '성동구',
      }),
    ).toBe(true)
    expect(
      isRegionSheetValueSelected(value, {
        targetType: 'ADMINISTRATION',
        targetCode: '11200',
      }),
    ).toBe(false)
  })

  it('빈 값은 「서울 전체」 행과 같다', () => {
    expect(isRegionSheetValueSelected({}, {})).toBe(true)
    expect(
      isRegionSheetValueSelected(
        { targetType: 'DISTRICT', targetCode: '11200' },
        {},
      ),
    ).toBe(false)
  })
})

describe('getRegionSheetInitialStep', () => {
  it('값이 없으면 최상위에서 시작한다', () => {
    expect(getRegionSheetInitialStep({})).toEqual({ level: 'root' })
  })

  it('자치구가 선택돼 있으면 그 구 단계에서 시작한다 — 이름은 자치구 목록에서 찾는다', () => {
    expect(
      getRegionSheetInitialStep({
        targetType: 'DISTRICT',
        targetCode: '11200',
      }),
    ).toEqual(districtStep)
  })

  it('목록에 없는 자치구 코드면 최상위에서 시작한다', () => {
    expect(
      getRegionSheetInitialStep({
        targetType: 'DISTRICT',
        targetCode: '99999',
      }),
    ).toEqual({ level: 'root' })
  })

  it('행정동·상권은 상위 경로를 알 수 없어 최상위에서 시작한다', () => {
    expect(
      getRegionSheetInitialStep({
        targetType: 'ADMINISTRATION',
        targetCode: '1120065000',
      }),
    ).toEqual({ level: 'root' })
    expect(
      getRegionSheetInitialStep({
        targetType: 'COMMERCIAL',
        targetCode: '3120015',
      }),
    ).toEqual({ level: 'root' })
  })
})
