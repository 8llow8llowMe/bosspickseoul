'use client'

import {
  Suspense,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import styled, { keyframes } from 'styled-components'
import { fetchStatusDetail, fetchStatusTopTen } from '@/lib/api/status'
import { resolveApiError, retryUnlessClientError } from '@/lib/api/api-error'
import { isApiSuccess } from '@/lib/api/response'
import {
  isStatusTopTenAllEmpty,
  normalizeStatusTopTen,
} from '@/lib/status/status-adapter'
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
import { shellWidth } from '@/styles/layout'

const METRIC_TAB_ID_BASE = 'status-metric-tab'
const METRIC_PANEL_ID = 'status-metric-content'
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
  ${shellWidth}
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;

  @media (max-width: 1023px) {
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
  font-size: 28px;
  font-weight: 700;
  line-height: 1.2;
  word-break: keep-all;

  @media (max-width: 640px) {
    font-size: 20px;
  }
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

const detailEnter = keyframes`
  from {
    opacity: 0;
    transform: translateX(-8px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
`

/*
 * 태블릿 이상은 좌측 열(순위 ↔ 상세) + 우측 지도 2단이다.
 *
 * 예전에는 자치구를 고르면 **지도 자리**가 상세로 바뀌었다. 방금 누른 폴리곤이 통째로
 * 사라져 어디를 골랐는지 맥락을 잃고, 다른 구로 옮기려면 닫고 다시 골라야 했다. 이제
 * 상세가 **순위 목록 자리를 덮고** 지도는 그대로 남아 선택 구를 강조한다 — 모바일 시트
 * (Top10 → 상세)·상권추천 좌측 패널과 같은 관용구다. 상세는 차트가 있어 목록(280px)보다
 * 넓어야 하므로 선택 중에는 좌측 열을 넓힌다.
 */
const DesktopGrid = styled.div`
  --status-side-track: 280px;

  height: 100%;
  min-height: 0;
  display: grid;
  grid-template-columns: var(--status-side-track) minmax(0, 1fr);
  align-items: stretch;
  gap: 20px;

  &[data-has-selection='true'] {
    --status-side-track: clamp(340px, 40%, 480px);
  }

  /* 태블릿(768~1023): 간격만 줄이고 리스트 폭(280)은 유지해 값이 잘리지 않게 한다. */
  @media (max-width: 1023px) {
    gap: 16px;
  }

  /* 모바일(<768)에서만 바텀시트(MobileStage)로 전환한다. */
  @media (max-width: 767px) {
    display: none;
  }
`

// 좌측 열은 한 칸에서 순위↔상세를 토글한다. 우측 지도는 선택과 무관하게 항상 보인다.
const DesktopSide = styled.div`
  min-width: 0;
  min-height: 0;
  height: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr);

  &[data-has-selection='true'] [data-status-top-ten-panel] {
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
  animation: ${detailEnter} var(--motion-standard) var(--ease-standard);

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }

  /* 상세는 열 폭을 다 쓰고, 남는 높이 안에서 내부 스크롤(스크롤바 숨김). */
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

  const desktopSideRef = useRef<HTMLDivElement>(null)
  const desktopBackButtonRef = useRef<HTMLButtonElement>(null)
  const previousSelectionRef = useRef<string | null | undefined>(undefined)

  const topTenQuery = useQuery({
    queryKey: ['status', 'topTen'],
    queryFn: fetchStatusTopTen,
    // 404(데이터 부재)·4xx는 재시도해도 결과가 같다. 5xx/통신 실패만 재시도한다.
    retry: retryUnlessClientError(3),
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
    retry: retryUnlessClientError(3),
  })

  const detail =
    detailQuery.data && isApiSuccess(detailQuery.data)
      ? detailQuery.data.dataBody
      : null
  const detailError = resolveApiError(detailQuery)
  const isDetailLoading =
    detailQuery.isPending || (detailError !== null && detailQuery.isFetching)
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

  /*
   * 데스크톱에서는 순위 목록과 상세가 한 자리를 번갈아 쓴다. 목록 버튼으로 상세를 열면
   * 그 버튼이 display:none 이 되며 포커스가 body 로 떨어지고, 뒤로가기로 닫으면 상세의
   * 뒤로가기 버튼이 사라지며 또 떨어진다. **포커스를 잃은 경우에만** 짝이 되는 자리로
   * 옮긴다 — 지도 폴리곤을 눌러 연 경우처럼 포커스가 살아 있으면 건드리지 않는다.
   * 모바일(시트)은 자체 전환 로직이 있어 데스크톱 열이 보일 때만 동작한다.
   */
  useLayoutEffect(() => {
    // 데이터 전 렌더는 「선택 없음」이 아니라 「아직 모름」이다. 여기서 기록하면 링크로
    // 들어온 선택이 도착하는 순간을 사용자 전환으로 오인해 페이지 진입 때 포커스를 뺏는다.
    if (!topTen) return
    const previous = previousSelectionRef.current
    previousSelectionRef.current = selectedItem?.districtCode ?? null
    if (previous === undefined || previous === previousSelectionRef.current) {
      return
    }

    const side = desktopSideRef.current
    if (!side || side.offsetParent === null) return

    // 막 숨겨진 목록 버튼은 브라우저가 blur 하기 전까지 activeElement 로 남아 있다.
    const active = document.activeElement
    const hasLostFocus =
      !active ||
      active === document.body ||
      (active instanceof HTMLElement &&
        side.contains(active) &&
        active.offsetParent === null)
    if (!hasLostFocus) return

    if (selectedItem) {
      desktopBackButtonRef.current?.focus({ preventScroll: true })
      return
    }

    if (previous) {
      side
        .querySelector<HTMLButtonElement>(
          `[data-status-top-ten-panel] [data-district-code="${previous}"]`,
        )
        ?.focus({ preventScroll: true })
    }
  }, [selectedItem, topTen])

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

  /*
   * 네 지표가 동시에 비면 「데이터가 아직 없어요」가 아니라 **장애**다. 서울 자치구는
   * 25개 고정이라 정상 운영에서 전 지표가 한꺼번에 0건이 될 수 없다. 200 + 빈 배열은
   * `!topTen` 을 통과해 정상 페이지로 렌더되고, 탭마다 결측 문구만 떠서 장애인지가
   * 늦어졌다(#371). 재시도 가능한 안내로 바꾼다.
   */
  const isSupplyOutage = topTen ? isStatusTopTenAllEmpty(topTen) : false

  if (!topTen || isSupplyOutage) {
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
              error={resolveApiError(topTenQuery)}
              state="error"
              title={
                isSupplyOutage ? '자치구 데이터를 불러오지 못했어요' : undefined
              }
              description={
                isSupplyOutage
                  ? '유동인구·매출·개업·폐업 네 지표가 모두 비어 있습니다. 일시적인 문제일 수 있으니 잠시 후 다시 시도해 주세요.'
                  : undefined
              }
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
          <DesktopGrid data-has-selection={selectedItem !== null}>
            <DesktopSide
              ref={desktopSideRef}
              data-has-selection={selectedItem !== null}
            >
              <DesktopPanel data-status-top-ten-panel>
                <StatusTopTen
                  items={currentItems}
                  metric={metric}
                  selectedDistrictCode={selectedDistrictCode}
                  onSelect={handleDistrictSelect}
                />
              </DesktopPanel>

              <DesktopDetailSlot
                key={selectedItem?.districtCode ?? 'none'}
                data-status-detail-slot
              >
                {selectedItem ? (
                  <StatusDetail
                    backButtonRef={desktopBackButtonRef}
                    detail={detail}
                    error={detailError}
                    isLoading={isDetailLoading}
                    metric={metric}
                    selectedItem={selectedItem}
                    onBack={handleClearDistrict}
                    onRetry={() => void detailQuery.refetch()}
                  />
                ) : null}
              </DesktopDetailSlot>
            </DesktopSide>

            <MapPanel data-status-map-panel>
              <StatusMap
                items={currentItems}
                metric={metric}
                selectedDistrictCode={selectedDistrictCode}
                onSelect={handleDistrictSelect}
              />
            </MapPanel>
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
              detailError={detailError}
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
