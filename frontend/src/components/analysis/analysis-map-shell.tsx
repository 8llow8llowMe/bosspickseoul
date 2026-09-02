'use client'

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import styled from 'styled-components'

import AnalysisMap, {
  type CameraSettle,
  type MapFitRequest,
} from '@/components/analysis/analysis-map'
import { AnalysisMapShellProvider } from '@/components/analysis/analysis-map-shell-context'
import AnalysisMobileSheet from '@/components/analysis/analysis-mobile-sheet'
import AnalysisSelectionPanel, {
  ANALYSIS_STEP_LABELS,
  type AnalysisCandidate,
} from '@/components/analysis/analysis-selection-panel'
import AiReportBody from '@/components/analysis/ai-report-body'
import AiReportCard from '@/components/analysis/ai-report/ai-report-card'
import AiReportLockCard from '@/components/analysis/ai-report/ai-report-lock-card'
import AiReportPanel from '@/components/analysis/ai-report/ai-report-panel'
import {
  buildAiLevelKey,
  resolveAiReportLevel,
  resolveAiReportTargetCode,
  resolveAiReportVisibility,
} from '@/lib/analysis/ai-report-presentation'
import { useAuthStore } from '@/stores/auth-store'
import {
  fetchCommercialServiceCategories,
  fetchDistricts,
} from '@/lib/api/commercial-analysis'
import {
  fetchAdministrationMapAreas,
  fetchAdministrations,
  fetchCommercialMapAreas,
  fetchCommercialProfile,
  fetchCommercials,
  fetchDistrictMapAreas,
} from '@/lib/api/recommend'
import { useNarrowViewport } from '@/hooks/use-narrow-viewport'
import { resolveApiError, retryUnlessClientError } from '@/lib/api/api-error'
import { isApiSuccess } from '@/lib/api/response'
import {
  ANALYSIS_PERIOD_CODE,
  ANALYSIS_STEPS,
  createAnalysisExplorerHref,
  createAnalysisResultHref,
  createEmptyAnalysisSelection,
  getActiveAnalysisStep,
  parseAnalysisSelection,
  selectAdministrationWithParent,
  selectAnalysisValue,
  selectCommercialWithParents,
  type AnalysisStep,
} from '@/lib/analysis/selection'
import { resolveMapLayerByZoom, type MapLayer } from '@/lib/analysis/map-layer'
import {
  CAMERA_LEVEL_BY_DEPTH,
  createCameraBounds,
  MAP_CAMERA_PARAM,
  parseMapCamera,
  SEOUL_DEFAULT_CAMERA,
  serializeMapCamera,
  type MapCamera,
} from '@/lib/analysis/map-camera'
import {
  createBounds,
  findContainingArea,
  normalizeBoundary,
} from '@/lib/map/geometry'
import type { ApiResponse } from '@/types/api'
import type { CommercialServiceCategory } from '@/types/commercial-analysis'
import type {
  AdministrationArea,
  AreaBoundaryItem,
  CommercialArea,
  GeoBounds,
  MapAreasBody,
} from '@/types/recommend'

type QueryStatus = 'loading' | 'error' | 'empty' | 'ready'

export const getAnalysisQueryStatus = ({
  isPending,
  isError,
  isSuccessResponse,
  itemCount,
}: {
  isPending: boolean
  isError: boolean
  isSuccessResponse: boolean
  itemCount: number
}): QueryStatus => {
  if (isPending) return 'loading'
  if (isError || !isSuccessResponse) return 'error'
  return itemCount === 0 ? 'empty' : 'ready'
}

const unwrapArray = <T,>(response: ApiResponse<T[]> | null | undefined): T[] =>
  isApiSuccess(response) && Array.isArray(response?.dataBody)
    ? response.dataBody
    : []

const unwrapMapAreas = (
  response: ApiResponse<MapAreasBody> | null | undefined,
): AreaBoundaryItem[] =>
  isApiSuccess(response) && Array.isArray(response?.dataBody?.areas)
    ? response.dataBody.areas
    : []

const Page = styled.main`
  position: relative;
  width: 100%;
  height: calc(100dvh - 65px);
  min-height: 560px;
  overflow: hidden;
  background: var(--color-surface-muted);
`

const Layout = styled.div`
  height: 100%;
  display: grid;
  grid-template-columns: 380px minmax(0, 1fr);

  @media (max-width: 1024px) {
    display: block;
  }
`

const DesktopPanel = styled.div`
  position: relative;
  z-index: 3;
  min-height: 0;
  border-right: 1px solid var(--color-border-200);
  box-shadow: var(--shadow-level-2);

  > section {
    height: 100%;
  }

  @media (max-width: 1024px) {
    display: none;
  }
`

const MapArea = styled.div`
  position: relative;
  min-width: 0;
  min-height: 0;
  overflow: hidden;

  @media (max-width: 1024px) {
    width: 100%;
    height: 100%;
  }
`

const MobilePanel = styled.div`
  display: none;

  @media (max-width: 1024px) {
    display: contents;
  }
`

