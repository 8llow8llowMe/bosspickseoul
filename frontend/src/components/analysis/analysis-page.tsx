'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import styled from 'styled-components'

import AnalysisMap from '@/components/analysis/analysis-map'
import AnalysisMobileSheet from '@/components/analysis/analysis-mobile-sheet'
import AnalysisSelectionPanel, {
  ANALYSIS_STEP_LABELS,
  type AnalysisCandidate,
} from '@/components/analysis/analysis-selection-panel'
import AiReportCard from '@/components/analysis/ai-report/ai-report-card'
import AiReportPanel from '@/components/analysis/ai-report/ai-report-panel'
import { useAiReport } from '@/hooks/use-ai-report'
import {
  buildAiLevelKey,
  isAiReportActive,
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
  fetchCommercials,
  fetchDistrictMapAreas,
  SEOUL_MAP_BOUNDS,
} from '@/lib/api/recommend'
import { isApiSuccess } from '@/lib/api/response'
import {
  ANALYSIS_PERIOD_CODE,
  ANALYSIS_STEPS,
  createAnalysisExplorerHref,
  createAnalysisResultHref,
  getActiveAnalysisStep,
  isCompleteAnalysisSelection,
  parseAnalysisSelection,
  selectAdministrationWithParent,
  selectAnalysisValue,
  selectCommercialWithParents,
  type AnalysisStep,
} from '@/lib/analysis/selection'
import { type MapLayer } from '@/lib/analysis/map-layer'
import { findContainingArea } from '@/lib/map/geometry'
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
  height: calc(100dvh - 64px);
  min-height: 560px;
  overflow: hidden;
  background: var(--color-surface-muted);
