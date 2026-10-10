import { describe, expect, it } from 'vitest'

import {
  buildAreaNameEntries,
  buildSearchSelection,
  createPointProbeBounds,
  matchAreaNames,
  normalizeSearchText,
  resolvePlaceArea,
  toKakaoRect,
  toNameSearchPlaces,
  SEOUL_SEARCH_BOUNDS,
  type NameSearchAreaEntry,
} from '@/lib/analysis/name-search'
import {
  createEmptyAnalysisSelection,
  type AnalysisSelection,
} from '@/lib/analysis/selection'
import type { AreaBoundaryItem } from '@/types/recommend'

/** 한 변 `size` 인 정사각형 경계. */
const square = (
  areaCode: string,
  areaName: string,
  lng: number,
  lat: number,
  size: number,
): AreaBoundaryItem => ({
  areaCode,
  areaName,
  centerLng: lng + size / 2,
  centerLat: lat + size / 2,
  boundaryCoords: [
    [lng, lat],
    [lng + size, lat],
    [lng + size, lat + size],
    [lng, lat + size],
  ],
})

describe('normalizeSearchText', () => {
  it('공백·가운뎃점·밑줄을 지우고 소문자로 맞춘다', () => {
    expect(normalizeSearchText(' 홍대 걷고싶은거리 ')).toBe('홍대걷고싶은거리')
    expect(normalizeSearchText('KT_빌딩·앞')).toBe('kt빌딩앞')
  })
})

describe('matchAreaNames', () => {
  const entries: NameSearchAreaEntry[] = [
    { kind: 'commercial', code: 'c1', name: '망원시장' },
    { kind: 'administration', code: '11440690', name: '망원1동' },
    { kind: 'administration', code: '11440700', name: '망원2동' },
    { kind: 'district', code: '11440', name: '마포구' },
    { kind: 'commercial', code: 'c2', name: '서교 망원로' },
  ]

  it('같은 이름 → 앞이 같은 이름 → 중간에 든 이름 순서다', () => {
    expect(matchAreaNames(entries, '망원시장').map(item => item.code)).toEqual([
      'c1',
    ])
    expect(matchAreaNames(entries, '망원').map(item => item.code)).toEqual([
      '11440690',
      '11440700',
      'c1',
      'c2',
    ])
  })

  it('같은 순위면 자치구 → 행정동 → 상권이다', () => {
    const tied: NameSearchAreaEntry[] = [
      { kind: 'commercial', code: 'c', name: '마포' },
      { kind: 'district', code: 'd', name: '마포' },
    ]
    expect(matchAreaNames(tied, '마포').map(item => item.kind)).toEqual([
      'district',
      'commercial',
    ])
  })

  it('띄어쓰기가 달라도 찾고, 빈 검색어는 결과가 없다', () => {
    expect(matchAreaNames(entries, '서교망원').map(item => item.code)).toEqual([
      'c2',
    ])
    expect(matchAreaNames(entries, '   ')).toEqual([])
  })

  it('상한만큼만 돌려준다', () => {
    expect(matchAreaNames(entries, '망원', 2)).toHaveLength(2)
  })
})

