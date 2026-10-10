/**
 * 상권분석 이름 검색(#596)의 순수 로직.
 *
 * TODO(BE #592): 상권·지하철역·행정동 이름 검색 API 가 생기면 이 파일의 **임시안 두 갈래**를
 * 그 응답 하나로 바꾼다.
 *  - (a) `buildAreaNameEntries`·`matchAreaNames` — 화면이 이미 받아 둔 목록(자치구 25개, 고른 자치구의
 *    행정동, 고른 행정동의 상권, 지금 지도에 보이는 행정동·상권)만 찾는다. 서울 전체 상권을 찾지 못한다.
 *  - (b) `toNameSearchPlaces`·`resolvePlaceArea` — 카카오 장소 검색 좌표를 상권·행정동 경계로 바꾼다.
 * BE 응답이 상위 지역 코드까지 실어 주면 `buildSearchSelection` 만 남는다.
 */
import {
  computeRingArea,
  findAreaContainingPoint,
  findAreasContainingPoint,
  normalizeBoundary,
  resolveDistrictCodeFromAdministration,
  type MapPoint,
} from '@/lib/map/geometry'
import {
  selectAdministrationWithParent,
  selectAnalysisValue,
  selectCommercialWithParents,
  type AnalysisSelection,
  type AnalysisStep,
} from '@/lib/analysis/selection'
import type { AreaBoundaryItem, GeoBounds } from '@/types/recommend'

export type NameSearchAreaKind = 'district' | 'administration' | 'commercial'

/** 화면이 이미 받아 둔 지역 하나. */
export type NameSearchAreaEntry = {
  kind: NameSearchAreaKind
  code: string
  name: string
  /** 보조 줄에 적을 상위 지역 이름(「마포구」, 「마포구 서교동」). */
  context?: string
  /** 상권의 소속 행정동. 모르면(지도에서만 본 상권) 고를 때 역조회한다. */
  administrationCode?: string
  /** 카메라를 옮길 중심점. 없으면 지도는 그대로 둔다. */
  center?: MapPoint
}

/** 카카오 장소 검색 결과 하나. 고를 때 좌표로 상권·행정동을 찾는다. */
export type NameSearchPlace = {
  kind: 'place'
  id: string
  name: string
  /** 「지하철역」 또는 카카오 분류의 마지막 마디(「시장」 등). */
  category: string
  address: string
  point: MapPoint
}

export type NameSearchResult = NameSearchAreaEntry | NameSearchPlace

export const NAME_SEARCH_KIND_LABEL: Record<
  NameSearchAreaKind | 'place',
  string
> = {
  district: '자치구',
  administration: '행정동',
  commercial: '상권',
  place: '장소',
}

export const getNameSearchResultKey = (result: NameSearchResult): string =>
  result.kind === 'place'
    ? `place:${result.id}`
    : `${result.kind}:${result.code}`

/** 공백·가운뎃점·밑줄·괄호를 지우고 소문자로 맞춘다. 「홍대 걷고싶은거리」와 「홍대걷고」가 만난다. */
export const normalizeSearchText = (text: string): string =>
  text
    .normalize('NFC')
    .toLowerCase()
    .replace(/[\s·_\-.,()[\]]/g, '')

const KIND_ORDER: Record<NameSearchAreaKind, number> = {
  district: 0,
  administration: 1,
  commercial: 2,
}

/** 0 = 이름이 같다, 1 = 이름이 검색어로 시작한다, 2 = 이름에 검색어가 들어 있다. 안 맞으면 null. */
const scoreName = (name: string, query: string): number | null => {
  const normalized = normalizeSearchText(name)
  if (!normalized) return null
  if (normalized === query) return 0
  if (normalized.startsWith(query)) return 1
  if (normalized.includes(query)) return 2
  return null
}

/**
 * 이미 받아 둔 지역 이름에서 검색어를 찾는다. 정확히 같은 이름 → 앞이 같은 이름 → 이름 중간에 든 것
 * 순서이고, 같은 순위면 자치구 → 행정동 → 상권, 짧은 이름 순이다.
 */
