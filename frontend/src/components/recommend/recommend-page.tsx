'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react'
import { useRouter } from 'next/navigation'
import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import styled from 'styled-components'

import { districts } from '@/data/districts'
import { simulationCatalog } from '@/data/simulation-catalog'
import type { OptionGroup, OptionItem } from '@/components/ui/option-picker'
import { useCommercialBookmarks } from '@/hooks/use-commercial-bookmarks'
import { addMemberBookmark, removeMemberBookmark } from '@/lib/api/user'
import {
  fetchAdministrationMapAreas,
  fetchAdministrations,
  fetchCommercialMapAreas,
  fetchCommercialProfile,
  fetchCommercialRecommendations,
  fetchCommercials,
  fetchDistrictMapAreas,
  RECOMMENDATION_PERIOD_CODE,
  RECOMMENDATION_TOP_N,
  SEOUL_MAP_BOUNDS,
} from '@/lib/api/recommend'
import {
  buildRecommendationMapItems,
  buildResultBoundaryBounds,
  filterAreasByCodes,
} from '@/lib/recommend/recommend-map-model'
import { invalidateMemberBookmarksQuery } from '@/lib/recommend/recommend-bookmarks'
import {
  createInitialRecommendationState,
  formatRecommendationPeriod,
  recommendationReducer,
  type RecommendConditionStep,
  type RecommendationOption,
  type RecommendationView,
} from '@/lib/recommend/recommend-state'
import {
  isRetryable,
  resolveApiError,
  type NormalizedApiError,
} from '@/lib/api/api-error'
import { getApiMessage, isApiSuccess } from '@/lib/api/response'
import { useAuthStore } from '@/stores/auth-store'
import type { ApiResponse } from '@/types/api'
import type { MemberBookmarkResponse } from '@/types/bookmark'
import type {
  AdministrationArea,
  AreaBoundaryItem,
  CandidateCommercial,
  CandidateCommercialsResponse,
  CommercialArea,
  CommercialProfile,
  CommercialProfileResponse,
  CoordinateTuple,
  GeoBounds,
  MetricBreakdownItem,
  MapAreasResponse,
  RecommendationBasis,
  ScoreMetricMetadata,
} from '@/types/recommend'

import RecommendFeedback from './recommend-feedback'
import RecommendMap from './recommend-map'
import RecommendMobileSheet from './recommend-mobile-sheet'
import RecommendPanel, { type RecommendPanelProps } from './recommend-panel'
import { readBlueOceanCategories } from './recommend-result-list'

type ProfileQueryLike = {
  data?: CommercialProfileResponse
}

export type CommercialProfileScope = {
  readonly districtCode: string
  readonly administrationCode: string
  readonly commercialCodes: readonly string[]
}

type MapStage = 'district' | 'administration' | 'commercial' | 'results'

type HandledRecommendationMarker = {
  current: string
}

type QueryPendingState = {
  isPending: boolean
  isFetching: boolean
}

type BookmarkMutationInput = {
  /** Snowflake 문자열. `null` 이면 아직 저장 안 된 상태(=생성). */
  bookmarkId: string | null
  commercialCode: string
  commercialName: string
  memberId: string
}

type BookmarkMutationResponse = ApiResponse<null> | MemberBookmarkResponse

type BookmarkUiState = {
  memberId: string | null
  error: string | null
}

export type RecommendationBookmarkReservation = {
  memberId: string
  commercialCode: string
  token: symbol
}

export type RecommendationBookmarkReservationRegistry = Map<
  string,
  Map<string, symbol>
>

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object'

const isValidCoordinate = (lng: unknown, lat: unknown): boolean =>
  typeof lng === 'number' &&
  typeof lat === 'number' &&
  Number.isFinite(lng) &&
  Number.isFinite(lat) &&
  lng >= -180 &&
  lng <= 180 &&
  lat >= -90 &&
  lat <= 90

const normalizeCoordinateTuples = (value: unknown): CoordinateTuple[] =>
  Array.isArray(value)
    ? value.flatMap(coordinate =>
        Array.isArray(coordinate) &&
        isValidCoordinate(coordinate[0], coordinate[1])
          ? [[coordinate[0] as number, coordinate[1] as number] as const]
          : [],
      )
    : []

const isSuccessfulApiResponse = <T,>(
  response: ApiResponse<T> | null | undefined,
): response is ApiResponse<T> =>
  response?.dataHeader?.success === true && response.dataBody !== undefined

export const readMapAreas = (
  response: MapAreasResponse | null | undefined,
): AreaBoundaryItem[] => {
  if (!isSuccessfulApiResponse(response)) return []

  const body: unknown = response.dataBody
  if (!isRecord(body) || !Array.isArray(body.areas)) return []

  return body.areas.flatMap(area => {
    if (
      !isRecord(area) ||
      typeof area.areaCode !== 'string' ||
      typeof area.areaName !== 'string' ||
      !isValidCoordinate(area.centerLng, area.centerLat)
    ) {
      return []
    }

    return [
      {
        areaCode: area.areaCode,
        areaName: area.areaName,
        centerLng: area.centerLng as number,
        centerLat: area.centerLat as number,
        boundaryCoords: normalizeCoordinateTuples(area.boundaryCoords),
      },
    ]
  })
}

export const readAdministrations = (
  response: ApiResponse<AdministrationArea[]> | null | undefined,
): AdministrationArea[] => {
  if (!isSuccessfulApiResponse(response) || !Array.isArray(response.dataBody)) {
    return []
  }

  return (response.dataBody as unknown[]).flatMap(administration => {
    if (
      !isRecord(administration) ||
      typeof administration.administrationCode !== 'string' ||
      typeof administration.administrationName !== 'string' ||
      !isValidCoordinate(administration.centerLng, administration.centerLat)
    ) {
      return []
    }

    return [
      {
        administrationCode: administration.administrationCode,
        administrationName: administration.administrationName,
        centerLng: administration.centerLng as number,
        centerLat: administration.centerLat as number,
      },
    ]
  })
}

