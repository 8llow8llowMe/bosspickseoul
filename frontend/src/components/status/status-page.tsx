'use client'

import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import styled from 'styled-components'
import { fetchStatusDetail, fetchStatusTopTen } from '@/lib/api/status'
import { getApiMessage, isApiSuccess } from '@/lib/api/response'
import { normalizeStatusTopTen } from '@/lib/status/status-adapter'
import {
  canCollapseStatusSheetFromMap,
  createCollapsedStatusSheetState,
  createStatusHref,
  createStatusQuery,
  isStatusSheetSingleSnap,
  normalizeStatusSelection,
  parseStatusMetric,
  type StatusSheetState,
} from '@/lib/status/status-state'
import StatusDetail from './status-detail'
import StatusFeedback from './status-feedback'
import StatusMap from './status-map'
import StatusMetricTabs from './status-metric-tabs'
import StatusMobileSheet from './status-mobile-sheet'
import StatusTopTen from './status-top-ten'

const METRIC_TAB_ID_BASE = 'status-metric-tab'
const METRIC_PANEL_ID = 'status-metric-content'
const DETAIL_ERROR_MESSAGE =
  '선택한 자치구의 상세 현황을 불러오지 못했습니다. 다시 시도해 주세요.'
const DEFAULT_SITE_HEADER_HEIGHT = 64

const Page = styled.main`
  width: 100%;
  padding: 40px 0 72px;

  @media (max-width: 1023px) {
    padding: 24px 0 0;
  }
`

const PageInner = styled.div`
  width: min(1400px, calc(100% - 48px));
  margin: 0 auto;
  display: grid;
  gap: 24px;

  @media (max-width: 1023px) {
    width: min(100%, calc(100% - 32px));
    gap: 16px;
  }
`

const Hero = styled.header`
  display: grid;
  gap: 10px;
`

const Eyebrow = styled.p`
  color: var(--color-text-600);
  font-size: 13px;
  font-weight: 700;
`

const HeroTitle = styled.h1`
  color: var(--color-text-900);
  font-size: clamp(26px, 3vw, 36px);
  font-weight: 800;
  line-height: 1.25;
  letter-spacing: -0.02em;
  word-break: keep-all;
`

const HeroDescription = styled.p`
  max-width: 680px;
  color: var(--color-text-600);
  font-size: 15px;
  line-height: 24px;
  word-break: keep-all;
`

const TabsSurface = styled.div`
  padding: 12px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  box-shadow: var(--shadow-level-1);
`

const MetricPanel = styled.section`
  min-width: 0;
`

const DesktopGrid = styled.div`
  --status-side-track: 280px;

  display: grid;
  grid-template-columns: var(--status-side-track) minmax(0, 1fr);
  align-items: start;
  gap: 20px;

  @media (max-width: 1023px) {
    display: none;
  }
`