describe('buildAreaNameEntries', () => {
  const districts = [{ code: '11440', name: '마포구' }]

  it('목록에서 온 상권은 소속 행정동과 상위 이름을 싣는다', () => {
    const entries = buildAreaNameEntries({
      districts,
      administrations: [{ code: '11440660', name: '서교동' }],
      commercials: [{ code: '3110565', name: '홍대 걷고싶은거리' }],
      selectedDistrictCode: '11440',
      selectedAdministrationCode: '11440660',
    })

    expect(entries).toEqual([
      { kind: 'district', code: '11440', name: '마포구' },
      {
        kind: 'administration',
        code: '11440660',
        name: '서교동',
        context: '마포구',
        center: undefined,
      },
      {
        kind: 'commercial',
        code: '3110565',
        name: '홍대 걷고싶은거리',
        context: '마포구 서교동',
        administrationCode: '11440660',
        center: undefined,
      },
    ])
  })

  it('목록과 지도에 같은 지역이 있으면 목록 쪽 하나만 남긴다', () => {
    const entries = buildAreaNameEntries({
      districts,
      administrations: [{ code: '11440660', name: '서교동' }],
      commercials: [{ code: '3110565', name: '홍대 걷고싶은거리' }],
      selectedDistrictCode: '11440',
      selectedAdministrationCode: '11440660',
      administrationAreas: [square('11440660', '서교동', 126.9, 37.5, 0.01)],
      commercialAreas: [
        square('3110565', '홍대 걷고싶은거리', 126.92, 37.55, 0.001),
        square('3110999', '연남동 상권', 126.93, 37.56, 0.001),
      ],
    })

    expect(
      entries.filter(entry => entry.code === '3110565').map(e => e.context),
    ).toEqual(['마포구 서교동'])
    // 지도에서만 본 상권은 소속 행정동을 모른다 — 고를 때 역조회한다.
    const mapOnly = entries.find(entry => entry.code === '3110999')
    expect(mapOnly).toMatchObject({ kind: 'commercial', name: '연남동 상권' })
    expect(mapOnly?.administrationCode).toBeUndefined()
    expect(mapOnly?.center?.lng).toBeCloseTo(126.9305)
    expect(mapOnly?.center?.lat).toBeCloseTo(37.5605)
  })

  it('행정동을 고르지 않았으면 상권 목록을 싣지 않는다', () => {
    const entries = buildAreaNameEntries({
      districts,
      commercials: [{ code: '3110565', name: '홍대 걷고싶은거리' }],
    })
    expect(entries.map(entry => entry.kind)).toEqual(['district'])
  })
})

describe('toNameSearchPlaces', () => {
  const document = (
    overrides: Partial<KakaoPlaceDocument>,
  ): KakaoPlaceDocument => ({
    id: '1',
    place_name: '강남역 2호선',
    category_group_code: 'SW8',
    category_name: '교통,수송 > 지하철,전철 > 수도권2호선',
    address_name: '서울 강남구 역삼동 858',
    road_address_name: '서울 강남구 강남대로 396',
    x: '127.0276',
    y: '37.4979',
    ...overrides,
  })

  it('좌표를 숫자로 바꾸고 지하철역을 표시한다', () => {
    expect(toNameSearchPlaces([document({})])).toEqual([
      {
        kind: 'place',
        id: '1',
        name: '강남역 2호선',
        category: '지하철역',
        address: '서울 강남구 강남대로 396',
        point: { lng: 127.0276, lat: 37.4979 },
      },
    ])
  })

  it('지하철역이 아니면 분류의 마지막 마디를 쓴다', () => {
    const [place] = toNameSearchPlaces([
      document({
        category_group_code: '',
        category_name: '쇼핑 > 전통시장',
      }),
    ])
    expect(place.category).toBe('전통시장')
  })

  it('서울 밖·깨진 좌표는 버린다', () => {
    expect(
      toNameSearchPlaces([
        document({ id: 'a', road_address_name: '경기 광명시 철산로 13' }),
        document({ id: 'b', x: 'NaN' }),
        document({ id: 'c', x: '129.0', y: '35.1' }),
        document({ id: 'd' }),
      ]).map(place => place.id),
    ).toEqual(['d'])
  })
})