export const readCommercials = (
  response: ApiResponse<CommercialArea[]> | null | undefined,
): CommercialArea[] => {
  if (!isSuccessfulApiResponse(response) || !Array.isArray(response.dataBody)) {
    return []
  }

  return (response.dataBody as unknown[]).flatMap(commercial => {
    if (
      !isRecord(commercial) ||
      typeof commercial.commercialCode !== 'string' ||
      typeof commercial.commercialName !== 'string' ||
      typeof commercial.commercialClassificationCode !== 'string' ||
      typeof commercial.commercialClassificationName !== 'string' ||
      !isValidCoordinate(commercial.centerLng, commercial.centerLat)
    ) {
      return []
    }

    return [
      {
        commercialCode: commercial.commercialCode,
        commercialName: commercial.commercialName,
        commercialClassificationCode: commercial.commercialClassificationCode,
        commercialClassificationName: commercial.commercialClassificationName,
        centerLng: commercial.centerLng as number,
        centerLat: commercial.centerLat as number,
      },
    ]
  })
}

const readNullableString = (value: unknown): string | null =>
  typeof value === 'string' ? value : null

const normalizeScoreMetricMetadata = (value: unknown): ScoreMetricMetadata => {
  if (
    !isRecord(value) ||
    typeof value.code !== 'string' ||
    typeof value.name !== 'string' ||
    typeof value.description !== 'string' ||
    typeof value.scoreDescription !== 'string'
  ) {
    return null
  }

  return {
    code: value.code,
    name: value.name,
    description: value.description,
    scoreDescription: value.scoreDescription,
  }
}

const normalizeMetricBreakdown = (value: unknown): MetricBreakdownItem[] =>
  Array.isArray(value)
    ? value.flatMap(metric => {
        if (!isRecord(metric)) return []

        return [
          {
            metricType: normalizeScoreMetricMetadata(metric.metricType),
            score:
              typeof metric.score === 'number' && Number.isFinite(metric.score)
                ? metric.score
                : null,
            grade: readNullableString(metric.grade),
            summaryLabel: readNullableString(metric.summaryLabel),
          },
        ]
      })
    : []

const normalizeCandidateCommercial = (
  item: unknown,
): CandidateCommercial | null => {
  if (
    !isRecord(item) ||
    typeof item.commercialCode !== 'string' ||
    typeof item.commercialName !== 'string' ||
    typeof item.rank !== 'number' ||
    !Number.isFinite(item.rank)
  ) {
    return null
  }

  return {
    rank: item.rank,
    commercialCode: item.commercialCode,
    commercialName: item.commercialName,
    compositeScore:
      typeof item.compositeScore === 'number' &&
      Number.isFinite(item.compositeScore)
        ? item.compositeScore
        : null,
    grade: readNullableString(item.grade),
    summaryLabel: readNullableString(item.summaryLabel),
    selectionReason: readNullableString(item.selectionReason),
    opportunityLabel: readNullableString(item.opportunityLabel),
    riskLabel: readNullableString(item.riskLabel),
    metricBreakdown: normalizeMetricBreakdown(item.metricBreakdown),
    reasonTags: Array.isArray(item.reasonTags)
      ? item.reasonTags.filter(
          (reasonTag): reasonTag is string => typeof reasonTag === 'string',
        )
      : [],
    // 백엔드가 산정에 실패하면 빈 목록으로 강등하는 계약이라 `null`·`[]`는 오류가 아니다.
    blueOceanCategories: readBlueOceanCategories(item.blueOceanCategories),
  }
}

/**
 * 추천 기준(프리셋·우선 지표·요약)을 응답에서 꺼낸다.
 *
 * 이 셋은 **Top N 순위를 정한 근거 자체**인데 사용자가 고르지 않는다 — 서버가
 * 정해서 응답에 실어 준다. 화면에 안 그리면 사용자는 왜 이 순서인지 모른 채
 * 순위만 보게 되고, 카드의 `selectionReason`("공격형 기준으로 …")에 나오는
 * "공격형"이 무슨 말인지 설명할 자리가 사라진다.
 *
 * 백엔드가 필드를 비우거나 형태가 어긋나면 그 조각만 버린다 — 기준을 못 읽는 건
 * 결과를 못 읽는 것과 다르고, 순위 자체는 그대로 쓸 수 있어야 한다.
 */
const readMetadataText = (value: unknown): string | null => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()

  return trimmed.length > 0 ? trimmed : null
}

const readMetadataField = (value: unknown, field: string): string | null => {
  if (!value || typeof value !== 'object') return null

  return readMetadataText((value as Record<string, unknown>)[field])
}

export const normalizeRecommendationBasis = (
  response: CandidateCommercialsResponse | null | undefined,
): RecommendationBasis | null => {
  if (!isSuccessfulApiResponse(response) || !response.dataBody) return null

  const body = response.dataBody as unknown as Record<string, unknown>
  const basis: RecommendationBasis = {
    presetName: readMetadataField(body.preset, 'name'),
    presetDescription: readMetadataField(body.preset, 'description'),
    priorityMetricName: readMetadataField(body.priorityMetric, 'name'),
    priorityMetricDescription: readMetadataField(
      body.priorityMetric,
      'description',
    ),
    summary: readMetadataText(body.summary),
  }

  // 한 조각도 못 읽으면 그릴 게 없다 — 빈 껍데기를 렌더하지 않는다.
  return Object.values(basis).some(value => value !== null) ? basis : null
}

export const normalizeRecommendationResults = (
  response: CandidateCommercialsResponse | null | undefined,
  allowedCommercialCodes: readonly string[],
): CandidateCommercial[] => {
  if (
    !isSuccessfulApiResponse(response) ||
    !Array.isArray(response.dataBody?.items)
  ) {
    return []
  }

  const allowedCodes = new Set(allowedCommercialCodes.map(String))
  const seen = new Set<string>()

  return (response.dataBody.items as unknown[])
    .flatMap(item => {
      const normalized = normalizeCandidateCommercial(item)
      return normalized ? [normalized] : []
    })
    .sort((left, right) => {
      return left.rank - right.rank
    })
    .filter(item => {
      const commercialCode = String(item.commercialCode)

      if (
        !commercialCode ||
        !allowedCodes.has(commercialCode) ||
        seen.has(commercialCode)
      ) {
        return false
      }

      seen.add(commercialCode)
      return true
    })
    .slice(0, RECOMMENDATION_TOP_N)
}