const AiReportCardSlot = styled.div`
  position: absolute;
  z-index: 7;
  top: 16px;
  left: 16px;
  max-width: min(320px, calc(100% - 32px));

  @media (max-width: 1024px) {
    display: none;
  }
`

const AiReportPanelSlot = styled.div`
  position: absolute;
  z-index: 9;
  top: 0;
  left: 0;
  height: 100%;
  width: min(380px, 92%);
  border-right: 1px solid var(--color-border-200);
  box-shadow: var(--shadow-level-3);

  @media (max-width: 1024px) {
    display: none;
  }
`

const MapNotice = styled.div`
  position: absolute;
  z-index: 8;
  top: 16px;
  left: 50%;
  max-width: min(420px, calc(100% - 32px));
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-control);
  background: rgba(255, 255, 255, 0.94);
  box-shadow: var(--shadow-level-2);
  color: var(--color-text-700);
  padding: 10px 14px;
  font-size: 13px;
  line-height: 20px;
  text-align: center;
  transform: translateX(-50%);
`

/**
 * 지도 셸의 표면. 결과 레이어는 이 표면 **밖**(document.body 포털)에 뜨므로,
 * `inert` 를 이 표면에 걸면 지도 라벨(`<button>`)·선택 패널이 포커스 트랩 밖으로
 * 새지 않는다(map-shell.md D6).
 */
export function AnalysisExplorerSurface({
  map,
  desktopPanel,
  mobilePanel,
  mapNotice,
  aiReportCard,
  aiReportPanel,
  inert = false,
}: {
  map: ReactNode
  desktopPanel: ReactNode
  mobilePanel: ReactNode
  mapNotice?: ReactNode
  aiReportCard?: ReactNode
  aiReportPanel?: ReactNode
  inert?: boolean
}) {
  return (
    <Page
      data-hide-footer="true"
      inert={inert}
      aria-hidden={inert ? true : undefined}
    >
      <Layout>
        <DesktopPanel>{desktopPanel}</DesktopPanel>
        <MapArea>
          {map}
          {mapNotice ? <MapNotice>{mapNotice}</MapNotice> : null}
          {aiReportCard ? (
            <AiReportCardSlot>{aiReportCard}</AiReportCardSlot>
          ) : null}
          {aiReportPanel ? (
            <AiReportPanelSlot>{aiReportPanel}</AiReportPanelSlot>
          ) : null}
          <MobilePanel>{mobilePanel}</MobilePanel>
        </MapArea>
      </Layout>
    </Page>
  )
}

const getNextStep = (step: AnalysisStep): AnalysisStep => {
  const index = ANALYSIS_STEPS.indexOf(step)
  return ANALYSIS_STEPS[Math.min(index + 1, ANALYSIS_STEPS.length - 1)]
}

// 선택 후 지도가 진입할 줌 레벨 (resolveMapLayerByZoom: >=7 자치구 / 5~6 행정동 / <=4 상권)
const ADMINISTRATION_ZOOM_LEVEL = CAMERA_LEVEL_BY_DEPTH.district // 자치구 선택 → 행정동이 보이는 depth
const COMMERCIAL_ZOOM_LEVEL = CAMERA_LEVEL_BY_DEPTH.administration // 행정동 선택 → 상권이 보이는 depth
const COMMERCIAL_FRAME_ZOOM_LEVEL = CAMERA_LEVEL_BY_DEPTH.commercial // 상권 선택 → 상권을 좀 더 가깝게 프레임

const PANEL_FIT_LEVEL_BY_STEP: Record<AnalysisStep, number | null> = {
  district: ADMINISTRATION_ZOOM_LEVEL,
  administration: COMMERCIAL_ZOOM_LEVEL,
  commercial: COMMERCIAL_FRAME_ZOOM_LEVEL,
  service: null, // 업종은 지도 위치와 무관 → 이동 없음
}

/** 결과 레이어가 열리는 경로. 셸은 이 경로에서만 레이어 슬롯을 활성으로 본다. */
export const ANALYSIS_RESULT_PATHNAME = '/analysis/result'

/**
 * `c` 없는 URL 의 폴백 카메라를 어느 depth 까지 맞췄는지 나타내는 순위(D4-4).
 * 앞 단계 geometry 가 먼저 도착하므로 district → administration → commercial 로
 * **단계적으로 수렴**한다. 순위가 올라가는 방향으로만 fit 한다.
 */
const FALLBACK_DEPTH_RANK = {
  none: 0,
  district: 1,
  administration: 2,
  commercial: 3,
} as const

type FallbackDepth = keyof typeof FALLBACK_DEPTH_RANK

/** 영역 geometry(또는 중심점)에서 카메라 중심을 뽑는다. */
const resolveAreaCenter = (
  areas: readonly AreaBoundaryItem[],
  code: string | null,
): { lat: number; lng: number } | null => {
  if (!code) return null
  const area = areas.find(item => String(item.areaCode) === code)
  if (!area) return null

  const bounds = createBounds(normalizeBoundary(area.boundaryCoords))
  if (bounds) {
    return {
      lat: (bounds.latSW + bounds.latNE) / 2,
      lng: (bounds.lngSW + bounds.lngNE) / 2,
    }
  }
  return Number.isFinite(area.centerLat) && Number.isFinite(area.centerLng)
    ? { lat: area.centerLat, lng: area.centerLng }
    : null
}

