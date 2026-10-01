import { fetchAdministrations, fetchCommercials } from '@/lib/api/recommend'
import { isApiSuccess } from '@/lib/api/response'
import { communityMockLocations } from '@/lib/community/community-mock'
import type { ApiResponse } from '@/types/api'
import type {
  AdministrationArea,
  AdministrationAreasResponse,
  CommercialArea,
  CommercialAreasResponse,
} from '@/types/recommend'

/**
 * 커뮤니티 대상 지역 값과 지역 목록 로더(docs/features/community/community.md §S4 「대상(target) 규약」).
 *
 * 목록 필터와 글쓰기가 같은 지역 선택 시트(`community-region-sheet.tsx`)를 쓴다. 예전 3단 select
 * (`community-location-picker.tsx`) 안에 있던 것을 시트가 계속 쓰도록 여기로 옮겼다 — 화면
 * 컴포넌트가 아니라 값·캐시 규약이라서다.
 */
export type CommunityLocationValue = {
  targetType?: 'DISTRICT' | 'ADMINISTRATION' | 'COMMERCIAL'
  targetCode?: string
  targetName?: string
}

export const getCommunityLocationDisplayName = (
  value: CommunityLocationValue,
): string => value.targetName ?? value.targetCode ?? '서울 전체'

/** 종류와 코드가 둘 다 있어야 「대상이 있다」. 이름은 정체성이 아니다. */
export const hasCommunityLocationTarget = (value: CommunityLocationValue) =>
  Boolean(value.targetType && value.targetCode?.trim())

const successResponse = <T>(dataBody: T): ApiResponse<T> => ({
  dataHeader: {
    success: true,
    resultCode: null,
    resultMessage: null,
  },
  dataBody,
})

const mockAdministrationsByDistrict: Readonly<
  Record<string, readonly AdministrationArea[]>
> = communityMockLocations.administrationsByDistrict

const mockCommercialsByAdministration: Readonly<
  Record<string, readonly CommercialArea[]>
> = communityMockLocations.commercialsByAdministration

/**
 * 행정동·상권 목록의 query key 와 로더. 목록 필터와 글쓰기의 지역 선택 시트가 **같은 key·같은
 * 로더**를 써서 캐시를 나눠 쓴다 — 목 분기도 여기 한 곳에만 둔다.
 */
export const communityLocationQueryKeys = {
  administrations: (mockEnabled: boolean, districtCode: string | undefined) =>
    [
      'community-locations',
      'administrations',
      mockEnabled,
      districtCode,
    ] as const,
  commercials: (
    mockEnabled: boolean,
    districtCode: string | undefined,
    administrationCode: string | undefined,
  ) =>
    [
      'community-locations',
      'commercials',
      mockEnabled,
      districtCode,
      administrationCode,
    ] as const,
}

export const loadCommunityAdministrations = async (
  mockEnabled: boolean,
  districtCode: string,
): Promise<AdministrationAreasResponse> => {
  if (mockEnabled) {
    return successResponse<AdministrationArea[]>([
      ...(mockAdministrationsByDistrict[districtCode] ?? []),
    ])
  }

  return fetchAdministrations(districtCode)
}

export const loadCommunityCommercials = async (
  mockEnabled: boolean,
  districtCode: string,
  administrationCode: string,
): Promise<CommercialAreasResponse> => {
  if (mockEnabled) {
    return successResponse<CommercialArea[]>([
      ...(mockCommercialsByAdministration[administrationCode] ?? []),
    ])
  }

  return fetchCommercials(districtCode, administrationCode)
}

export const readCommunityLocationOptions = <T>(
  response: unknown,
): T[] | null => {
  if (
    !response ||
    typeof response !== 'object' ||
    !('dataHeader' in response) ||
    !('dataBody' in response)
  ) {
    return null
  }

  const candidate = response as ApiResponse<T[]>
  if (
    !candidate.dataHeader ||
    !isApiSuccess(candidate) ||
    !Array.isArray(candidate.dataBody)
  ) {
    return null
  }

  return candidate.dataBody
}