export const matchAreaNames = (
  entries: readonly NameSearchAreaEntry[],
  query: string,
  limit = 5,
): NameSearchAreaEntry[] => {
  const normalizedQuery = normalizeSearchText(query)
  if (!normalizedQuery) return []

  return entries
    .flatMap(entry => {
      const score = scoreName(entry.name, normalizedQuery)
      return score === null ? [] : [{ entry, score }]
    })
    .sort(
      (left, right) =>
        left.score - right.score ||
        KIND_ORDER[left.entry.kind] - KIND_ORDER[right.entry.kind] ||
        left.entry.name.length - right.entry.name.length ||
        left.entry.name.localeCompare(right.entry.name, 'ko'),
    )
    .slice(0, limit)
    .map(({ entry }) => entry)
}

type NamedCode = { code: string; name: string; center?: MapPoint }

const isFinitePoint = (lng: number, lat: number) =>
  Number.isFinite(lng) && Number.isFinite(lat)

const toAreaCenter = (area: AreaBoundaryItem): MapPoint | undefined =>
  isFinitePoint(area.centerLng, area.centerLat)
    ? { lng: area.centerLng, lat: area.centerLat }
    : undefined

/**
 * 화면이 이미 가진 목록을 검색 색인 하나로 모은다. 같은 지역이 목록과 지도 양쪽에 있으면 **목록 쪽이
 * 이긴다** — 목록 상권은 소속 행정동을 알고 있어 고를 때 역조회가 필요 없다.
 *
 * 지도에서만 본 상권의 소속 행정동을 여기서 폴리곤으로 미리 구하지 않는다. 보이는 상권 수백 개 × 행정동
 * 폴리곤을 매 렌더 돌게 된다. 고른 한 건만 역조회한다.
 */
export const buildAreaNameEntries = ({
  districts,
  administrations = [],
  commercials = [],
  selectedDistrictCode = null,
  selectedAdministrationCode = null,
  administrationAreas = [],
  commercialAreas = [],
}: {
  districts: readonly NamedCode[]
  /** 고른 자치구의 행정동 목록. */
  administrations?: readonly NamedCode[]
  /** 고른 행정동의 상권 목록. */
  commercials?: readonly NamedCode[]
  selectedDistrictCode?: string | null
  selectedAdministrationCode?: string | null
  /** 지금 지도에 받아 둔 행정동·상권 경계. */
  administrationAreas?: readonly AreaBoundaryItem[]
  commercialAreas?: readonly AreaBoundaryItem[]
}): NameSearchAreaEntry[] => {
  const districtNameByCode = new Map(
    districts.map(item => [item.code, item.name]),
  )
  const administrationNameByCode = new Map<string, string>()
  const entries: NameSearchAreaEntry[] = []
  const seen = new Set<string>()
  const push = (entry: NameSearchAreaEntry) => {
    const key = `${entry.kind}:${entry.code}`
    if (!entry.name || seen.has(key)) return
    seen.add(key)
    entries.push(entry)
  }
  const districtNameOf = (administrationCode: string) =>
    districtNameByCode.get(
      resolveDistrictCodeFromAdministration(administrationCode),
    )

  districts.forEach(item =>
    push({ kind: 'district', code: item.code, name: item.name }),
  )

  administrations.forEach(item => {
    administrationNameByCode.set(item.code, item.name)
    push({
      kind: 'administration',
      code: item.code,
      name: item.name,
      context:
        (selectedDistrictCode &&
          districtNameByCode.get(selectedDistrictCode)) ||
        districtNameOf(item.code),
      center: item.center,
    })
  })
  administrationAreas.forEach(area => {
    const code = String(area.areaCode)
    administrationNameByCode.set(code, area.areaName)
    push({
      kind: 'administration',
      code,
      name: area.areaName,
      context: districtNameOf(code),
      center: toAreaCenter(area),
    })
  })

  if (selectedAdministrationCode) {
    const parentName = [
      districtNameOf(selectedAdministrationCode),
      administrationNameByCode.get(selectedAdministrationCode),
    ]
      .filter(Boolean)
      .join(' ')
    commercials.forEach(item =>
      push({
        kind: 'commercial',
        code: item.code,
        name: item.name,
        context: parentName || undefined,
        administrationCode: selectedAdministrationCode,
        center: item.center,
      }),
    )
  }
  commercialAreas.forEach(area =>
    push({
      kind: 'commercial',
      code: String(area.areaCode),
      name: area.areaName,
      center: toAreaCenter(area),
    }),
  )

  return entries
}