function AnalysisMapShellBody({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const searchParamsKey = searchParams.toString()
  const selection = useMemo(
    () => parseAnalysisSelection(searchParams),
    [searchParams],
  )
  const resultOpen = pathname === ANALYSIS_RESULT_PATHNAME

  // ── 카메라: URL 이 정본이다 ────────────────────────────────────────────────
  const urlCamera = useMemo(
    () => parseMapCamera(searchParams.get(MAP_CAMERA_PARAM)),
    [searchParams],
  )
  /**
   * `c` 없이 진입했는지를 **마운트 시점에** 확정한다. 첫 `idle` 이 `c` 를 써 넣으면
   * `urlCamera` 는 곧 non-null 이 되지만, 폴백 수렴(D4-4 순위 2~4)은 목표 depth 까지
   * 계속 진행돼야 하므로 "처음에 없었다"는 사실을 따로 기억한다.
   *
   * ref 가 아니라 state 인 이유: 이 값이 `cameraProfileQuery` 의 `enabled` 를 결정하므로
   * **렌더 중에 읽어야** 한다. 초기화 함수로 한 번 정해지고 이후 절대 바뀌지 않는다.
   */
  const [enteredWithoutCamera] = useState(() => urlCamera === null)
  const fallbackDepthRef = useRef<FallbackDepth>('none')
  /** 지도 생성에 쓰는 초기 카메라. 마운트 시점 값으로 고정한다. */
  const [initialCamera] = useState<MapCamera>(
    () => urlCamera ?? SEOUL_DEFAULT_CAMERA,
  )
  /** href 빌더가 보존할 "현재 카메라". `c` 가 없으면 초기 카메라를 쓴다. */
  const camera = urlCamera ?? initialCamera

  const [requestedStep, setRequestedStep] = useState<AnalysisStep>(() =>
    getActiveAnalysisStep(selection),
  )
  const [previewedCode, setPreviewedCode] = useState<string | null>(null)
  // 지도에서 상권을 고르면 증가시켜, 모바일 시트를 펼쳐 업종 선택을 유도한다.
  const [sheetExpandSignal, setSheetExpandSignal] = useState(0)
  /**
   * 지도 3종 쿼리 키. 첫 값은 URL 카메라의 근사 창이고, 첫 `idle` 이 실제(외향 양자화)
   * bounds 로 교체한다. 양자화 덕분에 111m 미만 미세 팬은 같은 키가 되어 재조회가 없다.
   */
  const [viewportBounds, setViewportBounds] = useState<GeoBounds>(() =>
    createCameraBounds(initialCamera),
  )
  // `idle` 을 기다리지 않고 초기 카메라의 level 로 활성 레이어를 정한다(TC-MS-063).
  const [mapLayer, setMapLayer] = useState<MapLayer>(() =>
    resolveMapLayerByZoom(initialCamera.level),
  )
  const [fitRequest, setFitRequest] = useState<MapFitRequest | null>(null)
  const requestFit = useCallback(
    (code: string, level: number) =>
      setFitRequest(prev => ({ code, level, seq: (prev?.seq ?? 0) + 1 })),
    [],
  )
  const requestFitToCenter = useCallback(
    (center: { lat: number; lng: number }, level: number) =>
      setFitRequest(prev => ({ center, level, seq: (prev?.seq ?? 0) + 1 })),
    [],
  )

  // ── 지도 마운트 판정(map-shell.md D5) ─────────────────────────────────────
  // 좁은 뷰포트 + 결과 열림이면 지도가 1px도 보이지 않으므로 언마운트한다.
  // `narrow === null`(측정 전)에도 마운트하지 않아, 하드 로드 첫 페인트에서
  // 지도를 만들었다가 곧바로 버리는 낭비를 피한다.
  const narrow = useNarrowViewport()
  const shouldMountMap = !resultOpen || narrow === false

  /**
   * 결과 레이어를 이 셸 인스턴스가 `push` 로 열었는가.
   * App Router 레이아웃은 `/analysis` ↔ `/analysis/result` 이동에서 리마운트되지
   * 않으므로 이 ref 로 판정이 성립한다. 하드 로드·새 탭·`/s/{shareCode}` 의 `replace`
   * 진입은 셸이 새로 마운트되어 `false` 다 → `replace` 경로를 탄다(D4-5).
   */
  const openedByPushRef = useRef(false)

  const hasHydrated = useAuthStore(state => state.hasHydrated)
  const isLoggedIn = useAuthStore(state => state.isLoggedIn)

  const aiLevel = resolveAiReportLevel(selection)
  const aiCode = aiLevel ? resolveAiReportTargetCode(selection, aiLevel) : null
  const aiLevelKey = buildAiLevelKey(aiLevel, aiCode, selection.serviceCode)

  const [aiPanelOpen, setAiPanelOpen] = useState(false)
  const [prevAiLevelKey, setPrevAiLevelKey] = useState(aiLevelKey)

  // 선택 레벨/코드가 바뀌면 리셋(자동 조회 금지). 렌더 중 key 비교로 즉시 리셋하는
  // React 권장 패턴("Adjusting state when a prop changes")을 사용해 effect 기반
  // setState의 cascading render를 피한다.
  if (prevAiLevelKey !== aiLevelKey) {
    setPrevAiLevelKey(aiLevelKey)
    setAiPanelOpen(false)
  }

  // 로그인 사용자만 카드를 클릭해 패널을 연다. 비로그인은 잠금 카드가 CTA를
  // 직접 노출하므로 이 핸들러가 호출될 일이 없다. AI 상태·재시도·결과 링크는
  // 이제 AiReportBody가 selection으로 직접 소유한다.
  const handleAiCardOpen = () => {
    setAiPanelOpen(true)
  }

  // 비로그인 잠금 카드의 CTA가 사용할 returnUrl 로그인 링크.
  const aiLoginHref = (() => {
    const search = searchParams.toString()
    const currentHref = search ? `${pathname}?${search}` : pathname
    return `/login?redirect=${encodeURIComponent(currentHref)}`
  })()

  const districtsQuery = useQuery({
    queryKey: ['analysis', 'districts', ANALYSIS_PERIOD_CODE],
    queryFn: () => fetchDistricts(ANALYSIS_PERIOD_CODE),
    retry: retryUnlessClientError(1),
  })
  const districtMapQuery = useQuery({
    queryKey: ['analysis', 'map', 'districts', viewportBounds],
    queryFn: () => fetchDistrictMapAreas(viewportBounds),
    // 지도가 없으면 폴리곤을 그릴 대상이 없다 → 받을 이유가 없다(D4-2).
    enabled: shouldMountMap,
    retry: retryUnlessClientError(1),
  })
  const administrationsQuery = useQuery({
    queryKey: ['analysis', 'administrations', selection.districtCode],
    queryFn: () => fetchAdministrations(selection.districtCode!),
    enabled: Boolean(selection.districtCode),
    retry: retryUnlessClientError(1),
  })
  const administrationMapQuery = useQuery({
    queryKey: ['analysis', 'map', 'administrations', viewportBounds],
    queryFn: () => fetchAdministrationMapAreas(viewportBounds),
    enabled:
      shouldMountMap &&
      (mapLayer === 'administration' || mapLayer === 'commercial'),
    retry: retryUnlessClientError(1),
  })
  const commercialsQuery = useQuery({
    queryKey: [
      'analysis',
      'commercials',
      selection.districtCode,
      selection.administrationCode,
    ],
    queryFn: () =>
      fetchCommercials(selection.districtCode!, selection.administrationCode!),
    enabled: Boolean(selection.districtCode && selection.administrationCode),
    retry: retryUnlessClientError(1),
  })
  const commercialMapQuery = useQuery({
    queryKey: ['analysis', 'map', 'commercials', viewportBounds],
    queryFn: () => fetchCommercialMapAreas(viewportBounds),
    enabled: shouldMountMap && mapLayer === 'commercial',
    retry: retryUnlessClientError(1),
  })
  const servicesQuery = useQuery({
    queryKey: ['analysis', 'services', selection.commercialCode],
    queryFn: () => fetchCommercialServiceCategories(selection.commercialCode!),
    enabled: Boolean(selection.commercialCode),
    retry: retryUnlessClientError(1),
  })

  /**
   * `c` 없는 결과 URL 의 폴백 카메라(D4-4 순위 2)용 상권 중심점.
   *
   * 쿼리 키가 `AnalysisResultView` 의 profile 쿼리와 **완전히 동일**하므로 React Query
   * 캐시를 공유한다 → 추가 네트워크 요청 0회. 결과 레이어가 열려 있을 때만 켜서,
   * 탐색 화면에서 지도 폴리곤으로 충분한 경우에 요청이 새로 생기지 않게 한다.
   */
  const cameraProfileQuery = useQuery({
    queryKey: [
      'analysis',
      'profile',
      selection.commercialCode ?? '',
      selection.serviceCode ?? '',
      selection.periodCode,
    ],
    queryFn: () =>
      fetchCommercialProfile(
        selection.commercialCode!,
        selection.serviceCode!,
        selection.periodCode,
      ),
    enabled:
      enteredWithoutCamera &&
      resultOpen &&
      Boolean(selection.commercialCode && selection.serviceCode),
    retry: retryUnlessClientError(1),
  })

  // 언랩 결과를 쿼리 데이터에 memo 한다. 지도 areas 참조가 매 렌더 새로 바뀌면
  // 지도 그리기 이펙트가 호버마다 재실행되므로, 참조 안정화가 성능의 핵심이다.
  const districts = useMemo(
    () => unwrapArray(districtsQuery.data),
    [districtsQuery.data],
  )
  const allDistrictAreas = useMemo(
    () => unwrapMapAreas(districtMapQuery.data),
    [districtMapQuery.data],
  )
  const administrations = useMemo(
    () => unwrapArray(administrationsQuery.data),
    [administrationsQuery.data],
  )
  const allAdministrationAreas = useMemo(
    () => unwrapMapAreas(administrationMapQuery.data),
    [administrationMapQuery.data],
  )
  const commercials = useMemo(
    () => unwrapArray(commercialsQuery.data),
    [commercialsQuery.data],
  )
  const allCommercialAreas = useMemo(
    () => unwrapMapAreas(commercialMapQuery.data),
    [commercialMapQuery.data],
  )
  const services = useMemo(
    () => unwrapArray(servicesQuery.data),
    [servicesQuery.data],
  )
  // ── 카메라 emit → URL replace + 조회 bounds 갱신 ──────────────────────────
  /**
   * 지도 정지(`idle` + 250ms) 뒤 **제스처당 1회** 호출된다.
   *
   * URL 은 항상 `replace` 다 — `push` 면 팬·줌 한 번마다 히스토리가 쌓여 뒤로가기가
   * 지도 이동 이력으로 가득 찬다(D5 히스토리 정책). 직렬화 결과가 직전 URL 값과
   * 같으면 아무것도 하지 않는다(프로그래매틱 fit 직후의 idle 이 여기서 걸러진다).
   */
  const handleCameraSettle = useCallback(
    ({ camera: settled, bounds, layer }: CameraSettle) => {
      setViewportBounds(previous =>
        previous.lngSW === bounds.lngSW &&
        previous.latSW === bounds.latSW &&
        previous.lngNE === bounds.lngNE &&
        previous.latNE === bounds.latNE
          ? previous
          : bounds,
      )
      setMapLayer(layer)

      const next = serializeMapCamera(settled)
      const params = new URLSearchParams(searchParamsKey)
      if (params.get(MAP_CAMERA_PARAM) === next) return

      params.set(MAP_CAMERA_PARAM, next)
      router.replace(`${pathname}?${params}`)
    },
    [pathname, router, searchParamsKey],
  )

  /**
   * `c` 없는 링크의 폴백 카메라 수렴(D4-4 순위 2~4).
   *
   * geometry 는 bounds 를 알아야 받을 수 있고 bounds 는 카메라에서 나오므로, 얕은
   * depth 부터 fit → idle → 다음 depth 조회 → fit 으로 단계적으로 수렴한다.
   * fit 후 첫 idle 이 `c` 를 URL 에 처음 기록한다 — **로드 즉시 replace 를 쏘지 않는다**.
   *
   * ⚠️ 이 이펙트는 파생 상태를 계산하는 게 아니라 **외부 시스템(카카오 지도)에 명령을
   * 보낸다.** `fitRequest` 는 그 명령 채널이고(기존 `requestFit` 과 같은 배선), 목표는
   * 쿼리 데이터가 도착하는 시점에만 정해진다. 목표 계산과 명령을 분리해 명령이 이펙트
   * 끝에서 한 번만 나가게 했다 — 렌더 중 계산으로 옮기면 "앞으로만 한 번" 규칙에
   * 필요한 ref 를 렌더에서 읽어야 해서 더 나쁜 위반이 된다.
   */
  useEffect(() => {
    if (!enteredWithoutCamera || !shouldMountMap) return

    const desired: FallbackDepth =
      selection.commercialCode && selection.serviceCode
        ? 'commercial'
        : selection.administrationCode
          ? 'administration'
          : selection.districtCode
            ? 'district'
            : 'none'
    if (desired === 'none') return

    const reached = FALLBACK_DEPTH_RANK[fallbackDepthRef.current]
    if (reached >= FALLBACK_DEPTH_RANK[desired]) return

    const profileResponse = cameraProfileQuery.data
    const profile = isApiSuccess(profileResponse)
      ? (profileResponse?.dataBody ?? null)
      : null

    /** 가장 깊은 depth 부터 시도하고, 아직 geometry 가 없으면 상위 depth 로 내려간다. */
    const resolveTarget = (): {
      depth: keyof typeof CAMERA_LEVEL_BY_DEPTH
      center: { lat: number; lng: number }
    } | null => {
      if (desired === 'commercial') {
        const center =
          profile &&
          Number.isFinite(profile.centerLat) &&
          Number.isFinite(profile.centerLng)
            ? { lat: profile.centerLat, lng: profile.centerLng }
            : resolveAreaCenter(allCommercialAreas, selection.commercialCode)
        if (center) return { depth: 'commercial', center }
      }

      if (
        FALLBACK_DEPTH_RANK[desired] >= FALLBACK_DEPTH_RANK.administration &&
        reached < FALLBACK_DEPTH_RANK.administration
      ) {
        const center = resolveAreaCenter(
          allAdministrationAreas,
          selection.administrationCode,
        )
        if (center) return { depth: 'administration', center }
      }

      if (reached < FALLBACK_DEPTH_RANK.district) {
        const center = resolveAreaCenter(
          allDistrictAreas,
          selection.districtCode,
        )
        if (center) return { depth: 'district', center }
      }

      return null
    }

    const target = resolveTarget()
    if (!target) return

    fallbackDepthRef.current = target.depth
    requestFitToCenter(target.center, CAMERA_LEVEL_BY_DEPTH[target.depth])
  }, [
    allAdministrationAreas,
    allCommercialAreas,
    allDistrictAreas,
    cameraProfileQuery.data,
    enteredWithoutCamera,
    requestFitToCenter,
    selection.administrationCode,
    selection.commercialCode,
    selection.districtCode,
    selection.serviceCode,
    shouldMountMap,
  ])

  /**
   * 결과 레이어 닫기(D4-5). 어떤 진입 경로에서도 사이트를 벗어나지 않는다.
   * `history.length`·`document.referrer` 는 신뢰할 수 없으므로 추측하지 않고,
   * 셸이 `push` 를 직접 했는지만 본다.
   */
  const closeResultLayer = useCallback(() => {
    if (openedByPushRef.current) {
      openedByPushRef.current = false
      router.back()
      return
    }
    router.replace(createAnalysisExplorerHref(selection, camera))
  }, [camera, router, selection])

  const requiredStep = getActiveAnalysisStep(selection)
  const activeStep =
    ANALYSIS_STEPS.indexOf(requestedStep) > ANALYSIS_STEPS.indexOf(requiredStep)
      ? requiredStep
      : requestedStep

  useEffect(() => {
    if (
      selection.districtCode &&
      districts.length > 0 &&
      !districts.some(
        item => String(item.districtCode) === selection.districtCode,
      )
    ) {
      router.replace(
        createAnalysisExplorerHref(createEmptyAnalysisSelection(), camera),
      )
      return
    }

    if (
      selection.administrationCode &&
      administrations.length > 0 &&
      !administrations.some(
        item =>
          String(item.administrationCode) === selection.administrationCode,
      )
    ) {
      const next = selectAnalysisValue(selection, 'administration', '')
      router.replace(createAnalysisExplorerHref(next, camera))
      return
    }

    if (
      selection.commercialCode &&
      commercials.length > 0 &&
      !commercials.some(
        item => String(item.commercialCode) === selection.commercialCode,
      )
    ) {
      const next = selectAnalysisValue(selection, 'commercial', '')
      router.replace(createAnalysisExplorerHref(next, camera))
      return
    }

    if (
      selection.serviceCode &&
      services.length > 0 &&
      !services.some(item => String(item.serviceCode) === selection.serviceCode)
    ) {
      const next = selectAnalysisValue(selection, 'service', '')
      router.replace(createAnalysisExplorerHref(next, camera))
    }
  }, [
    administrations,
    camera,
    commercials,
    districts,
    router,
    selection,
    services,
  ])

  // 후보 배열은 쿼리 데이터에만 의존하도록 memo 한다. 호버(previewedCode)로
  // 페이지가 리렌더돼도 참조가 유지돼야 memo된 선택 패널이 리렌더되지 않는다.
  const districtCandidates: AnalysisCandidate[] = useMemo(
    () =>
      districts.flatMap(item =>
        item.districtCode && item.districtName
          ? [{ code: String(item.districtCode), name: item.districtName }]
          : [],
      ),
    [districts],
  )
  const administrationCandidates: AnalysisCandidate[] = useMemo(
    () =>
      administrations.map((item: AdministrationArea) => ({
        code: String(item.administrationCode),
        name: item.administrationName,
      })),
    [administrations],
  )
  const commercialCandidates: AnalysisCandidate[] = useMemo(
    () =>
      commercials.map((item: CommercialArea) => ({
        code: String(item.commercialCode),
        name: item.commercialName,
        description: item.commercialClassificationName,
      })),
    [commercials],
  )
  const serviceCandidates: AnalysisCandidate[] = useMemo(
    () =>
      services.flatMap((item: CommercialServiceCategory) =>
        item.serviceCode && item.serviceName
          ? [
              {
                code: item.serviceCode,
                name: item.serviceName,
                description: item.serviceType?.name,
              },
            ]
          : [],
      ),
    [services],
  )

  const candidatesByStep: Record<AnalysisStep, AnalysisCandidate[]> = {
    district: districtCandidates,
    administration: administrationCandidates,
    commercial: commercialCandidates,
    service: serviceCandidates,
  }
  const queryByStep = {
    district: districtsQuery,
    administration: administrationsQuery,
    commercial: commercialsQuery,
    service: servicesQuery,
  }
  const activeQuery = queryByStep[activeStep]
  const activeCandidates = candidatesByStep[activeStep]
  const activeStatus = getAnalysisQueryStatus({
    isPending: activeQuery.isPending,
    isError: activeQuery.isError,
    isSuccessResponse: isApiSuccess(
      activeQuery.data as ApiResponse<unknown> | undefined,
    ),
    itemCount: activeCandidates.length,
  })
  // 패널은 memo라 매 렌더 새 오류 객체를 만들면 비교가 깨진다. 원인이 바뀔 때만 만든다.
  const { data: activeQueryData, error: activeQueryError } = activeQuery
  const activeError = useMemo(
    () => resolveApiError({ data: activeQueryData, error: activeQueryError }),
    [activeQueryData, activeQueryError],
  )

  const selectedNames: Partial<Record<AnalysisStep, string>> = useMemo(
    () => ({
      district: districtCandidates.find(
        item => item.code === selection.districtCode,
      )?.name,
      administration: administrationCandidates.find(
        item => item.code === selection.administrationCode,
      )?.name,
      commercial: commercialCandidates.find(
        item => item.code === selection.commercialCode,
      )?.name,
      service: serviceCandidates.find(
        item => item.code === selection.serviceCode,
      )?.name,
    }),
    [
      districtCandidates,
      administrationCandidates,
      commercialCandidates,
      serviceCandidates,
      selection,
    ],
  )
  const selectionSummary =
    ANALYSIS_STEPS.map(step => selectedNames[step])
      .filter(Boolean)
      .join(' · ') || '서울 전체'

  /*
   * 레벨명: 선택 패널이 아는 이름을 재사용(없으면 코드 fallback).
   *
   * `AiReportLevel` 에는 `comparison` 도 있지만 이 화면은 그것을 만들지 않는다
   * (비교는 `/recommend/compare` 소관이고 대상이 둘이라 이름 하나로 안 된다).
   * 그래서 선택 단계에 있는 레벨일 때만 이름표를 찾는다.
   */
  const namedLevel =
    aiLevel === 'district' ||
    aiLevel === 'administration' ||
    aiLevel === 'commercial'
      ? aiLevel
      : null
  const aiTargetName =
    (namedLevel ? selectedNames[namedLevel] : undefined) ?? aiCode ?? ''

  // 로그인 사용자는 카드→패널 흐름을, 비로그인은 잠금 카드(CTA)를 노출한다.
  const {
    showCard: showAiCard,
    showLockCard: showAiLockCard,
    showPanel: showAiPanel,
  } = resolveAiReportVisibility({
    hydrated: hasHydrated,
    isLoggedIn,
    levelKey: aiLevelKey,
    panelOpen: aiPanelOpen,
  })

  const mapAreas =
    mapLayer === 'district'
      ? allDistrictAreas
      : mapLayer === 'administration'
        ? allAdministrationAreas
        : allCommercialAreas
  const mapSelectedCode =
    mapLayer === 'district'
      ? selection.districtCode
      : mapLayer === 'administration'
        ? selection.administrationCode
        : selection.commercialCode
  const activeMapQuery =
    mapLayer === 'district'
      ? districtMapQuery
      : mapLayer === 'administration'
        ? administrationMapQuery
        : commercialMapQuery
  const mapNotice =
    activeMapQuery.isError ||
    (activeMapQuery.data && !isApiSuccess(activeMapQuery.data))
      ? '지도 영역을 불러오지 못했어요. 목록에서는 계속 선택할 수 있어요.'
      : activeMapQuery.data &&
          isApiSuccess(activeMapQuery.data) &&
          mapAreas.length === 0
        ? '표시할 지도 영역이 없어요. 목록에서 지역을 선택해 주세요.'
        : null

  const handleSelect = useCallback(
    (step: AnalysisStep, code: string) => {
      const next = selectAnalysisValue(selection, step, code)
      router.replace(createAnalysisExplorerHref(next, camera))
      setRequestedStep(getNextStep(step))
      setPreviewedCode(null)
    },
    [camera, selection, router],
  )

  const handleMapSelect = (code: string) => {
    if (mapLayer === 'district') {
      const next = selectAnalysisValue(selection, 'district', code)
      router.replace(createAnalysisExplorerHref(next, camera))
      setRequestedStep('administration')
      setPreviewedCode(null)
      requestFit(code, ADMINISTRATION_ZOOM_LEVEL)
      return
    }
    if (mapLayer === 'administration') {
      const next = selectAdministrationWithParent(selection, code)
      router.replace(createAnalysisExplorerHref(next, camera))
      setRequestedStep('commercial')
      setPreviewedCode(null)
      requestFit(code, COMMERCIAL_ZOOM_LEVEL)
      return
    }
    // commercial (leaf): resolve parents, focus 업종, no fit
    const clicked = allCommercialAreas.find(
      area => String(area.areaCode) === code,
    )
    const admin = clicked
      ? findContainingArea(
          { lng: clicked.centerLng, lat: clicked.centerLat },
          allAdministrationAreas,
        )
      : null
    const next = admin
      ? selectCommercialWithParents(selection, {
          commercialCode: code,
          administrationCode: String(admin.areaCode),
        })
      : selectAnalysisValue(selection, 'commercial', code)
    router.replace(createAnalysisExplorerHref(next, camera))
    setRequestedStep('service')
    setPreviewedCode(null)
    // 상권 선택 완료 → 다음은 업종 선택. 모바일 시트를 펼쳐 선택을 유도한다.
    setSheetExpandSignal(signal => signal + 1)
  }

  const handlePanelSelect = useCallback(
    (code: string) => {
      handleSelect(activeStep, code)
      const level = PANEL_FIT_LEVEL_BY_STEP[activeStep]
      if (level !== null) requestFit(code, level)
    },
    [handleSelect, activeStep, requestFit],
  )

  // 패널 재시도/제출 콜백 안정화. activeQuery는 매 렌더 새 객체라 latest-ref로 참조.
  const activeQueryRef = useRef(activeQuery)
  useEffect(() => {
    activeQueryRef.current = activeQuery
  }, [activeQuery])
  const handlePanelRetry = useCallback(
    () => void activeQueryRef.current.refetch(),
    [],
  )
  /**
   * 결과 레이어 열기. 히스토리 정책상 **유일한 `push`** 다 — 브라우저 뒤로가기로
   * 자연스럽게 닫히게 하기 위해서다(D5). 셸이 직접 push 했음을 ref 에 남겨,
   * 닫기가 `back()` 을 쓸 수 있는지 판정한다(D4-5).
   */
  const handlePanelSubmit = useCallback(() => {
    openedByPushRef.current = true
    router.push(createAnalysisResultHref(selection, 'summary', camera))
  }, [camera, router, selection])

  // 모바일 시트: 데스크탑의 카드→패널 게이팅과 달리, 리포트가 가용한 레벨(aiLevelKey)
  // 이면 진입 칩을 노출하고 리포트 뷰에서 AiReportBody를 직접 렌더한다(미인증 잠금은
  // AiReportBody 내부 인사이트 섹션의 로그인 CTA가 담당).
  const mobileAiReport = aiLevelKey
    ? {
        title: `${aiTargetName} AI 리포트`,
        content: <AiReportBody selection={selection} variant="compact" />,
      }
    : null

  const panel = (
    <AnalysisSelectionPanel
      activeStep={activeStep}
      selection={selection}
      selectedNames={selectedNames}
      items={activeCandidates}
      status={activeStatus}
      error={activeError}
      onStepChange={setRequestedStep}
      onSelect={handlePanelSelect}
      onPreviewChange={setPreviewedCode}
      onRetry={handlePanelRetry}
      onSubmit={handlePanelSubmit}
    />
  )
  // 모바일 시트 전용: 데스크탑 panel과 동일한 props를 참조 동일성 유지한 채
  // variant="sheet"만 추가한다(memo 비교 대상 콜백은 데스크탑과 동일 참조).
  const sheetPanel = (
    <AnalysisSelectionPanel
      activeStep={activeStep}
      selection={selection}
      selectedNames={selectedNames}
      items={activeCandidates}
      status={activeStatus}
      error={activeError}
      onStepChange={setRequestedStep}
      onSelect={handlePanelSelect}
      onPreviewChange={setPreviewedCode}
      onRetry={handlePanelRetry}
      onSubmit={handlePanelSubmit}
      variant="sheet"
    />
  )

  const shellContext = useMemo(
    () => ({ camera, closeResultLayer }),
    [camera, closeResultLayer],
  )

  return (
    <AnalysisMapShellProvider value={shellContext}>
      <AnalysisExplorerSurface
        inert={resultOpen}
        desktopPanel={panel}
        map={
          shouldMountMap ? (
            <AnalysisMap
              activeStep={mapLayer}
              areas={mapAreas}
              selectedCode={mapSelectedCode}
              previewedCode={
                activeStep === 'service'
                  ? selection.commercialCode
                  : previewedCode
              }
              onSelect={handleMapSelect}
              onPreviewChange={setPreviewedCode}
              onCameraSettle={handleCameraSettle}
              initialCamera={initialCamera}
              camera={urlCamera}
              fitTo={fitRequest}
            />
          ) : null
        }
        mapNotice={shouldMountMap ? mapNotice : null}
        aiReportCard={
          showAiCard && aiLevelKey ? (
            <AiReportCard targetName={aiTargetName} onOpen={handleAiCardOpen} />
          ) : showAiLockCard && aiLevel ? (
            <AiReportLockCard level={aiLevel} loginHref={aiLoginHref} />
          ) : null
        }
        aiReportPanel={
          showAiPanel ? (
            <AiReportPanel
              targetName={aiTargetName}
              selection={selection}
              onClose={() => setAiPanelOpen(false)}
            />
          ) : null
        }
        mobilePanel={
          <AnalysisMobileSheet
            stepLabel={`${ANALYSIS_STEP_LABELS[activeStep]} 선택`}
            summary={selectionSummary}
            aiReport={mobileAiReport}
            expandSignal={sheetExpandSignal}
          >
            {sheetPanel}
          </AnalysisMobileSheet>
        }
      />
      {/* 결과 레이어 슬롯. `/analysis` 는 null, `/analysis/result` 는 결과 레이어다. */}
      {children}
    </AnalysisMapShellProvider>
  )
}

/**
 * 지도 셸. `(map-shell)` 라우트 그룹의 레이아웃이 `/analysis` 와 `/analysis/result`
 * **두 라우트만** 이 셸로 감싼다. `analysis/layout.tsx` 에 올리면
 * `/analysis/report`·`/analysis/simulation/**` 까지 지도가 깔린다(D6).
 */
export default function AnalysisMapShell({
  children,
}: {
  children?: ReactNode
}) {
  return (
    <Suspense
      fallback={
        <main
          data-hide-footer="true"
          aria-label="상권 분석 화면 준비 중"
          role="status"
        />
      }
    >
      <AnalysisMapShellBody>{children}</AnalysisMapShellBody>
    </Suspense>
  )
}