const normalizeCommercialProfile = (
  profile: unknown,
): CommercialProfile | null =>
  isRecord(profile) &&
  typeof profile.commercialCode === 'string' &&
  typeof profile.commercialName === 'string' &&
  typeof profile.districtCode === 'string' &&
  typeof profile.districtName === 'string' &&
  typeof profile.administrationCode === 'string' &&
  typeof profile.administrationName === 'string' &&
  Number.isFinite(profile.centerLng) &&
  Number.isFinite(profile.centerLat) &&
  isValidCoordinate(profile.centerLng, profile.centerLat)
    ? ({
        commercialCode: profile.commercialCode,
        commercialName: profile.commercialName,
        districtCode: profile.districtCode,
        districtName: profile.districtName,
        administrationCode: profile.administrationCode,
        administrationName: profile.administrationName,
        centerLng: profile.centerLng as number,
        centerLat: profile.centerLat as number,
        boundaryCoords: normalizeCoordinateTuples(profile.boundaryCoords),
        keyMetrics: isRecord(profile.keyMetrics) ? profile.keyMetrics : null,
      } as CommercialProfile)
    : null

export const collectSuccessfulProfiles = (
  queries: readonly ProfileQueryLike[],
  scope: CommercialProfileScope,
): CommercialProfile[] => {
  const seenCommercialCodes = new Set<string>()

  return queries.flatMap((query, index) => {
    if (!isSuccessfulApiResponse(query.data)) return []

    const profile = normalizeCommercialProfile(query.data.dataBody)
    const expectedCommercialCode = scope.commercialCodes[index]

    if (
      !profile ||
      !expectedCommercialCode ||
      profile.commercialCode !== expectedCommercialCode ||
      profile.districtCode !== scope.districtCode ||
      profile.administrationCode !== scope.administrationCode ||
      seenCommercialCodes.has(profile.commercialCode)
    ) {
      return []
    }

    seenCommercialCodes.add(profile.commercialCode)
    return [profile]
  })
}

export const createCommercialProfileQueryCombiner = (
  scope: CommercialProfileScope,
): ((queries: readonly ProfileQueryLike[]) => CommercialProfile[]) => {
  const capturedScope: CommercialProfileScope = {
    districtCode: scope.districtCode,
    administrationCode: scope.administrationCode,
    commercialCodes: [...scope.commercialCodes],
  }

  return queries => collectSuccessfulProfiles(queries, capturedScope)
}

export const isRecommendationQueryBusy = ({
  isPending,
  isFetching,
}: QueryPendingState): boolean => isPending || isFetching

export const readRecommendationPeriodCode = (
  response: CandidateCommercialsResponse | null | undefined,
  fallback: string,
): string => {
  if (!isSuccessfulApiResponse(response)) return fallback

  const body: unknown = response.dataBody
  return isRecord(body) &&
    typeof body.periodCode === 'string' &&
    /^\d{4}[1-4]$/.test(body.periodCode)
    ? body.periodCode
    : fallback
}

export const consumeRecommendationResponse = (
  marker: HandledRecommendationMarker,
  requestKey: string,
  dataUpdatedAt: number,
): boolean => {
  const handledKey = JSON.stringify([requestKey, dataUpdatedAt])
  if (marker.current === handledKey) return false

  marker.current = handledKey
  return true
}

export const resetHandledRecommendationMarker = (
  marker: HandledRecommendationMarker,
): void => {
  marker.current = ''
}

export const getRecommendationStage = (
  view: RecommendationView,
  district: RecommendationOption | null,
  administration: RecommendationOption | null = null,
): MapStage => {
  if (view === 'results') return 'results'
  if (administration) return 'commercial'
  return district ? 'administration' : 'district'
}

export const createResultsLoadedAction = (
  requestKey: string,
  results: readonly CandidateCommercial[],
) =>
  ({
    type: 'resultsLoaded',
    requestKey,
    commercialCode: results[0]?.commercialCode ?? null,
  }) as const

export const selectResultHeadingForViewport = <T,>(
  isDesktop: boolean,
  desktopHeading: T | null,
  mobileHeading: T | null,
): T | null =>
  isDesktop
    ? (desktopHeading ?? mobileHeading)
    : (mobileHeading ?? desktopHeading)

export const handleRecommendationResponseOnce = ({
  marker,
  requestKey,
  dataUpdatedAt,
  results,
  dispatch,
  heading,
}: {
  marker: HandledRecommendationMarker
  requestKey: string
  dataUpdatedAt: number
  results: readonly CandidateCommercial[]
  dispatch: (action: ReturnType<typeof createResultsLoadedAction>) => void
  heading: {
    focus: (options?: FocusOptions) => void
  } | null
}): boolean => {
  if (!consumeRecommendationResponse(marker, requestKey, dataUpdatedAt)) {
    return false
  }

  dispatch(createResultsLoadedAction(requestKey, results))
  heading?.focus({ preventScroll: true })
  return true
}

export const applyRecommendationPreviewChange = (
  commercialCode: string | null,
  setPreviewedCommercialCode: (code: string | null) => void,
): void => {
  setPreviewedCommercialCode(commercialCode)
}

export const getRecommendBookmarkLoginHref = (): string =>
  '/login?redirect=%2Frecommend'

export const handleRecommendationBookmarkToggle = ({
  hasHydrated,
  isLoggedIn,
  navigate,
  onAuthenticatedToggle,
}: {
  hasHydrated: boolean
  isLoggedIn: boolean
  navigate: (href: string) => void
  onAuthenticatedToggle: () => void
}): boolean => {
  if (!hasHydrated) return false

  if (!isLoggedIn) {
    navigate(getRecommendBookmarkLoginHref())
    return false
  }

  onAuthenticatedToggle()
  return true
}

export const isRecommendationBookmarkPending = (
  hasHydrated: boolean,
  reservations: RecommendationBookmarkReservationRegistry,
  memberId: string | null,
  commercialCode: string,
): boolean =>
  !hasHydrated ||
  (memberId !== null &&
    isRecommendationBookmarkReserved(reservations, memberId, commercialCode))

