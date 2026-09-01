'use client'

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { buildLoginHref, currentBrowserPath } from '@/lib/auth/return-path'
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
  recommendCommercialsKey,
  recommendProfileKey,
  recommendResultsKey,
} from '@/lib/recommend/recommend-query-keys'
import {
  isRecord,
  isSuccessfulApiResponse,
  isValidCoordinate,
  readCommercials,
} from '@/lib/recommend/recommend-response'
import { resolveRecommendSheetHeadline } from '@/lib/recommend/sheet-headline'
import {
  createInitialRecommendationState,
  type RecommendationSeed,
  formatRecommendationPeriod,
  recommendationReducer,
  type RecommendConditionStep,
  type RecommendationOption,
  type RecommendationView,
} from '@/lib/recommend/recommend-state'
import {
  createRecommendHref,
  parseRecommendUrlState,
} from '@/lib/recommend/recommend-url'
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
  CommercialProfile,
  CommercialProfileResponse,
  CoordinateTuple,
  GeoBounds,
  MetricBreakdownItem,
  MapAreasResponse,
  RecommendationBasis,
  ScoreMetricMetadata,
} from '@/types/recommend'

import { RECOMMEND_CONDITION_LABELS } from './recommend-condition-bar'
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

const normalizeCoordinateTuples = (value: unknown): CoordinateTuple[] =>
  Array.isArray(value)
    ? value.flatMap(coordinate =>
        Array.isArray(coordinate) &&
        isValidCoordinate(coordinate[0], coordinate[1])
          ? [[coordinate[0] as number, coordinate[1] as number] as const]
          : [],
      )
    : []

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

/**
 * 결과가 도착했을 때 무엇을 고를지 정한다.
 *
 * 기본은 **1위 자동 선택**이다(목록·상세가 빈 채로 뜨지 않게). 다만 링크가 상권을
 * 지목했고 그것이 결과에 있으면 **그쪽이 이긴다** — 「3위를 보던 화면」 링크를 열었는데
 * 1위가 펼쳐지면 링크가 조용히 거짓말한 것이다.
 *
 * 이 판정을 별도 이펙트로 두면 `resultsLoaded` 와 순서를 다투다 1위가 덮어쓴다.
 * 실제로 그렇게 만들었다가 링크의 선택이 사라지는 것을 브라우저에서 확인했다.
 */
export const createResultsLoadedAction = (
  requestKey: string,
  results: readonly CandidateCommercial[],
  preferredCommercialCode: string | null = null,
) => {
  const preferred =
    preferredCommercialCode !== null &&
    results.some(
      result => String(result.commercialCode) === preferredCommercialCode,
    )
      ? preferredCommercialCode
      : null

  return {
    type: 'resultsLoaded',
    requestKey,
    commercialCode: preferred ?? results[0]?.commercialCode ?? null,
    source: preferred ? 'user' : 'auto',
  } as const
}

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
  preferredCommercialCode = null,
}: {
  marker: HandledRecommendationMarker
  requestKey: string
  dataUpdatedAt: number
  results: readonly CandidateCommercial[]
  /** 링크가 지목한 상권. 결과에 있으면 1위 대신 이것을 고른다. */
  preferredCommercialCode?: string | null
  dispatch: (action: ReturnType<typeof createResultsLoadedAction>) => void
  heading: {
    focus: (options?: FocusOptions) => void
  } | null
}): boolean => {
  if (!consumeRecommendationResponse(marker, requestKey, dataUpdatedAt)) {
    return false
  }

  dispatch(
    createResultsLoadedAction(requestKey, results, preferredCommercialCode),
  )
  heading?.focus({ preventScroll: true })
  return true
}

export const applyRecommendationPreviewChange = (
  commercialCode: string | null,
  setPreviewedCommercialCode: (code: string | null) => void,
): void => {
  setPreviewedCommercialCode(commercialCode)
}

/**
 * 북마크하려다 로그인으로 보낼 때의 복귀 주소.
 *
 * `/recommend` 로 고정하면 **조건·결과·고른 상권이 전부 사라진 채 돌아온다.** URL 상태가
 * 생기기 전에는 복원할 것이 없어 무해했지만 이제는 손실이다. 주소창을 그대로 집는다 —
 * 거울 이펙트가 이미 현재 상태를 써 두었다.
 */
export const getRecommendBookmarkLoginHref = (): string =>
  buildLoginHref(currentBrowserPath())

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

