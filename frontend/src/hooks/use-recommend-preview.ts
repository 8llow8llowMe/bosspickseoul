'use client'

import { useQuery } from '@tanstack/react-query'

import { findDistrictOption, findIndustryOption } from '@/data/home-demo'
import type { DemoSelection } from '@/data/home-demo'
import { retryUnlessClientError } from '@/lib/api/api-error'
import {
  RECOMMENDATION_PERIOD_CODE,
  RECOMMENDATION_TOP_N,
  fetchAdministrations,
  fetchCommercialRecommendations,
  fetchCommercials,
} from '@/lib/api/recommend'
import { isApiSuccess } from '@/lib/api/response'
import {
  RECOMMEND_PREVIEW_FALLBACK,
  toRecommendPreview,
  type RecommendPreviewView,
} from '@/lib/home/recommend-preview'

const STALE_TIME = 30 * 60 * 1000

export type RecommendPreviewState = {
  /** 실제로 호출에 쓴 첫 행정동 이름. 아직 못 정했으면 null(선택지 라벨을 지어내지 않는다). */
  administrationName: string | null
  /** 자치구→행정동→상권→추천으로 이어지는 3단 연쇄 중 하나라도 아직 응답을 기다리는가. */
  isLoading: boolean
  /** 03 노드의 "상권 N 중" — 실제 상권 목록 응답 길이. 폴백일 땐 의미가 없다(0일 수 있음). */
  commercialsCount: number
  view: RecommendPreviewView
}

/**
 * 홈 03단계(후보 추천) 데이터. `RecommendPreview` 와 `FunnelCounter` 가 **같은 훅**을
 * 같은 selection으로 호출한다 — React Query가 쿼리 키로 캐시를 공유하므로 네트워크
 * 요청은 1회다(`use-district-top-ten.ts`와 같은 패턴).
 *
 * 3단 연쇄: 자치구 → 첫 행정동 → 그 행정동의 상권 목록 → 그 상권들에 대한 업종별 추천.
 * 예전엔 강남구·역삼1동·커피-음료 고정 시드(HOME_RECOMMEND_SEED)를 썼는데, 02단계에서
 * 고른 지역·업종이 03단계에 전혀 반영되지 않았다(D8-3).
 */
export function useRecommendPreview(
  selection: DemoSelection,
): RecommendPreviewState {
  const districtCode = findDistrictOption(selection.districtId)?.code ?? null
  const serviceCode = findIndustryOption(selection.industryId)?.code ?? null

  const administrationsEnabled = districtCode !== null
  const administrationsQuery = useQuery({
    queryKey: ['home', 'recommendAdministrations', districtCode],
    queryFn: () => fetchAdministrations(districtCode!),
    enabled: administrationsEnabled,
    retry: retryUnlessClientError(1),
    staleTime: STALE_TIME,
  })

  const firstAdministration =
    administrationsQuery.data && isApiSuccess(administrationsQuery.data)
      ? (administrationsQuery.data.dataBody[0] ?? null)
      : null
  const administrationCode = firstAdministration?.administrationCode ?? null
  const administrationName = firstAdministration?.administrationName ?? null

  const commercialsEnabled =
    districtCode !== null && administrationCode !== null
  const commercialsQuery = useQuery({
    queryKey: [
      'home',
      'recommendCommercials',
      districtCode,
      administrationCode,
    ],
    queryFn: () => fetchCommercials(districtCode!, administrationCode!),
    enabled: commercialsEnabled,
    retry: retryUnlessClientError(1),
    staleTime: STALE_TIME,
  })

  const commercialAreas =
    commercialsQuery.data && isApiSuccess(commercialsQuery.data)
      ? commercialsQuery.data.dataBody
      : []
  const commercialCodes = commercialAreas.map(area => area.commercialCode)

  const previewEnabled = serviceCode !== null && commercialCodes.length > 0
  const previewQuery = useQuery({
    // D8-3: 선택(자치구·업종)이 바뀌면 다른 캐시를 봐야 한다. 예전엔 상권 코드
    // 배열만 키였어서 지역이 바뀌는 순간 이전 지역의 캐시를 그대로 받는 결함이
    // 있었다 — districtCode·administrationCode·serviceCode를 키에 직접 넣는다.
    queryKey: [
      'home',
      'recommendPreview',
      districtCode,
      administrationCode,
      serviceCode,
      commercialCodes,
    ],
    queryFn: () =>
      fetchCommercialRecommendations({
        serviceCode: serviceCode!,
        commercialCodes,
        periodCode: RECOMMENDATION_PERIOD_CODE,
        topN: RECOMMENDATION_TOP_N,
      }),
    enabled: previewEnabled,
    retry: retryUnlessClientError(1),
    staleTime: STALE_TIME,
  })

  const view =
    previewQuery.data && isApiSuccess(previewQuery.data)
      ? toRecommendPreview(previewQuery.data.dataBody)
      : RECOMMEND_PREVIEW_FALLBACK

  /*
   * `isPending`은 "아직 데이터도 에러도 없다"는 뜻이라 enabled:false인 쿼리는
   * 영영 pending으로 남는다(한 번도 안 불렀으니까) — 그래서 각 단계의 `enabled`로
   * 직접 게이트한다. 행정동을 못 찾아 상권 쿼리를 아예 안 부르는 경우처럼
   * "더 기다릴 게 없는" 종결 상태는 그 뒤 단계를 loading으로 치지 않는다.
   */
  const isLoading =
    (administrationsEnabled && administrationsQuery.isPending) ||
    (commercialsEnabled && commercialsQuery.isPending) ||
    (previewEnabled && previewQuery.isPending)

  return {
    administrationName,
    isLoading,
    commercialsCount: commercialAreas.length,
    view,
  }
}