export const reserveRecommendationBookmarkMutation = (
  reservations: RecommendationBookmarkReservationRegistry,
  memberId: string,
  commercialCode: string,
): RecommendationBookmarkReservation | null => {
  const memberReservations =
    reservations.get(memberId) ?? new Map<string, symbol>()
  if (memberReservations.has(commercialCode)) return null

  const reservation = {
    memberId,
    commercialCode,
    token: Symbol(`${memberId}:${commercialCode}`),
  }
  memberReservations.set(commercialCode, reservation.token)
  reservations.set(memberId, memberReservations)
  return reservation
}

export const releaseRecommendationBookmarkMutation = (
  reservations: RecommendationBookmarkReservationRegistry,
  reservation: RecommendationBookmarkReservation,
): boolean => {
  const memberReservations = reservations.get(reservation.memberId)
  if (
    memberReservations?.get(reservation.commercialCode) !== reservation.token
  ) {
    return false
  }

  memberReservations.delete(reservation.commercialCode)
  if (memberReservations.size === 0) {
    reservations.delete(reservation.memberId)
  }
  return true
}

export const isRecommendationBookmarkReserved = (
  reservations: RecommendationBookmarkReservationRegistry,
  memberId: string,
  commercialCode: string,
): boolean => reservations.get(memberId)?.has(commercialCode) === true

const cloneRecommendationBookmarkReservations = (
  reservations: RecommendationBookmarkReservationRegistry,
): RecommendationBookmarkReservationRegistry =>
  new Map(
    [...reservations].map(([memberId, memberReservations]) => [
      memberId,
      new Map(memberReservations),
    ]),
  )

export const shouldApplyRecommendationBookmarkMutation = (
  activeMemberId: string | null,
  requestMemberId: string,
): boolean => activeMemberId === requestMemberId

const Page = styled.main`
  width: 100%;
`

const Stage = styled.section`
  position: relative;
  width: 100%;
  min-height: max(560px, calc(100dvh - 72px));
  overflow: hidden;
  background: var(--color-surface-muted);

  @media (min-width: 1024px) {
    min-height: calc(100dvh - 72px);
  }
`

const MapSlot = styled.div`
  position: absolute;
  inset: 0;

  > section {
    width: 100%;
    height: 100%;
    min-height: 100%;
    border: 0;
    border-radius: 0;
  }

  [data-recommend-map-container='true'] {
    height: 100%;
    min-height: 100%;
  }
`

const DesktopPanelSlot = styled.aside`
  position: absolute;
  z-index: 10;
  top: 24px;
  bottom: 24px;
  left: 24px;
  width: min(390px, calc(100vw - 48px));
  min-height: 0;

  > section {
    width: 100%;
    max-height: 100%;
  }

  @media (max-width: 1023px) {
    display: none;
  }
`

const MapFeedbackSlot = styled.div`
  position: absolute;
  z-index: 12;
  right: 16px;
  bottom: 16px;
  width: min(360px, calc(100% - 32px));

  @media (max-width: 1023px) {
    bottom: 104px;
  }
`

const VisuallyHiddenHeading = styled.h1`
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  white-space: nowrap;
`