describe('resolvePlaceArea', () => {
  const administrationAreas = [square('11440660', '서교동', 126.9, 37.54, 0.03)]
  const commercialAreas = [
    square('3110565', '홍대 걷고싶은거리', 126.92, 37.55, 0.002),
  ]

  it('좌표를 품은 상권을 먼저 찾고, 품은 행정동을 대체 소속으로 싣는다', () => {
    expect(
      resolvePlaceArea(
        { lng: 126.921, lat: 37.551 },
        { commercialAreas, administrationAreas },
      ),
    ).toEqual({
      kind: 'commercial',
      commercialCode: '3110565',
      commercialName: '홍대 걷고싶은거리',
      fallbackAdministrationCode: '11440660',
    })
  })

  it('상권 경계 밖이면 행정동으로 물러난다', () => {
    expect(
      resolvePlaceArea(
        { lng: 126.905, lat: 37.545 },
        { commercialAreas, administrationAreas },
      ),
    ).toEqual({
      kind: 'administration',
      administrationCode: '11440660',
      administrationName: '서교동',
    })
  })

  it('어느 경계에도 들지 않으면 가장 가까운 곳으로 붙이지 않고 null 이다', () => {
    expect(
      resolvePlaceArea(
        { lng: 127.2, lat: 37.7 },
        { commercialAreas, administrationAreas },
      ),
    ).toBeNull()
  })

  it('점을 품은 상권이 겹치면 응답 순서와 상관없이 가장 작은 상권을 고른다', () => {
    const point = { lng: 126.9105, lat: 37.5565 }
    // 골목상권(넓다) 안에 전통시장 상권(좁다)이 들어앉은 경우.
    const alley = square('3110001', '망원 골목상권', 126.905, 37.552, 0.01)
    const market = square('3110600', '망원시장', 126.91, 37.556, 0.002)

    for (const areas of [
      [alley, market],
      [market, alley],
    ]) {
      expect(
        resolvePlaceArea(point, {
          commercialAreas: areas,
          administrationAreas,
        }),
      ).toMatchObject({ kind: 'commercial', commercialCode: '3110600' })
    }
  })

  it('면적이 같으면 코드가 작은 상권이다', () => {
    const point = { lng: 126.9205, lat: 37.5505 }
    const a = square('3110002', '가', 126.92, 37.55, 0.002)
    const b = square('3110001', '나', 126.92, 37.55, 0.002)
    expect(
      resolvePlaceArea(point, { commercialAreas: [a, b], administrationAreas }),
    ).toMatchObject({ commercialCode: '3110001' })
  })
})

describe('createPointProbeBounds · toKakaoRect', () => {
  it('점 둘레의 작은 창을 만든다', () => {
    expect(createPointProbeBounds({ lng: 127, lat: 37.5 })).toEqual({
      lngSW: 126.9995,
      latSW: 37.4995,
      lngNE: 127.0005,
      latNE: 37.5005,
    })
  })

  it('카카오 rect 는 왼쪽 경도,아래 위도,오른쪽 경도,위 위도 순서다', () => {
    expect(toKakaoRect(SEOUL_SEARCH_BOUNDS)).toBe('126.7,37.4,127.3,37.75')
  })
})

describe('buildSearchSelection', () => {
  const withService: AnalysisSelection = {
    ...createEmptyAnalysisSelection(),
    districtCode: '11680',
    administrationCode: '11680640',
    commercialCode: '3120001',
    serviceCode: 'CS100001',
  }

  it('자치구는 하위 지역을 비우고 업종을 남긴 채 행정동 단계로 보낸다', () => {
    expect(
      buildSearchSelection(withService, {
        kind: 'district',
        districtCode: '11440',
      }),
    ).toEqual({
      step: 'district',
      next: {
        ...withService,
        districtCode: '11440',
        administrationCode: null,
        commercialCode: null,
      },
      nextStep: 'administration',
    })
  })

  it('행정동은 자치구를 함께 채우고 상권 단계로 보낸다', () => {
    const { step, next, nextStep } = buildSearchSelection(withService, {
      kind: 'administration',
      administrationCode: '11440660',
    })
    expect(step).toBe('administration')
    expect(nextStep).toBe('commercial')
    expect(next).toMatchObject({
      districtCode: '11440',
      administrationCode: '11440660',
      commercialCode: null,
      serviceCode: 'CS100001',
    })
  })

  it('상권은 세 단계를 한 번에 채우고 업종 단계로 보낸다', () => {
    const { step, next, nextStep } = buildSearchSelection(
      createEmptyAnalysisSelection(),
      {
        kind: 'commercial',
        commercialCode: '3110565',
        administrationCode: '11440660',
      },
    )
    expect(step).toBe('commercial')
    expect(nextStep).toBe('service')
    expect(next).toMatchObject({
      districtCode: '11440',
      administrationCode: '11440660',
      commercialCode: '3110565',
    })
  })
})
