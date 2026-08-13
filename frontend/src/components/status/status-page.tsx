'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import styled from 'styled-components'
import { fetchStatusDetail, fetchStatusTopTen } from '@/lib/api/status'
import { getApiMessage, isApiSuccess } from '@/lib/api/response'
import { normalizeStatusTopTen } from '@/lib/status/status-adapter'
import {
  createStatusHref,
  createStatusQuery,
  getNextSheetSnap,
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
// 구별현황은 한 화면(100dvh - 헤더 65px)에 들어오도록 세로 flex로 구성하고,
// 지도/리스트가 남는 높이를 채우며 긴 패널은 내부 스크롤로 처리한다.
const Page = styled.main`
  width: 100%;
  height: calc(100dvh - 65px);
  padding: 20px 0 24px;
  display: flex;
  flex-direction: column;

  @media (max-width: 1023px) {
    padding: 16px 0 20px;
  }

  @media (max-width: 767px) {
    padding: 12px 0 0;
  }
`

const PageInner = styled.div`
  width: min(1400px, calc(100% - 48px));
  height: 100%;
  min-height: 0;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 14px;

  @media (max-width: 1023px) {
    width: min(100%, calc(100% - 32px));
    gap: 12px;
  }
`

const Hero = styled.header`
  display: grid;
  gap: 4px;
`

const Eyebrow = styled.p`
  color: var(--color-text-600);
  font-size: 13px;
  font-weight: 700;
`

const HeroTitle = styled.h1`
  color: var(--color-text-900);
  font-size: clamp(20px, 2.2vw, 28px);
  font-weight: 800;
  line-height: 1.2;
  letter-spacing: -0.02em;
  word-break: keep-all;
`

// 설명은 세로 공간을 아끼기 위해 데스크톱에서만 노출한다(태블릿·모바일 숨김).
const HeroDescription = styled.p`
  max-width: 680px;
  color: var(--color-text-600);
  font-size: 14px;
  line-height: 21px;
  word-break: keep-all;

  @media (max-width: 1023px) {
    display: none;
  }
`

const TabsSurface = styled.div`
  padding: 6px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);
`

const MetricPanel = styled.section`
  min-width: 0;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
`

const DesktopGrid = styled.div`
  --status-side-track: 280px;

  height: 100%;
  min-height: 0;
  display: grid;
  grid-template-columns: var(--status-side-track) minmax(0, 1fr);
  align-items: stretch;
  gap: 20px;

  /* 태블릿(768~1023): 간격만 줄이고 리스트 폭(280)은 유지해 값이 잘리지 않게 한다. */
  @media (max-width: 1023px) {
    gap: 16px;
  }

  /* 모바일(<768)에서만 바텀시트(MobileStage)로 전환한다. */
  @media (max-width: 767px) {
    display: none;
  }
`

// 우측 영역은 단일 열에서 지도↔상세를 토글한다: 선택이 없으면 지도, 자치구를
// 선택하면 같은 자리에 상세 카드를 전체 폭으로 보여준다(리스트는 좌측 고정).
const DesktopContent = styled.div`
  min-width: 0;
  min-height: 0;
  height: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr);
  align-items: stretch;

  &[data-has-selection='true'] [data-status-map-panel] {
    display: none;
  }

  &:not([data-has-selection='true']) [data-status-detail-slot] {
    display: none;
  }
`

const DesktopDetailSlot = styled.div`
  min-width: 0;
  min-height: 0;
  overflow: hidden;

  /* 상세는 전체 폭을 쓰고, 남는 높이 안에서 내부 스크롤(스크롤바 숨김). */
  & > article {
    width: 100%;
    min-width: 0;
    max-height: 100%;
    overflow-y: auto;
    scrollbar-width: none;

    &::-webkit-scrollbar {
      display: none;
    }
  }
`

const DesktopPanel = styled.section`
  min-width: 0;
  min-height: 0;
  padding: 16px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  box-shadow: var(--shadow-level-1);
  overflow-y: auto;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
`

// 지도 패널은 스크롤 없이 남는 높이를 지도로 채운다(폴리곤만 배치).
const MapPanel = styled(DesktopPanel)`
  display: grid;
  grid-template-rows: minmax(0, 1fr);
  overflow: hidden;

  > figure {
    min-height: 0;
    height: 100%;
    grid-template-rows: minmax(0, 1fr);
  }

  > figure > div {
    height: 100%;
    aspect-ratio: auto;
  }
`

const MobileStage = styled.section`
  display: none;

  /* 모바일(<768)에서만 지도+바텀시트 스테이지를 사용한다. 태블릿 이상은
     DesktopGrid의 2단(리스트+지도/상세)로 처리한다. */
  @media (max-width: 767px) {
    position: relative;
    /* 남는 세로 공간을 지도+시트가 모두 채워 하단 빈 공간을 없앤다. */
    flex: 1;
    min-height: 0;
    width: calc(100% + 32px);
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
  padding: 12px;
  display: grid;
  /* 지도를 스테이지 상단(탭 바로 아래)에 붙여, 빈 공간이 지도 위가 아니라
     시트가 올라오는 하단 쪽에 모이게 한다. */
  align-content: start;

  > figure {
    min-height: 0;
    height: auto;
  }

  > figure > div {
    height: auto;
    max-height: 100%;
    aspect-ratio: 800 / 620;
  }

  /* 모바일 스테이지에서는 캡션을 숨겨(순위 배지로 충분) 지도 몫을 넓힌다. */
  > figure > figcaption {
    display: none;
  }
`

function StatusPageContent() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const rawSearchParams = searchParams.toString()
  const metric = parseStatusMetric(searchParams.get('metric'))
  const requestedDistrictCode = searchParams.get('district')
  // 지도는 상단 정렬로 항상 보이고, 시트는 기본 '펼침'으로 하단을 Top10 리스트가
  // 채우게 한다(빈 공간 제거). 지도 몫(MINIMUM_MAP_HEIGHT)이 확보돼 가리지 않는다.
  const [sheetState, setSheetState] = useState<StatusSheetState>({
    districtCode: null,
    snap: 'expanded',
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
      : 'expanded'

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

    setSheetState({ districtCode: null, snap: 'expanded' })
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
    setSheetState({ districtCode: null, snap: 'expanded' })
    pushStatusQuery(metric, null)
  }

  const handleMapBackgroundClick = () => {
    setSheetState({
      districtCode: selectedDistrictCode,
      snap: getNextSheetSnap(
        sheetSnap,
        sheetSnap === 'collapsed' ? 'expand' : 'collapse',
      ),
    })
  }

  if (!topTen) {
    const isLoading = topTenQuery.isPending || topTenQuery.isFetching

    return (
      <Page data-hide-footer="true">
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
    <Page data-hide-footer="true">
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
              <DesktopDetailSlot
                data-has-selection={selectedItem !== null}
                data-status-detail-slot
              >
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

              <MapPanel data-status-map-panel>
                <StatusMap
                  items={currentItems}
                  metric={metric}
                  selectedDistrictCode={selectedDistrictCode}
                  onSelect={handleDistrictSelect}
                />
              </MapPanel>
            </DesktopContent>
          </DesktopGrid>

          <MobileStage aria-label="서울 자치구 현황 지도와 상세 정보">
            <MobileMapLayer>
              <StatusMap
                items={currentItems}
                metric={metric}
                selectedDistrictCode={selectedDistrictCode}
                backgroundAction={
                  sheetSnap === 'collapsed' ? 'expand' : 'collapse'
                }
                onBackgroundClick={handleMapBackgroundClick}
                onSelect={handleDistrictSelect}
              />
            </MobileMapLayer>
            <StatusMobileSheet
              detail={detail}
              detailErrorMessage={detailErrorMessage}
              isDetailLoading={isDetailLoading}
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
    <Page data-hide-footer="true">
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