export default function RecommendPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const hasHydrated = useAuthStore(auth => auth.hasHydrated)
  const isLoggedIn = useAuthStore(auth => auth.isLoggedIn)
  const memberId = useAuthStore(auth => auth.memberInfo?.memberId ?? null)
  const bookmarksQuery = useCommercialBookmarks(
    memberId,
    hasHydrated && isLoggedIn,
  )
  const [bookmarkUiState, setBookmarkUiState] = useState<BookmarkUiState>({
    memberId,
    error: null,
  })
  const bookmarkReservationsRef =
    useRef<RecommendationBookmarkReservationRegistry>(new Map())
  const [bookmarkReservations, setBookmarkReservations] =
    useState<RecommendationBookmarkReservationRegistry>(new Map())
  const activeBookmarkMemberIdRef = useRef(memberId)
  const [state, dispatch] = useReducer(
    recommendationReducer,
    undefined,
    createInitialRecommendationState,
  )
  const [viewportBounds, setViewportBounds] =
    useState<GeoBounds>(SEOUL_MAP_BOUNDS)
  const mapStage = getRecommendationStage(
    state.view,
    state.draft.district,
    state.draft.administration,
  )
  const [previewedCommercialCode, setPreviewedCommercialCode] = useState<
    string | null
  >(null)
  const desktopResultHeadingRef = useRef<HTMLHeadingElement>(null)
  const mobileResultHeadingRef = useRef<HTMLHeadingElement>(null)
  const handledResultRef = useRef('')
  const bookmarkMutation = useMutation<
    BookmarkMutationResponse,
    Error,
    BookmarkMutationInput
  >({
    mutationFn: ({
      bookmarkId,
      commercialCode,
      commercialName,
      memberId: requestMemberId,
    }: BookmarkMutationInput) => {
      if (!requestMemberId) {
        throw new Error('회원 정보를 확인하지 못했습니다.')
      }

      return bookmarkId === null
        ? addMemberBookmark({
            targetType: 'COMMERCIAL',
            targetCode: commercialCode,
            targetName: commercialName,
          })
        : removeMemberBookmark(bookmarkId)
    },
  })

  useEffect(() => {
    activeBookmarkMemberIdRef.current = memberId
  }, [memberId])

  const districtMapQuery = useQuery({
    queryKey: ['recommend', 'map', 'districts', viewportBounds],
    queryFn: () => fetchDistrictMapAreas(viewportBounds),
    enabled: mapStage === 'district',
    placeholderData: previousData => previousData,
  })
  const districtAreas = useMemo(
    () => readMapAreas(districtMapQuery.data),
    [districtMapQuery.data],
  )

  const administrationsQuery = useQuery({
    queryKey: [
      'recommend',
      'regions',
      'administrations',
      state.draft.district?.code,
    ],
    queryFn: () => fetchAdministrations(state.draft.district!.code),
    enabled: state.draft.district !== null,
  })
  const administrations = useMemo(
    () => readAdministrations(administrationsQuery.data),
    [administrationsQuery.data],
  )
  const administrationCodes = useMemo(
    () =>
      administrations.map(administration =>
        String(administration.administrationCode),
      ),
    [administrations],
  )

  const administrationMapQuery = useQuery({
    queryKey: [
      'recommend',
      'map',
      'administrations',
      state.draft.district?.code,
      viewportBounds,
    ],
    queryFn: () => fetchAdministrationMapAreas(viewportBounds),
    enabled:
      mapStage === 'administration' &&
      state.draft.district !== null &&
      administrationCodes.length > 0,
    placeholderData: previousData => previousData,
  })
  const administrationAreas = useMemo(
    () =>
      filterAreasByCodes(
        readMapAreas(administrationMapQuery.data),
        administrationCodes,
      ),
    [administrationCodes, administrationMapQuery.data],
  )

  const commercialsQuery = useQuery({
    queryKey: [
      'recommend',
      'regions',
      'commercials',
      state.draft.district?.code,
      state.draft.administration?.code,
    ],
    queryFn: () =>
      fetchCommercials(
        state.draft.district!.code,
        state.draft.administration!.code,
      ),
    enabled:
      state.draft.district !== null && state.draft.administration !== null,
  })
  const commercials = useMemo(
    () => readCommercials(commercialsQuery.data),
    [commercialsQuery.data],
  )
  const commercialCodes = useMemo(
    () => commercials.map(commercial => String(commercial.commercialCode)),
    [commercials],
  )
  const commercialMapQuery = useQuery({
    queryKey: [
      'recommend',
      'map',
      'commercials',
      state.draft.administration?.code,
      viewportBounds,
    ],
    queryFn: () => fetchCommercialMapAreas(viewportBounds),
    enabled: mapStage === 'commercial' && commercialCodes.length > 0,
    placeholderData: previousData => previousData,
  })
  const commercialAreas = useMemo(
    () =>
      filterAreasByCodes(
        readMapAreas(commercialMapQuery.data),
        commercialCodes,
      ),
    [commercialCodes, commercialMapQuery.data],
  )

  const recommendationQuery = useQuery({
    queryKey: [
      'recommend',
      'results',
      state.submitted?.district.code,
      state.submitted?.administration.code,
      state.submitted?.service.code,
      RECOMMENDATION_PERIOD_CODE,
      state.submitted?.commercialCodesKey,
    ],
    queryFn: () =>
      fetchCommercialRecommendations({
        serviceCode: state.submitted!.service.code,
        commercialCodes: [...state.submitted!.commercialCodes],
        periodCode: RECOMMENDATION_PERIOD_CODE,
        topN: RECOMMENDATION_TOP_N,
      }),
    enabled: state.submitted !== null,
  })
  const results = useMemo(
    () =>
      normalizeRecommendationResults(
        recommendationQuery.data,
        state.submitted?.commercialCodes ?? [],
      ),
    [recommendationQuery.data, state.submitted?.commercialCodes],
  )
  const recommendationBasis = useMemo(
    () => normalizeRecommendationBasis(recommendationQuery.data),
    [recommendationQuery.data],
  )
  const profileScope = useMemo<CommercialProfileScope>(
    () => ({
      districtCode: state.submitted?.district.code ?? '',
      administrationCode: state.submitted?.administration.code ?? '',
      commercialCodes: results.map(result => result.commercialCode),
    }),
    [
      results,
      state.submitted?.administration.code,
      state.submitted?.district.code,
    ],
  )
  const combineProfiles = useMemo(
    () => createCommercialProfileQueryCombiner(profileScope),
    [profileScope],
  )

  const profiles = useQueries({
    queries: results.map(result => ({
      queryKey: [
        'recommend',
        'profile',
        result.commercialCode,
        state.submitted?.service.code,
        RECOMMENDATION_PERIOD_CODE,
      ],
      queryFn: () =>
        fetchCommercialProfile(
          result.commercialCode,
          state.submitted!.service.code,
          RECOMMENDATION_PERIOD_CODE,
        ),
      enabled: state.submitted !== null,
    })),
    combine: combineProfiles,
  })
  const resultCommercialCodes = useMemo(
    () => results.map(result => String(result.commercialCode)),
    [results],
  )
  // 결과 상권의 경계는 profile 이 주지 않는다(`boundaryCoords: []`). 뷰포트 질의만
  // 경계를 주므로, 결과 중심점을 감싸는 **고정 bbox** 로 한 번 더 받아 캐시한다.
  // 지도 뷰포트에 묶지 않는 것이 핵심 — 묶으면 패닝할 때마다 폴리곤이 깜빡인다.
  const resultBoundaryBounds = useMemo(() => {
    const centersByCode = new Map(
      commercials.map(commercial => [
        String(commercial.commercialCode),
        commercial,
      ]),
    )

    return buildResultBoundaryBounds(
      resultCommercialCodes.flatMap(code => {
        const commercial = centersByCode.get(code)

        return commercial
          ? [
              {
                centerLng: commercial.centerLng,
                centerLat: commercial.centerLat,
              },
            ]
          : []
      }),
    )
  }, [commercials, resultCommercialCodes])
  const resultBoundaryQuery = useQuery({
    queryKey: [
      'recommend',
      'map',
      'result-boundaries',
      resultCommercialCodes.join(','),
      resultBoundaryBounds,
    ],
    queryFn: () => fetchCommercialMapAreas(resultBoundaryBounds!),
    enabled: mapStage === 'results' && resultBoundaryBounds !== null,
    staleTime: Number.POSITIVE_INFINITY,
  })
  const resultBoundaries = useMemo(
    () =>
      filterAreasByCodes(
        readMapAreas(resultBoundaryQuery.data),
        resultCommercialCodes,
      ),
    [resultBoundaryQuery.data, resultCommercialCodes],
  )
  const resultAreas = useMemo(
    () =>
      buildRecommendationMapItems(
        results,
        profiles,
        commercials,
        resultBoundaries,
      ),
    [commercials, profiles, resultBoundaries, results],
  )

  useEffect(() => {
    if (
      !state.submitted ||
      !recommendationQuery.isSuccess ||
      !isSuccessfulApiResponse(recommendationQuery.data)
    ) {
      return
    }

    const isDesktop =
      typeof window === 'undefined' ||
      typeof window.matchMedia !== 'function' ||
      window.matchMedia('(min-width: 1024px)').matches
    handleRecommendationResponseOnce({
      marker: handledResultRef,
      requestKey: state.submitted.requestKey,
      dataUpdatedAt: recommendationQuery.dataUpdatedAt,
      results,
      dispatch,
      heading: selectResultHeadingForViewport(
        isDesktop,
        desktopResultHeadingRef.current,
        mobileResultHeadingRef.current,
      ),
    })
  }, [
    recommendationQuery.data,
    recommendationQuery.dataUpdatedAt,
    recommendationQuery.isSuccess,
    results,
    state.submitted,
  ])

  // 조건 폼의 두 실패도 같은 규약을 따른다 — 404는 재시도해도 같으므로 버튼 없이 서버 문구만 남는다.
  const administrationsError = useMemo(
    () =>
      state.draft.district
        ? resolveApiError({
            error: administrationsQuery.error,
            data: administrationsQuery.data,
          })
        : null,
    [
      administrationsQuery.data,
      administrationsQuery.error,
      state.draft.district,
    ],
  )
  const candidatesError = useMemo(
    () =>
      state.draft.administration
        ? resolveApiError({
            error: commercialsQuery.error,
            data: commercialsQuery.data,
          })
        : null,
    [commercialsQuery.data, commercialsQuery.error, state.draft.administration],
  )
  // 추천 실패는 HTTP 상태로 분기한다. 404(데이터 부재)는 재시도해도 결과가 같으므로
  // 재시도 버튼 없이 서버 문구만 보여준다 — 노출 판정은 `isRetryable`가 유일한 기준이다.
  // 매 렌더마다 새 객체가 나오면 아래 useMemo들이 통째로 무효화되므로 쿼리 상태에만 묶어둔다.
  const recommendationError = useMemo(
    () =>
      state.submitted
        ? resolveApiError({
            error: recommendationQuery.error,
            data: recommendationQuery.data,
          })
        : null,
    [recommendationQuery.data, recommendationQuery.error, state.submitted],
  )

  const recommendationFeedback = useMemo<
    RecommendPanelProps['feedback']
  >(() => {
    if (recommendationError) {
      const canRetry = isRetryable(recommendationError.kind)

      return {
        tone: 'error',
        title: '추천 상권을 불러오지 못했어요',
        description: recommendationError.message,
        isRetryable: canRetry,
        actionLabel: canRetry ? '다시 시도' : undefined,
      }
    }

    if (
      recommendationQuery.isSuccess &&
      isSuccessfulApiResponse(recommendationQuery.data) &&
      results.length === 0
    ) {
      return {
        tone: 'info',
        title: '추천 결과가 없어요',
        description: '현재 조건으로 추천할 상권이 없어요.',
      }
    }

    return null
  }, [
    recommendationError,
    recommendationQuery.data,
    recommendationQuery.isSuccess,
    results.length,
  ])

  const selectedResult = useMemo(
    () =>
      results.find(
        result => result.commercialCode === state.selectedCommercialCode,
      ) ?? null,
    [results, state.selectedCommercialCode],
  )
  const bookmarksByCommercialCode = useMemo(
    () =>
      new Map(
        bookmarksQuery.bookmarks.map(bookmark => [
          bookmark.targetCode,
          bookmark,
        ]),
      ),
    [bookmarksQuery.bookmarks],
  )

  const handleDistrictChange = useCallback((district: RecommendationOption) => {
    setPreviewedCommercialCode(null)
    dispatch({ type: 'districtSelected', district })
  }, [])
  const handleAdministrationChange = useCallback(
    (administration: RecommendationOption) => {
      setPreviewedCommercialCode(null)
      dispatch({ type: 'administrationSelected', administration })
    },
    [],
  )
  const handleServiceChange = useCallback((service: RecommendationOption) => {
    setPreviewedCommercialCode(null)
    dispatch({ type: 'serviceSelected', service })
  }, [])
  const handleSubmit = useCallback(() => {
    const commercialCodes = commercials.map(commercial =>
      String(commercial.commercialCode),
    )

    if (commercialCodes.length === 0) return

    resetHandledRecommendationMarker(handledResultRef)
    setPreviewedCommercialCode(null)
    dispatch({
      type: 'submitted',
      commercialCodes,
    })
  }, [commercials])
  const handleEdit = useCallback(() => {
    setPreviewedCommercialCode(null)
    dispatch({ type: 'editRequested' })
  }, [])
  const handleResultSelect = useCallback((commercialCode: string) => {
    setPreviewedCommercialCode(commercialCode)
    dispatch({ type: 'resultSelected', commercialCode })
  }, [])
  const handleResultPreviewChange = useCallback(
    (commercialCode: string | null) => {
      applyRecommendationPreviewChange(
        commercialCode,
        setPreviewedCommercialCode,
      )
    },
    [],
  )
  const handleBookmarkToggle = useCallback(
    (commercialCode: string, commercialName: string) => {
      handleRecommendationBookmarkToggle({
        hasHydrated,
        isLoggedIn,
        navigate: href => router.push(href),
        onAuthenticatedToggle: () => {
          const requestMemberId = memberId
          if (!requestMemberId) return

          const reservation = reserveRecommendationBookmarkMutation(
            bookmarkReservationsRef.current,
            requestMemberId,
            commercialCode,
          )
          if (!reservation) return

          setBookmarkUiState({
            memberId: requestMemberId,
            error: null,
          })
          setBookmarkReservations(
            cloneRecommendationBookmarkReservations(
              bookmarkReservationsRef.current,
            ),
          )

          const bookmark = bookmarksByCommercialCode.get(commercialCode) ?? null

          void bookmarkMutation
            .mutateAsync({
              bookmarkId: bookmark?.bookmarkId ?? null,
              commercialCode,
              commercialName,
              memberId: requestMemberId,
            })
            .then(async response => {
              if (!isApiSuccess(response)) {
                if (
                  shouldApplyRecommendationBookmarkMutation(
                    activeBookmarkMemberIdRef.current,
                    requestMemberId,
                  )
                ) {
                  setBookmarkUiState(current =>
                    current.memberId === requestMemberId
                      ? {
                          ...current,
                          error: getApiMessage(
                            response,
                            '북마크를 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.',
                          ),
                        }
                      : current,
                  )
                }
                return
              }

              await invalidateMemberBookmarksQuery(queryClient, requestMemberId)
            })
            .catch(error => {
              if (
                shouldApplyRecommendationBookmarkMutation(
                  activeBookmarkMemberIdRef.current,
                  requestMemberId,
                )
              ) {
                setBookmarkUiState(current =>
                  current.memberId === requestMemberId
                    ? {
                        ...current,
                        error:
                          error instanceof Error
                            ? error.message
                            : '북마크를 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.',
                      }
                    : current,
                )
              }
            })
            .finally(() => {
              const released = releaseRecommendationBookmarkMutation(
                bookmarkReservationsRef.current,
                reservation,
              )
              if (released) {
                setBookmarkReservations(
                  cloneRecommendationBookmarkReservations(
                    bookmarkReservationsRef.current,
                  ),
                )
              }
            })
        },
      })
    },
    [
      bookmarkMutation,
      bookmarksByCommercialCode,
      hasHydrated,
      isLoggedIn,
      memberId,
      queryClient,
      router,
    ],
  )
  const isBookmarked = useCallback(
    (commercialCode: string) => bookmarksByCommercialCode.has(commercialCode),
    [bookmarksByCommercialCode],
  )
  const isBookmarkPending = useCallback(
    (commercialCode: string) =>
      isRecommendationBookmarkPending(
        hasHydrated,
        bookmarkReservations,
        memberId,
        commercialCode,
      ),
    [bookmarkReservations, hasHydrated, memberId],
  )
  const handleMapDistrictSelect = useCallback(
    (districtCode: string) => {
      const districtRecord = districts.find(
        district => String(district.gooCode) === String(districtCode),
      )
      const districtArea = districtAreas.find(
        area => String(area.areaCode) === String(districtCode),
      )

      if (!districtRecord && !districtArea) return
      handleDistrictChange({
        code: String(districtCode),
        name: districtRecord?.gooName ?? districtArea!.areaName,
      })
    },
    [districtAreas, handleDistrictChange],
  )
  const handleMapAdministrationSelect = useCallback(
    (administrationCode: string) => {
      const administration = administrations.find(
        item => String(item.administrationCode) === String(administrationCode),
      )

      if (!administration) return
      handleAdministrationChange({
        code: String(administration.administrationCode),
        name: administration.administrationName,
      })
    },
    [administrations, handleAdministrationChange],
  )
  const handleMapBackgroundClick = useCallback(() => {
    dispatch({ type: 'sheetSnapChanged', snap: 'collapsed' })
  }, [])
  const { refetch: refetchAdministrations } = administrationsQuery
  const { refetch: refetchCommercials } = commercialsQuery
  const { refetch: refetchRecommendation } = recommendationQuery
  const retryAdministrations = useCallback(() => {
    void refetchAdministrations()
  }, [refetchAdministrations])
  const retryCandidates = useCallback(() => {
    void refetchCommercials()
  }, [refetchCommercials])
  const retryRecommendation = useCallback(() => {
    void refetchRecommendation()
  }, [refetchRecommendation])
  const isAdministrationsBusy = isRecommendationQueryBusy({
    isPending: administrationsQuery.isPending,
    isFetching: administrationsQuery.isFetching,
  })
  const isCandidatesBusy = isRecommendationQueryBusy({
    isPending: commercialsQuery.isPending,
    isFetching: commercialsQuery.isFetching,
  })
  const isRecommendationBusy = isRecommendationQueryBusy({
    isPending: recommendationQuery.isPending,
    isFetching: recommendationQuery.isFetching,
  })

  const pickerStep = state.pickerStep
  // 선택 뷰 항목은 **완전 목록**에서만 온다. 지도 영역 질의(/map/**)는 뷰포트
  // 기반이라 화면 밖 지역이 빠지고, 그걸 목록으로 쓰면 도달 불가능한 선택지가
  // 생긴다(condition-selector 명세 D5-2).
  const pickerItems = useMemo<OptionItem[] | undefined>(() => {
    if (pickerStep === 'district') {
      return districts.map(district => ({
        code: String(district.gooCode),
        name: district.gooName,
      }))
    }
    if (pickerStep === 'administration') {
      return administrations.map(administration => ({
        code: String(administration.administrationCode),
        name: administration.administrationName,
      }))
    }

    return undefined
  }, [administrations, pickerStep])

  const pickerGroups = useMemo<OptionGroup[] | undefined>(
    () =>
      pickerStep === 'service'
        ? Object.entries(simulationCatalog).map(([label, services]) => ({
            label,
            items: services.map(service => ({
              code: service.code,
              name: service.name,
            })),
          }))
        : undefined,
    [pickerStep],
  )

  const handleOpenStep = useCallback((step: RecommendConditionStep) => {
    dispatch({ type: 'pickerOpened', step })
  }, [])

  const handleClosePicker = useCallback(() => {
    dispatch({ type: 'pickerClosed' })
  }, [])

  const handlePickerSelect = useCallback(
    (code: string) => {
      if (pickerStep === 'district') {
        handleMapDistrictSelect(code)
        return
      }
      if (pickerStep === 'administration') {
        handleMapAdministrationSelect(code)
        return
      }

      const service = Object.values(simulationCatalog)
        .flat()
        .find(item => item.code === code)

      if (service) {
        handleServiceChange({ code: service.code, name: service.name })
      }
    },
    [
      handleMapAdministrationSelect,
      handleMapDistrictSelect,
      handleServiceChange,
      pickerStep,
    ],
  )

  const panelProps = useMemo<RecommendPanelProps>(
    () => ({
      view: state.view,
      draft: state.draft,
      submitted: state.submitted,
      administrations,
      candidatesCount: commercials.length,
      results,
      recommendationBasis,
      pickerStep,
      pickerItems,
      pickerGroups,
      onOpenStep: handleOpenStep,
      onClosePicker: handleClosePicker,
      onPickerSelect: handlePickerSelect,
      selectedCommercialCode: state.selectedCommercialCode,
      previewedCommercialCode,
      periodLabel: formatRecommendationPeriod(
        readRecommendationPeriodCode(
          recommendationQuery.data,
          RECOMMENDATION_PERIOD_CODE,
        ),
      ),
      isAdministrationsLoading:
        state.draft.district !== null && isAdministrationsBusy,
      isCandidatesLoading:
        state.draft.administration !== null && isCandidatesBusy,
      isRecommendationLoading: state.submitted !== null && isRecommendationBusy,
      administrationsError: administrationsError ?? undefined,
      candidatesError: candidatesError ?? undefined,
      feedback: recommendationFeedback,
      bookmarkError:
        (bookmarkUiState.memberId === memberId
          ? bookmarkUiState.error
          : null) ?? bookmarksQuery.errorMessage,
      isBookmarked,
      isBookmarkPending,
      onSubmit: handleSubmit,
      onEdit: handleEdit,
      onResultSelect: handleResultSelect,
      onResultPreviewChange: handleResultPreviewChange,
      onBookmarkToggle: handleBookmarkToggle,
      onRetry: retryRecommendation,
      onRetryAdministrations: retryAdministrations,
      onRetryCandidates: retryCandidates,
    }),
    [
      administrations,
      administrationsError,
      bookmarkUiState.error,
      bookmarkUiState.memberId,
      bookmarksQuery.errorMessage,
      candidatesError,
      commercials.length,
      handleBookmarkToggle,
      handleEdit,
      handleResultPreviewChange,
      handleResultSelect,
      handleSubmit,
      isAdministrationsBusy,
      isBookmarked,
      isBookmarkPending,
      isCandidatesBusy,
      isRecommendationBusy,
      memberId,
      handleClosePicker,
      handleOpenStep,
      handlePickerSelect,
      pickerGroups,
      pickerItems,
      pickerStep,
      recommendationBasis,
      recommendationFeedback,
      recommendationQuery.data,
      previewedCommercialCode,
      results,
      retryAdministrations,
      retryCandidates,
      retryRecommendation,
      state,
    ],
  )

  const districtMapError = resolveApiError({
    error: districtMapQuery.error,
    data: districtMapQuery.data,
  })
  const administrationMapError =
    mapStage === 'administration'
      ? resolveApiError({
          error: administrationMapQuery.error,
          data: administrationMapQuery.data,
        })
      : null
  const commercialMapError =
    mapStage === 'commercial'
      ? resolveApiError({
          error: commercialMapQuery.error,
          data: commercialMapQuery.data,
        })
      : null
  const mapError: NormalizedApiError | null =
    mapStage === 'district'
      ? districtMapError
      : mapStage === 'administration'
        ? administrationMapError
        : mapStage === 'commercial'
          ? commercialMapError
          : null
  const activeMapQuery =
    mapStage === 'commercial'
      ? commercialMapQuery
      : mapStage === 'administration'
        ? administrationMapQuery
        : districtMapQuery
  const retryMap = activeMapQuery.refetch
  const isMapRetrying = activeMapQuery.isFetching
  // 404(지도 데이터 부재)는 재시도해도 같다 → 버튼을 띄우지 않고 서버 문구만 남긴다.
  const isMapErrorRetryable = mapError !== null && isRetryable(mapError.kind)

  return (
    <Page data-hide-footer="true">
      <VisuallyHiddenHeading>상권 추천</VisuallyHiddenHeading>
      <Stage aria-label="상권 추천 탐색">
        <MapSlot>
          <RecommendMap
            administrationAreas={administrationAreas}
            commercialAreas={commercialAreas}
            districtAreas={districtAreas}
            isResultSelectionExplicit={state.resultSelectionSource === 'user'}
            // 경계가 도착하기 전에 중심점으로 한 번 맞추고 다시 맞추면 카메라가 두 번
            // 움직인다. 경계 질의가 끝날 때까지 카메라를 잡아 둔다.
            isResultsLoading={
              isRecommendationQueryBusy(recommendationQuery) ||
              (resultBoundaryBounds !== null &&
                isRecommendationQueryBusy(resultBoundaryQuery))
            }
            previewedCommercialCode={previewedCommercialCode}
            resultAreas={resultAreas}
            selectedAdministrationCode={
              state.draft.administration?.code ?? null
            }
            selectedCommercialCode={state.selectedCommercialCode}
            selectedDistrictCode={state.draft.district?.code ?? null}
            stage={mapStage}
            onAdministrationSelect={handleMapAdministrationSelect}
            onBackgroundClick={handleMapBackgroundClick}
            onCommercialPreviewChange={handleResultPreviewChange}
            onCommercialSelect={handleResultSelect}
            onDistrictSelect={handleMapDistrictSelect}
            onViewportBoundsChange={setViewportBounds}
          />
        </MapSlot>

        <DesktopPanelSlot
          aria-label="상권 추천 조건과 결과"
          data-map-overlay="true"
        >
          <RecommendPanel
            {...panelProps}
            resultHeadingRef={desktopResultHeadingRef}
          />
        </DesktopPanelSlot>

        <RecommendMobileSheet
          selectedResult={selectedResult}
          snap={state.sheetSnap}
          view={state.view}
          onSnapChange={snap => dispatch({ type: 'sheetSnapChanged', snap })}
        >
          <RecommendPanel
            {...panelProps}
            resultHeadingRef={mobileResultHeadingRef}
            variant="sheet"
          />
        </RecommendMobileSheet>

        {mapError ? (
          <MapFeedbackSlot>
            <RecommendFeedback
              actionLabel={
                !isMapErrorRetryable
                  ? undefined
                  : isMapRetrying
                    ? '지도 불러오는 중'
                    : '지도 다시 불러오기'
              }
              description={mapError.message}
              isActionDisabled={isMapRetrying}
              title="지도 정보를 불러오지 못했어요"
              tone="error"
              onAction={
                isMapErrorRetryable
                  ? () => {
                      void retryMap()
                    }
                  : undefined
              }
            />
          </MapFeedbackSlot>
        ) : null}
      </Stage>
    </Page>
  )
}