const DesktopContent = styled.div`
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(0, 0px) minmax(360px, 1fr);
  align-items: start;
  column-gap: 0;
  transition:
    grid-template-columns var(--motion-standard) var(--ease-standard),
    column-gap var(--motion-standard) var(--ease-standard);

  &[data-has-selection='true'] {
    grid-template-columns: minmax(0, var(--status-side-track)) minmax(
        360px,
        1fr
      );
    column-gap: 20px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

const DesktopDetailSlot = styled.div`
  min-width: 0;
  overflow: hidden;
  opacity: 0;
  pointer-events: none;
  transform: translateX(-16px);
  transition:
    opacity var(--motion-standard) var(--ease-standard),
    transform var(--motion-standard) var(--ease-standard);

  &[data-has-selection='true'] {
    opacity: 1;
    pointer-events: auto;
    transform: translateX(0);
  }

  & > article {
    width: var(--status-side-track);
    min-width: var(--status-side-track);
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

const DesktopPanel = styled.section`
  min-width: 0;
  padding: 20px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  box-shadow: var(--shadow-level-1);
`

const MapPanel = styled(DesktopPanel)`
  display: grid;
  gap: 16px;
`

const MapHeading = styled.div`
  display: grid;
  gap: 6px;
`

const MapTitle = styled.h2`
  color: var(--color-text-900);
  font-size: 20px;
  font-weight: 700;
  line-height: 28px;
`

const MapDescription = styled.p`
  color: var(--color-text-600);
  font-size: 14px;
  line-height: 22px;
  word-break: keep-all;
`

const MobileStage = styled.section<{ $headerHeight: number }>`
  display: none;

  @media (max-width: 1023px) {
    position: relative;
    width: calc(100% + 32px);
    height: max(0px, calc(100dvh - ${props => props.$headerHeight}px));
    display: block;
    overflow: hidden;
    margin-left: -16px;
    border-top: 1px solid var(--color-border-200);
    background: var(--color-surface-muted);
  }
`

const MobileMapLayer = styled.div`
  position: absolute;
  inset: 0;
  min-height: 0;
  padding: 16px 16px 24px;

  > figure {
    height: 100%;
    grid-template-rows: minmax(0, 1fr) auto;
  }

  > figure > div {
    height: 100%;
    aspect-ratio: auto;
  }
`

function StatusPageContent() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const rawSearchParams = searchParams.toString()
  const metric = parseStatusMetric(searchParams.get('metric'))
  const requestedDistrictCode = searchParams.get('district')
  const mobileStageRef = useRef<HTMLElement>(null)
  const [siteHeaderHeight, setSiteHeaderHeight] = useState(
    DEFAULT_SITE_HEADER_HEIGHT,
  )
  const [mobileStageHeight, setMobileStageHeight] = useState(0)
  const [sheetState, setSheetState] = useState<StatusSheetState>({
    districtCode: null,
    snap: 'collapsed',
  })

  const topTenQuery = useQuery({
    queryKey: ['status', 'topTen'],
    queryFn: fetchStatusTopTen,
  })

  const topTen = useMemo(() => {
    if (!topTenQuery.data || !isApiSuccess(topTenQuery.data)) {
      return null
    }

    return normalizeStatusTopTen(topTenQuery.data.dataBody)
  }, [topTenQuery.data])

  const currentItems = topTen?.[metric] ?? []
  const selectedDistrictCode = topTen
    ? normalizeStatusSelection(
        requestedDistrictCode,
        currentItems.map(item => item.districtCode),
      )
    : null
  const selectedItem =
    currentItems.find(item => item.districtCode === selectedDistrictCode) ??
    null
  const sheetSnap =
    sheetState.districtCode === selectedDistrictCode
      ? sheetState.snap
      : selectedDistrictCode
        ? 'expanded'
        : 'collapsed'

  const detailQuery = useQuery({
    queryKey: ['status', 'detail', selectedDistrictCode],
    queryFn: () => {
      if (!selectedDistrictCode) {
        throw new Error('선택한 자치구가 없습니다.')
      }

      return fetchStatusDetail(selectedDistrictCode)
    },
    enabled: selectedDistrictCode !== null,
  })

  const detail =
    detailQuery.data && isApiSuccess(detailQuery.data)
      ? detailQuery.data.dataBody
      : null
  const detailErrorMessage = detailQuery.isError
    ? DETAIL_ERROR_MESSAGE
    : detailQuery.data && !isApiSuccess(detailQuery.data)
      ? getApiMessage(detailQuery.data, DETAIL_ERROR_MESSAGE)
      : null
  const isDetailLoading =
    detailQuery.isPending ||
    (detailErrorMessage !== null && detailQuery.isFetching)
  const isSingleSnap = isStatusSheetSingleSnap(mobileStageHeight)

  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') {
      return
    }

    const siteHeader = document.querySelector<HTMLElement>('[data-site-header]')

    if (!siteHeader) {
      return
    }

    const observer = new ResizeObserver(() => {
      const measuredHeight = Math.round(
        siteHeader.getBoundingClientRect().height,
      )

      setSiteHeaderHeight(
        measuredHeight > 0 ? measuredHeight : DEFAULT_SITE_HEADER_HEIGHT,
      )
    })

    observer.observe(siteHeader)

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!topTen) {
      return
    }

    const mobileStage = mobileStageRef.current

    if (!mobileStage) {
      return
    }

    if (typeof ResizeObserver === 'undefined') {
      const frame = window.requestAnimationFrame(() => {
        setMobileStageHeight(mobileStage.clientHeight)
      })

      return () => window.cancelAnimationFrame(frame)
    }

    const observer = new ResizeObserver(() => {
      setMobileStageHeight(mobileStage.clientHeight)
    })

    observer.observe(mobileStage)

    return () => observer.disconnect()
  }, [topTen])

  useEffect(() => {
    const currentQuery = new URLSearchParams(rawSearchParams)
    const districtCode = topTen
      ? selectedDistrictCode
      : currentQuery.get('district')
    const normalizedQuery = createStatusQuery(
      currentQuery,
      metric,
      districtCode,
    )

    if (normalizedQuery.toString() === rawSearchParams) {
      return
    }

    router.replace(
      createStatusHref(pathname, normalizedQuery, window.location.hash),
      {
        scroll: false,
      },
    )
  }, [metric, pathname, rawSearchParams, router, selectedDistrictCode, topTen])

  const pushStatusQuery = (
    nextMetric: typeof metric,
    districtCode: string | null,
  ) => {
    const nextQuery = createStatusQuery(
      new URLSearchParams(rawSearchParams),
      nextMetric,
      districtCode,
    )

    router.push(createStatusHref(pathname, nextQuery, window.location.hash), {
      scroll: false,
    })
  }

  const handleMetricChange = (nextMetric: typeof metric) => {
    if (nextMetric === metric) {
      return
    }

    setSheetState({ districtCode: null, snap: 'collapsed' })
    pushStatusQuery(nextMetric, null)
  }

  const handleDistrictSelect = (districtCode: string) => {
    setSheetState({ districtCode, snap: 'expanded' })

    if (districtCode === selectedDistrictCode) {
      return
    }

    pushStatusQuery(metric, districtCode)
  }

  const handleClearDistrict = () => {
    setSheetState({ districtCode: null, snap: 'collapsed' })
    pushStatusQuery(metric, null)
  }

  const handleMapBackgroundClick = () => {
    setSheetState(createCollapsedStatusSheetState(selectedDistrictCode))
  }

  if (!topTen) {
    const isLoading = topTenQuery.isPending || topTenQuery.isFetching

    return (
      <Page>
        <PageInner>
          <Hero>
            <Eyebrow>서울 구별 상권</Eyebrow>
            <HeroTitle>자치구별 상권 흐름을 비교해 보세요</HeroTitle>
            <HeroDescription>
              유동인구, 매출, 개업, 폐업 지표의 상위 자치구와 상세 현황을
              한곳에서 확인할 수 있습니다.
            </HeroDescription>
          </Hero>
          {isLoading ? (
            <StatusFeedback state="loading" />
          ) : (
            <StatusFeedback
              message={
                topTenQuery.isError
                  ? '구별 상권 현황을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'
                  : getApiMessage(
                      topTenQuery.data,
                      '구별 상권 현황을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.',
                    )
              }
              state="error"
              onRetry={() => void topTenQuery.refetch()}
            />
          )}
        </PageInner>
      </Page>
    )
  }

  return (
    <Page>
      <PageInner>
        <Hero>
          <Eyebrow>서울 구별 상권</Eyebrow>
          <HeroTitle>자치구별 상권 흐름을 비교해 보세요</HeroTitle>
          <HeroDescription>
            유동인구, 매출, 개업, 폐업 지표의 상위 자치구와 상세 현황을 한곳에서
            확인할 수 있습니다.
          </HeroDescription>
        </Hero>

        <TabsSurface>
          <StatusMetricTabs
            idBase={METRIC_TAB_ID_BASE}
            panelId={METRIC_PANEL_ID}
            value={metric}
            onChange={handleMetricChange}
          />
        </TabsSurface>

        <MetricPanel
          aria-labelledby={`${METRIC_TAB_ID_BASE}-${metric}`}
          id={METRIC_PANEL_ID}
          role="tabpanel"
        >
          <DesktopGrid>
            <DesktopPanel>
              <StatusTopTen
                items={currentItems}
                metric={metric}
                selectedDistrictCode={selectedDistrictCode}
                onSelect={handleDistrictSelect}
              />
            </DesktopPanel>

            <DesktopContent data-has-selection={selectedItem !== null}>
              <DesktopDetailSlot data-has-selection={selectedItem !== null}>
                {selectedItem ? (
                  <StatusDetail
                    detail={detail}
                    errorMessage={detailErrorMessage}
                    isLoading={isDetailLoading}
                    metric={metric}
                    selectedItem={selectedItem}
                    onClose={handleClearDistrict}
                    onRetry={() => void detailQuery.refetch()}
                  />
                ) : null}
              </DesktopDetailSlot>

              <MapPanel>
                <MapHeading>
                  <MapTitle>서울 자치구 지도</MapTitle>
                  <MapDescription>
                    현재 상위 10개 자치구의 위치와 순위를 지도에서 비교할 수
                    있습니다.
                  </MapDescription>
                </MapHeading>
                <StatusMap
                  items={currentItems}
                  metric={metric}
                  selectedDistrictCode={selectedDistrictCode}
                  onSelect={handleDistrictSelect}
                />
              </MapPanel>
            </DesktopContent>
          </DesktopGrid>

          <MobileStage
            ref={mobileStageRef}
            $headerHeight={siteHeaderHeight}
            aria-label="서울 자치구 현황 지도와 상세 정보"
          >
            <MobileMapLayer>
              <StatusMap
                items={currentItems}
                metric={metric}
                selectedDistrictCode={selectedDistrictCode}
                onBackgroundClick={
                  canCollapseStatusSheetFromMap(isSingleSnap, sheetSnap)
                    ? handleMapBackgroundClick
                    : undefined
                }
                onSelect={handleDistrictSelect}
              />
            </MobileMapLayer>
            <StatusMobileSheet
              detail={detail}
              detailErrorMessage={detailErrorMessage}
              isDetailLoading={isDetailLoading}
              isSingleSnap={isSingleSnap}
              items={currentItems}
              metric={metric}
              selectedItem={selectedItem}
              snap={sheetSnap}
              onBackToTopTen={handleClearDistrict}
              onRetryDetail={() => void detailQuery.refetch()}
              onSelect={handleDistrictSelect}
              onSnapChange={snap =>
                setSheetState({ districtCode: selectedDistrictCode, snap })
              }
            />
          </MobileStage>
        </MetricPanel>
      </PageInner>
    </Page>
  )
}

function StatusPageFallback() {
  return (
    <Page>
      <PageInner>
        <StatusFeedback state="loading" />
      </PageInner>
    </Page>
  )
}

export default function StatusPage() {
  return (
    <Suspense fallback={<StatusPageFallback />}>
      <StatusPageContent />
    </Suspense>
  )
}