function RecommendPageBody() {
  const router = useRouter()
  const searchParams = useSearchParams()
  /**
   * URL 씨앗은 **마운트 때 한 번만** 읽는다. 이후 URL 은 상태의 거울일 뿐이라
   * 다시 읽으면 방금 우리가 쓴 값을 되읽어 루프가 된다.
   */
  const [urlSeed] = useState(() => parseRecommendUrlState(searchParams))
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
    urlSeed satisfies RecommendationSeed,
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
    queryKey: recommendCommercialsKey(
      state.draft.district?.code,
      state.draft.administration?.code,
    ),
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
    queryKey: recommendResultsKey({
      districtCode: state.submitted?.district.code,
      administrationCode: state.submitted?.administration.code,
      serviceCode: state.submitted?.service.code,
      periodCode: RECOMMENDATION_PERIOD_CODE,
      commercialCodesKey: state.submitted?.commercialCodesKey,
    }),
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
      queryKey: recommendProfileKey(
        result.commercialCode,
        state.submitted?.service.code,
        RECOMMENDATION_PERIOD_CODE,
      ),
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

  // ── URL 복원 ─────────────────────────────────────────────────────────────
  /**
   * 행정동 이름은 URL 이 모른다(정적 목록이 없다). 목록이 도착하면 채운다.
   * 이름이 이미 있으면 건드리지 않는다 — 사용자가 고른 것을 덮어쓰지 않기 위해서다.
   *
   * **목록에 없으면 그 행정동을 버린다.** URL 검증은 앞 5자리 비교뿐이라
   * `11680999` 같은 없는 동이 통과한다(`parseRecommendUrlState`). 여기가 그것을
   * 걸러내는 유일한 지점이다 — 목록이 오기 전에는 없는 동인지 알 방법이 없다.
   */
  useEffect(() => {
    const administration = state.draft.administration

    if (!administration || administration.name) return
    /*
     * **목록이 도착한 뒤에만 판정한다.** 로딩 중에는 `administrations` 가 빈 배열이라,
     * 이 가드가 없으면 **멀쩡한 링크의 행정동을 즉시 버린다.** 실패(네트워크 오류)일
     * 때도 버리지 않는다 — 일시적인 오류로 사용자의 조건을 지울 이유가 없다.
     */
    if (!administrationsQuery.isSuccess) return

    const matched = administrations.find(
      item => String(item.administrationCode) === administration.code,
    )

    if (!matched) {
      dispatch({ type: 'administrationRejected', code: administration.code })

      return
    }

    // 이름이 비어 있으면 채울 것이 없다. 그대로 dispatch 하면 리듀서가 매번 새 객체를
    // 만들고 이 이펙트의 deps 가 다시 바뀌어 **렌더 루프에 빠진다.**
    if (!matched.administrationName) return

    dispatch({
      type: 'administrationNameResolved',
      administration: {
        code: administration.code,
        name: matched.administrationName,
      },
    })
  }, [
    administrations,
    administrationsQuery.isSuccess,
    state.draft.administration,
  ])

  /**
   * `view=results` 로 들어온 링크는 후보 상권 목록이 와야 제출할 수 있다
   * (`submitted` 가 코드 목록을 요구한다). 목록이 도착하는 **첫 순간 한 번만** 제출한다.
   */
  const seededSubmitRef = useRef(!urlSeed.isResultsView)
  useEffect(() => {
    if (seededSubmitRef.current || state.submitted) return

    /*
     * 씨앗이 지목한 조건이 아니면 **자동 제출하지 않는다.** 후보 목록이 늦게 오는
     * 동안(모바일 회선) 자치구를 바꿔 두면, 새 목록이 도착하는 순간 「상권 추천받기」를
     * 누르지도 않았는데 결과 화면으로 점프한다.
     *
     * **조건이 사라진 경우도 여기로 온다** — 없는 행정동이라 버려졌을 때가 그렇다
     * (`administrationRejected`). 그 제출은 되살아나지 않으므로 여기서 거울을 풀어
     * 줘야 한다. 풀어 주지 않으면 아래 URL 거울이 영영 막혀 **주소창에 없는 동 코드가
     * 그대로 남는다.** 그래서 널 검사보다 이 비교가 **먼저** 와야 한다.
     */
    if (
      state.draft.administration?.code !== urlSeed.administration?.code ||
      state.draft.service?.code !== urlSeed.service?.code
    ) {
      seededSubmitRef.current = true
      return
    }

    if (!state.draft.administration || !state.draft.service) return
    if (commercials.length === 0) return

    seededSubmitRef.current = true
    dispatch({
      type: 'submitted',
      commercialCodes: commercials.map(commercial =>
        String(commercial.commercialCode),
      ),
    })
  }, [
    commercials,
    state.draft.administration,
    state.draft.service,
    state.submitted,
    urlSeed,
  ])

  /**
   * 링크가 지목한 상권. **첫 응답에만** 쓰고 비운다 — 그 뒤 사용자가 조건을 바꿔
   * 다시 추천받으면 1위부터 보는 것이 맞다.
   */
  const seedSelectionRef = useRef(urlSeed.commercialCode)

  /**
   * 상태 → URL 거울. 이 이펙트가 **URL 정리도 겸한다** — 복원할 수 없어 버린 코드
   * (잘못된 자치구·업종 등)는 다음 반영에서 주소창에서도 사라진다.
   *
   * ⚠️ **첫 인자로 `window.history.state` 를 넘기는 것은 의도적이다. `null` 로 바꾸지 마라.**
   *
   * Next 가 덮어쓴 `replaceState` 는 `data?.__NA` 가 있으면 「내부 호출」로 보고
   * `applyUrlFromHistoryPushReplace` 를 건너뛴다(`app-router.js` L255·L271). 이 페이지의
   * `history.state` 에는 `HistoryUpdater` 가 심은 `__NA: true` 가 항상 들어 있으므로, 이
   * 호출은 **주소창만 바꾸고 라우터의 `canonicalUrl` 은 건드리지 않는다.**
   *
   * **`null` 을 넘기면 조건을 하나 고를 때마다 RSC 왕복이 붙는다.** 그때는
   * `applyUrlFromHistoryPushReplace` 가 `ACTION_RESTORE` 를 디스패치하는데, Next 16 의
   * `restore-reducer` 는 그것을 `startPPRNavigation` + `spawnDynamicRequests` 로 처리한다
   * — 이름만 「복원」이지 **네비게이션 한 번**이다. 이 이펙트는 상태가 바뀔 때마다 돌기
   * 때문에 칩을 고를 때마다 서버 요청이 나간다. `router.replace` 도 같은 이유로 비싸다.
   *
   * 대가는 **라우터의 `canonicalUrl` 이 진입 시점에 굳는 것**이다. `appRouterState` 가
   * 한 번이라도 커밋되면 `HistoryUpdater` 의 `useInsertionEffect` 가
   * `replaceState(…, canonicalUrl)` 로 **주소창을 진입 URL 로 되돌린다.** 지금 이 화면에는
   * 그 트리거가 없다 — `router.refresh()` 사용처가 없고, 유일한 `router.push` 는 화면을
   * 떠나며, 프리페치는 리듀서 상태를 바꾸지 않는다. **`router.refresh()`·서버 액션·
   * 병렬/인터셉트 라우트를 이 화면에 들이면 그때 깨진다**(dev 의 Fast Refresh 가 그 예다).
   *
   * 히스토리에 항목을 쌓지 않아 「조건 하나씩 되감기」도 생기지 않는다.
   *
   * **중복은 ref 가 아니라 실제 주소창과 비교해서 막는다.** ref 로 막으면 StrictMode 가
   * 이펙트를 두 번 부를 때 첫 호출이 ref 를 채우고 두 번째가 조기 반환한다.
   */
  useEffect(() => {
    if (typeof window === 'undefined') return
    /*
     * 복원이 끝나기 전에는 쓰지 않는다. 마운트 직후 `state.view` 는 아직 `'criteria'`
     * 라서, 그대로 반영하면 **링크가 들고 온 `view=results`·`commercialCode` 를 주소창에서
     * 먼저 지워 버린다.** 그 사이 사용자가 주소를 복사하거나 새로고침하면 결과·선택이
     * 영구히 빠진 링크가 된다 — 공유받은 링크를 다시 공유하는 흔한 경로다.
     */
    if (!seededSubmitRef.current) return

    const href = createRecommendHref(state)
    const current = `${window.location.pathname}${window.location.search}`

    if (current === href) return

    window.history.replaceState(window.history.state, '', href)
  }, [state])

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
    const handled = handleRecommendationResponseOnce({
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
      preferredCommercialCode: seedSelectionRef.current,
    })

    // 실제로 반영됐을 때만 비운다. 마커가 걸러 낸 호출에서 비우면 링크의 선택을 잃는다.
    if (handled) seedSelectionRef.current = null
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

  // 접힘 상태(72px)에 보여줄 첫 줄. 시트는 문구를 만들지 않고 받아 쓴다.
  const sheetHeadline = useMemo(
    () =>
      resolveRecommendSheetHeadline({
        view: state.view,
        pickerLabel: pickerStep ? RECOMMEND_CONDITION_LABELS[pickerStep] : null,
        draft: state.draft,
        resultCount: results.length,
        selectedResult,
        isResultLoading: isRecommendationBusy,
      }),
    [
      isRecommendationBusy,
      pickerStep,
      results.length,
      selectedResult,
      state.draft,
      state.view,
    ],
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
          snap={state.sheetSnap}
          summary={sheetHeadline.summary}
          title={sheetHeadline.title}
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

/**
 * `useSearchParams` 는 Suspense 경계 없이는 정적 렌더에서 빌드가 깨진다.
 * `/analysis` 도 같은 이유로 셸을 감싼다.
 */
export default function RecommendPage() {
  return (
    <Suspense
      fallback={<Page data-hide-footer="true" aria-label="상권 추천 준비 중" />}
    >
      <RecommendPageBody />
    </Suspense>
  )
}