`

const Layout = styled.div`
  height: 100%;
  display: grid;
  grid-template-columns: 380px minmax(0, 1fr);

  @media (max-width: 840px) {
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

  @media (max-width: 840px) {
    display: none;
  }
`

const MapArea = styled.div`
  position: relative;
  min-width: 0;
  min-height: 0;
  overflow: hidden;

  @media (max-width: 840px) {
    width: 100%;
    height: 100%;
  }
`

const MobilePanel = styled.div`
  display: none;

  @media (max-width: 840px) {
    display: contents;
  }
`

const AiReportCardSlot = styled.div`
  position: absolute;
  z-index: 7;
  top: 16px;
  left: 16px;
  max-width: min(320px, calc(100% - 32px));

  @media (max-width: 840px) {
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

  @media (max-width: 840px) {
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

export function AnalysisExplorerSurface({
  map,
  desktopPanel,
  mobilePanel,
  mapNotice,
  aiReportCard,
  aiReportPanel,
}: {
  map: ReactNode
  desktopPanel: ReactNode
  mobilePanel: ReactNode
  mapNotice?: ReactNode
  aiReportCard?: ReactNode
  aiReportPanel?: ReactNode
}) {
  return (
    <Page data-hide-footer="true">
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
const ADMINISTRATION_ZOOM_LEVEL = 6 // 자치구 선택 → 행정동이 보이는 depth
const COMMERCIAL_ZOOM_LEVEL = 4 // 행정동 선택 → 상권이 보이는 depth
const COMMERCIAL_FRAME_ZOOM_LEVEL = 3 // 상권 선택 → 상권을 좀 더 가깝게 프레임

const PANEL_FIT_LEVEL_BY_STEP: Record<AnalysisStep, number | null> = {
  district: ADMINISTRATION_ZOOM_LEVEL,
  administration: COMMERCIAL_ZOOM_LEVEL,
  commercial: COMMERCIAL_FRAME_ZOOM_LEVEL,
  service: null, // 업종은 지도 위치와 무관 → 이동 없음
}

export default function AnalysisPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const selection = useMemo(
    () => parseAnalysisSelection(searchParams),
    [searchParams],
  )
  const [requestedStep, setRequestedStep] = useState<AnalysisStep>(() =>
    getActiveAnalysisStep(selection),
  )
  const [previewedCode, setPreviewedCode] = useState<string | null>(null)
  const [viewportBounds, setViewportBounds] =
    useState<GeoBounds>(SEOUL_MAP_BOUNDS)
  const [mapLayer, setMapLayer] = useState<MapLayer>('district')
  const [fitRequest, setFitRequest] = useState<{
    code: string
    level: number
    seq: number
  } | null>(null)
  const requestFit = (code: string, level: number) =>
    setFitRequest(prev => ({ code, level, seq: (prev?.seq ?? 0) + 1 }))

  const hasHydrated = useAuthStore(state => state.hasHydrated)
  const isLoggedIn = useAuthStore(state => state.isLoggedIn)
  const aiEnabled = hasHydrated && isLoggedIn

  const aiLevel = resolveAiReportLevel(selection)
  const aiCode = aiLevel ? resolveAiReportTargetCode(selection, aiLevel) : null
  const aiLevelKey = buildAiLevelKey(aiLevel, aiCode)

  const [aiActiveKey, setAiActiveKey] = useState<string | null>(null)
  const [aiPanelOpen, setAiPanelOpen] = useState(false)
  const [prevAiLevelKey, setPrevAiLevelKey] = useState(aiLevelKey)

  // 선택 레벨/코드가 바뀌면 리셋(자동 조회 금지). 렌더 중 key 비교로 즉시 리셋하는
  // React 권장 패턴("Adjusting state when a prop changes")을 사용해 effect 기반
  // setState의 cascading render를 피한다.
  if (prevAiLevelKey !== aiLevelKey) {
    setPrevAiLevelKey(aiLevelKey)
    setAiActiveKey(null)
    setAiPanelOpen(false)
  }

  const aiActive = isAiReportActive(aiLevelKey, aiActiveKey)
  const { state: aiState, retry: aiRetry } = useAiReport({
    level: aiLevel,
    code: aiCode,
    active: aiActive,
    enabled: aiEnabled,
  })

  const districtsQuery = useQuery({
    queryKey: ['analysis', 'districts', ANALYSIS_PERIOD_CODE],
    queryFn: () => fetchDistricts(ANALYSIS_PERIOD_CODE),
    retry: 1,
  })
  const districtMapQuery = useQuery({
    queryKey: ['analysis', 'map', 'districts', viewportBounds],
    queryFn: () => fetchDistrictMapAreas(viewportBounds),
    retry: 1,
  })
  const administrationsQuery = useQuery({
    queryKey: ['analysis', 'administrations', selection.districtCode],
    queryFn: () => fetchAdministrations(selection.districtCode!),
    enabled: Boolean(selection.districtCode),
    retry: 1,
  })
  const administrationMapQuery = useQuery({
    queryKey: ['analysis', 'map', 'administrations', viewportBounds],
    queryFn: () => fetchAdministrationMapAreas(viewportBounds),
    enabled: mapLayer === 'administration' || mapLayer === 'commercial',
    retry: 1,
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
    retry: 1,
  })
  const commercialMapQuery = useQuery({
    queryKey: ['analysis', 'map', 'commercials', viewportBounds],
    queryFn: () => fetchCommercialMapAreas(viewportBounds),
    enabled: mapLayer === 'commercial',
    retry: 1,
  })
  const servicesQuery = useQuery({
    queryKey: ['analysis', 'services', selection.commercialCode],
    queryFn: () => fetchCommercialServiceCategories(selection.commercialCode!),
    enabled: Boolean(selection.commercialCode),
    retry: 1,
  })

  const districts = unwrapArray(districtsQuery.data)
  const allDistrictAreas = unwrapMapAreas(districtMapQuery.data)
  const administrations = unwrapArray(administrationsQuery.data)
  const allAdministrationAreas = unwrapMapAreas(administrationMapQuery.data)
  const commercials = unwrapArray(commercialsQuery.data)
  const allCommercialAreas = unwrapMapAreas(commercialMapQuery.data)
  const services = unwrapArray(servicesQuery.data)
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
      router.replace('/analysis')
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
      router.replace(createAnalysisExplorerHref(next))
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
      router.replace(createAnalysisExplorerHref(next))
      return
    }

    if (
      selection.serviceCode &&
      services.length > 0 &&
      !services.some(item => String(item.serviceCode) === selection.serviceCode)
    ) {
      const next = selectAnalysisValue(selection, 'service', '')
      router.replace(createAnalysisExplorerHref(next))
    }
  }, [administrations, commercials, districts, router, selection, services])

  const districtCandidates: AnalysisCandidate[] = districts.flatMap(item =>
    item.districtCode && item.districtName
      ? [{ code: String(item.districtCode), name: item.districtName }]
      : [],
  )
  const administrationCandidates: AnalysisCandidate[] = administrations.map(
    (item: AdministrationArea) => ({
      code: String(item.administrationCode),
      name: item.administrationName,
    }),
  )
  const commercialCandidates: AnalysisCandidate[] = commercials.map(
    (item: CommercialArea) => ({
      code: String(item.commercialCode),
      name: item.commercialName,
      description: item.commercialClassificationName,
    }),
  )
  const serviceCandidates: AnalysisCandidate[] = services.flatMap(
    (item: CommercialServiceCategory) =>
      item.serviceCode && item.serviceName
        ? [
            {
              code: item.serviceCode,
              name: item.serviceName,
              description: item.serviceType?.name,
            },
          ]
        : [],
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

  const selectedNames: Partial<Record<AnalysisStep, string>> = {
    district: districtCandidates.find(
      item => item.code === selection.districtCode,
    )?.name,
    administration: administrationCandidates.find(
      item => item.code === selection.administrationCode,
    )?.name,
    commercial: commercialCandidates.find(
      item => item.code === selection.commercialCode,
    )?.name,
    service: serviceCandidates.find(item => item.code === selection.serviceCode)
      ?.name,
  }
  const selectionSummary =
    ANALYSIS_STEPS.map(step => selectedNames[step])
      .filter(Boolean)
      .join(' · ') || '서울 전체'

  // 레벨명: 선택 패널이 아는 이름을 재사용(없으면 코드 fallback)
  const aiTargetName =
    (aiLevel ? selectedNames[aiLevel] : undefined) ?? aiCode ?? ''

  const openFullAnalysis = isCompleteAnalysisSelection(selection)
    ? () => router.push(createAnalysisResultHref(selection, 'summary'))
    : undefined

  const { showCard: showAiCard, showPanel: showAiPanel } =
    resolveAiReportVisibility({
      enabled: aiEnabled,
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

  const handleSelect = (step: AnalysisStep, code: string) => {
    const next = selectAnalysisValue(selection, step, code)
    router.replace(createAnalysisExplorerHref(next))
    setRequestedStep(getNextStep(step))
    setPreviewedCode(null)
  }

  const handleMapSelect = (code: string) => {
    if (mapLayer === 'district') {
      const next = selectAnalysisValue(selection, 'district', code)
      router.replace(createAnalysisExplorerHref(next))
      setRequestedStep('administration')
      setPreviewedCode(null)
      requestFit(code, ADMINISTRATION_ZOOM_LEVEL)
      return
    }
    if (mapLayer === 'administration') {
      const next = selectAdministrationWithParent(selection, code)
      router.replace(createAnalysisExplorerHref(next))
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
    router.replace(createAnalysisExplorerHref(next))
    setRequestedStep('service')
    setPreviewedCode(null)
  }

  const handlePanelSelect = (code: string) => {
    handleSelect(activeStep, code)
    const level = PANEL_FIT_LEVEL_BY_STEP[activeStep]
    if (level !== null) requestFit(code, level)
  }

  const mobileAiReportNode =
    showAiCard && aiLevelKey ? (
      <AiReportCard
        targetName={aiTargetName}
        onOpen={() => {
          setAiActiveKey(aiLevelKey)
          setAiPanelOpen(true)
        }}
      />
    ) : showAiPanel ? (
      <AiReportPanel
        targetName={aiTargetName}
        state={aiState}
        onClose={() => setAiPanelOpen(false)}
        onRetry={aiRetry}
        onViewFullAnalysis={openFullAnalysis}
      />
    ) : null

  const panel = (
    <AnalysisSelectionPanel
      activeStep={activeStep}
      selection={selection}
      selectedNames={selectedNames}
      items={activeCandidates}
      status={activeStatus}
      onStepChange={setRequestedStep}
      onSelect={handlePanelSelect}
      onPreviewChange={setPreviewedCode}
      onRetry={() => void activeQuery.refetch()}
      onSubmit={() =>
        router.push(createAnalysisResultHref(selection, 'summary'))
      }
    />
  )

  return (
    <AnalysisExplorerSurface
      desktopPanel={panel}
      map={
        <AnalysisMap
          activeStep={mapLayer}
          areas={mapAreas}
          selectedCode={mapSelectedCode}
          previewedCode={
            activeStep === 'service' ? selection.commercialCode : previewedCode
          }
          onSelect={handleMapSelect}
          onPreviewChange={setPreviewedCode}
          onViewportBoundsChange={setViewportBounds}
          onZoomLayerChange={setMapLayer}
          fitTo={fitRequest}
        />
      }
      mapNotice={mapNotice}
      aiReportCard={
        showAiCard && aiLevelKey ? (
          <AiReportCard
            targetName={aiTargetName}
            onOpen={() => {
              setAiActiveKey(aiLevelKey)
              setAiPanelOpen(true)
            }}
          />
        ) : null
      }
      aiReportPanel={
        showAiPanel ? (
          <AiReportPanel
            targetName={aiTargetName}
            state={aiState}
            onClose={() => setAiPanelOpen(false)}
            onRetry={aiRetry}
            onViewFullAnalysis={openFullAnalysis}
          />
        ) : null
      }
      mobilePanel={
        <AnalysisMobileSheet
          stepLabel={`${ANALYSIS_STEP_LABELS[activeStep]} 선택`}
          summary={selectionSummary}
          aiReportSlot={mobileAiReportNode}
        >
          {panel}
        </AnalysisMobileSheet>
      }
    />
  )
}