/**
 * 장소 검색을 서울로 묶는 범위. `SEOUL_MAP_BOUNDS`(`lib/api/recommend`)와 같은 값이다 — 그 모듈은
 * API 클라이언트를 함께 실어 순수 로직 쪽에서 가져오지 않는다.
 */
export const SEOUL_SEARCH_BOUNDS: GeoBounds = {
  lngSW: 126.7,
  latSW: 37.4,
  lngNE: 127.3,
  latNE: 37.75,
}

/** 카카오 `rect` 옵션 형식(「왼쪽 경도,아래 위도,오른쪽 경도,위 위도」). */
export const toKakaoRect = (bounds: GeoBounds): string =>
  [bounds.lngSW, bounds.latSW, bounds.lngNE, bounds.latNE].join(',')

export const isPointInBounds = (point: MapPoint, bounds: GeoBounds): boolean =>
  point.lng >= bounds.lngSW &&
  point.lng <= bounds.lngNE &&
  point.lat >= bounds.latSW &&
  point.lat <= bounds.latNE

/** 카카오 분류 코드 SW8 = 지하철역. */
const SUBWAY_CATEGORY_CODE = 'SW8'

const resolvePlaceCategory = (document: KakaoPlaceDocument): string => {
  if (document.category_group_code === SUBWAY_CATEGORY_CODE) return '지하철역'
  const last = document.category_name?.split('>').pop()?.trim()
  return last || NAME_SEARCH_KIND_LABEL.place
}

/**
 * 카카오 장소 검색 응답을 결과로 바꾼다. 좌표가 깨졌거나 서울 밖(주소가 「서울」로 시작하지 않거나
 * 범위를 벗어난) 장소는 버린다. `rect` 는 사각형이라 광명·부천 일부가 섞여 들어온다.
 */
export const toNameSearchPlaces = (
  documents: readonly KakaoPlaceDocument[],
  limit = 5,
): NameSearchPlace[] =>
  documents
    .flatMap(document => {
      const lng = Number.parseFloat(document.x)
      const lat = Number.parseFloat(document.y)
      if (!isFinitePoint(lng, lat)) return []
      const point = { lng, lat }
      if (!isPointInBounds(point, SEOUL_SEARCH_BOUNDS)) return []
      const address = document.road_address_name || document.address_name || ''
      if (address && !address.startsWith('서울')) return []
      return [
        {
          kind: 'place' as const,
          id: document.id,
          name: document.place_name,
          category: resolvePlaceCategory(document),
          address,
          point,
        },
      ]
    })
    .slice(0, limit)

/**
 * 좌표 하나를 품은 경계만 받기 위한 아주 작은 조회 창. 지도 경계 API 는 경계 상자가 창과 겹치는 영역을
 * 모두 주므로(`bbox` 교차) 점 하나 크기면 그 점을 품을 수 있는 영역만 온다.
 */
export const createPointProbeBounds = (
  point: MapPoint,
  delta = 0.0005,
): GeoBounds => ({
  lngSW: Number((point.lng - delta).toFixed(6)),
  latSW: Number((point.lat - delta).toFixed(6)),
  lngNE: Number((point.lng + delta).toFixed(6)),
  latNE: Number((point.lat + delta).toFixed(6)),
})

export type PlaceAreaMatch =
  | {
      kind: 'commercial'
      commercialCode: string
      commercialName: string
      /** 좌표를 품은 행정동. 상권의 공식 소속과 다를 수 있어 역조회가 실패할 때만 쓴다. */
      fallbackAdministrationCode: string | null
    }
  | {
      kind: 'administration'
      administrationCode: string
      administrationName: string
    }

/**
 * 점을 품은 상권이 여럿이면(골목상권 안에 전통시장 상권이 들어앉는 식으로 경계가 겹친다) **면적이
 * 가장 작은** 상권을 고른다. 더 좁은 쪽이 그 장소를 더 정확히 가리키고, 응답 순서와 상관없이 결과가
 * 정해진다. 면적이 같으면 코드가 작은 쪽이다.
 */
export const pickSmallestArea = (
  areas: readonly AreaBoundaryItem[],
): AreaBoundaryItem | null =>
  areas
    .map(area => ({
      area,
      size: computeRingArea(normalizeBoundary(area.boundaryCoords)),
    }))
    .sort(
      (left, right) =>
        left.size - right.size ||
        String(left.area.areaCode).localeCompare(String(right.area.areaCode)),
    )[0]?.area ?? null

/**
 * 장소 좌표 → 분석 대상. 좌표를 **실제로 품은** 상권이 먼저(겹치면 가장 작은 상권), 없으면 행정동이다.
 * 어느 경계에도 들지 않으면(서울 밖, 경계 데이터 빈틈) null — 가장 가까운 상권으로 붙이지 않는다.
 */
export const resolvePlaceArea = (
  point: MapPoint,
  {
    commercialAreas,
    administrationAreas,
  }: {
    commercialAreas: readonly AreaBoundaryItem[]
    administrationAreas: readonly AreaBoundaryItem[]
  },
): PlaceAreaMatch | null => {
  const administration = findAreaContainingPoint(point, administrationAreas)
  const commercial = pickSmallestArea(
    findAreasContainingPoint(point, commercialAreas),
  )
  if (commercial) {
    return {
      kind: 'commercial',
      commercialCode: String(commercial.areaCode),
      commercialName: commercial.areaName,
      fallbackAdministrationCode: administration
        ? String(administration.areaCode)
        : null,
    }
  }
  if (administration) {
    return {
      kind: 'administration',
      administrationCode: String(administration.areaCode),
      administrationName: administration.areaName,
    }
  }
  return null
}

export type SearchSelectionTarget =
  | { kind: 'district'; districtCode: string }
  | { kind: 'administration'; administrationCode: string }
  | {
      kind: 'commercial'
      commercialCode: string
      administrationCode: string
    }

/** 검색으로 확정하는 단계. 업종은 검색 대상이 아니다. */
export type SearchSelectionStep = Exclude<AnalysisStep, 'service'>

/**
 * 검색 결과로 확정할 선택. 고른 깊이까지 상위 단계를 한 번에 채우고, 업종은 그대로 둔다(#562).
 * `step` 은 `navigateSelection` 에 넘겨 히스토리 방법(push)을 고르게 한다.
 */
export const buildSearchSelection = (
  selection: AnalysisSelection,
  target: SearchSelectionTarget,
): {
  step: SearchSelectionStep
  next: AnalysisSelection
  nextStep: AnalysisStep
} => {
  if (target.kind === 'district') {
    return {
      step: 'district',
      next: selectAnalysisValue(selection, 'district', target.districtCode),
      nextStep: 'administration',
    }
  }
  if (target.kind === 'administration') {
    return {
      step: 'administration',
      next: selectAdministrationWithParent(
        selection,
        target.administrationCode,
      ),
      nextStep: 'commercial',
    }
  }
  return {
    step: 'commercial',
    next: selectCommercialWithParents(selection, {
      commercialCode: target.commercialCode,
      administrationCode: target.administrationCode,
    }),
    nextStep: 'service',
  }
}
