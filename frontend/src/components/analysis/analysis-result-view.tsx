'use client'

import { useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Bookmark,
  Check,
  ExternalLink,
  Share2,
  X,
} from 'lucide-react'
import styled from 'styled-components'

import AnalysisMetricList from '@/components/analysis/analysis-metric-list'
import AnalysisResultSection from '@/components/analysis/analysis-result-section'
import { Button } from '@/components/ui/button'
import EmptyState from '@/components/ui/empty-state'
import { TabButton, TabList } from '@/components/ui/tabs'
import {
  fetchCommercialBenchmark,
  fetchCommercialFacilities,
  fetchCommercialFootTraffic,
  fetchCommercialIncome,
  fetchCommercialIncomeSummary,
  fetchCommercialPopulation,
  fetchCommercialSales,
  fetchCommercialSalesSummary,
  fetchCommercialStores,
  fetchCommercialTrend,
} from '@/lib/api/commercial-analysis'
import { isApiSuccess } from '@/lib/api/response'
import { addMemberBookmark, removeMemberBookmark } from '@/lib/api/user'
import { fetchCommercialProfile } from '@/lib/api/recommend'
import {
  ANALYSIS_TABS,
  formatAnalysisValue,
  formatPeriodCode,
  normalizeAnalysisTab,
  toMetricRows,
  type AnalysisMetricRow,
} from '@/lib/analysis/presentation'
import {
  createAnalysisExplorerHref,
  createAnalysisResultHref,
  isCompleteAnalysisSelection,
  parseAnalysisSelection,
  type AnalysisResultTab,
  type AnalysisSelection,
} from '@/lib/analysis/selection'
import { invalidateMemberBookmarksQuery } from '@/lib/recommend/recommend-bookmarks'
import { useCommercialBookmarks } from '@/hooks/use-commercial-bookmarks'
import { useAuthStore } from '@/stores/auth-store'
import type { ApiResponse } from '@/types/api'
import type {
  CommercialBenchmark,
  CommercialFacility,
  CommercialFootTraffic,
  CommercialIncomeAndExpense,
  CommercialIncomeSummary,
  CommercialResidentPopulation,
  CommercialSales,
  CommercialSalesSummary,
  CommercialStoreAnalysis,
  CommercialTrend,
  CommercialTrendMetric,
} from '@/types/commercial-analysis'
import type { CommercialProfile } from '@/types/recommend'

export type AnalysisResultViewProps = {
  onClose?: () => void
}

export const createInvalidResultMessage = (
  selection: AnalysisSelection,
): string | null =>
  isCompleteAnalysisSelection(selection)
    ? null
    : '분석 조건을 다시 선택해 주세요'

export const createResultTabHref = (
  selection: AnalysisSelection,
  tab: AnalysisResultTab,
) => createAnalysisResultHref(selection, tab)

export const getCommercialBookmarkLoginHref = (currentHref: string) =>
  `/login?redirect=${encodeURIComponent(currentHref)}`

const Root = styled.article`
  min-height: 100%;
  background: var(--color-surface-muted);
`

const StickyHeader = styled.header`
  position: sticky;
  z-index: 10;
  top: 0;
  border-bottom: 1px solid var(--color-border-200);
  background: color-mix(in srgb, var(--color-surface) 96%, transparent);
  backdrop-filter: blur(14px);
`

const HeaderInner = styled.div`
  width: min(1180px, calc(100% - 40px));
  margin: 0 auto;
  padding: 18px 0 0;

  @media (max-width: 640px) {
    width: min(100% - 28px, 1180px);
    padding-top: 12px;
  }
`

const HeaderTop = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding-bottom: 14px;
`

const HeaderCopy = styled.div`
  min-width: 0;
  flex: 1;
  display: grid;
  gap: 4px;

  p {
    color: var(--color-primary-700);
    font-size: 12px;
    font-weight: 750;
  }

  h1 {
    overflow: hidden;
    color: var(--color-text-900);
    font-size: clamp(20px, 3vw, 28px);
    font-weight: 780;
    line-height: 1.25;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  small {
    color: var(--color-text-600);
    font-size: 13px;
    line-height: 20px;
  }
`

const IconButton = styled.button`
  width: 44px;
  height: 44px;
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: var(--radius-control);
  background: transparent;
  color: var(--color-text-700);
  cursor: pointer;

  &:hover,
  &:focus-visible {
    background: var(--color-surface-muted);
    color: var(--color-text-900);
    outline: none;
  }

  svg {
    width: 21px;
    height: 21px;
  }
`

const Content = styled.div`
  width: min(1180px, calc(100% - 40px));
  margin: 0 auto;
  padding: 28px 0 56px;
  display: grid;
  gap: 20px;

  @media (max-width: 640px) {
    width: min(100% - 28px, 1180px);
    padding: 20px 0 max(36px, env(safe-area-inset-bottom));
  }
`

const ContextHero = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 20px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  box-shadow: var(--shadow-level-1);
  padding: 24px;

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
    padding: 20px;
  }
`

const ContextCopy = styled.div`
  display: grid;
  gap: 6px;

  p {
    color: var(--color-text-caption);
    font-size: 13px;
  }

  h2 {
    color: var(--color-text-900);
    font-size: 21px;
    font-weight: 750;
    line-height: 30px;
  }

  small {
    color: var(--color-text-600);
    font-size: 13px;
    line-height: 20px;
  }
`

const ActionRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;

  button {
    min-width: 112px;
  }
`

const Feedback = styled.p<{ $error?: boolean }>`
  color: ${props =>
    props.$error ? 'var(--color-danger)' : 'var(--color-primary-700)'};
  font-size: 13px;
  line-height: 20px;
`

const CardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 460px) {
    grid-template-columns: 1fr;
  }
`

const MetricCard = styled.div`
  display: grid;
  gap: 6px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-control);
  background: var(--color-surface-muted);
  padding: 16px;

  span {
    color: var(--color-text-caption);
    font-size: 12px;
  }

  strong {
    color: var(--color-text-900);
    font-size: 19px;
    font-weight: 750;
    line-height: 28px;
  }
`

const ComparisonGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;

  @media (max-width: 680px) {
    grid-template-columns: 1fr;
  }
`

const ComparisonItem = styled.div`
  display: grid;
  gap: 5px;
  border-radius: var(--radius-control);
  background: var(--color-surface-muted);
  padding: 14px;

  span {
    color: var(--color-text-caption);
    font-size: 12px;
  }

  strong {
    color: var(--color-text-900);
    font-size: 16px;
  }
`

const HighlightList = styled.ul`
  display: grid;
  gap: 9px;

  li {
    position: relative;
    color: var(--color-text-700);
    padding-left: 18px;
    font-size: 14px;
    line-height: 22px;
  }

  li::before {
    position: absolute;
    top: 8px;
    left: 2px;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--color-primary-600);
    content: '';
  }
`

const SplitGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 680px) {
    grid-template-columns: 1fr;
  }
`

const isResponseError = (response: ApiResponse<unknown> | undefined) =>
  response !== undefined && !isApiSuccess(response)

const getResponseBody = <T,>(
  response: ApiResponse<T | null> | undefined,
): T | null => (isApiSuccess(response) ? (response?.dataBody ?? null) : null)

const hasObjectValues = (value: object | null | undefined) =>
  Boolean(
    value &&
    Object.values(value).some(
      item =>
        item !== null &&
        item !== undefined &&
        (!Array.isArray(item) || item.length > 0),
    ),
  )

const renderCards = (
  cards: readonly {
    label: string
    value: number | null | undefined
    unit: string
  }[],
) => (
  <CardGrid>
    {cards.map(card => (
      <MetricCard key={card.label}>
        <span>{card.label}</span>
        <strong>{formatAnalysisValue(card.value, card.unit)}</strong>
      </MetricCard>
    ))}
  </CardGrid>
)

const createRows = (
  source: Record<string, number | null | undefined> | null | undefined,
  definitions: readonly (readonly [string, string])[],
): AnalysisMetricRow[] =>
  toMetricRows(
    source,
    definitions as readonly (readonly [
      string,
      keyof Record<string, number | null | undefined>,
    ])[],
  )

const footTimeDefinitions = [
  ['00~06시', 'footTrafficTime00To06'],
  ['06~11시', 'footTrafficTime06To11'],
  ['11~14시', 'footTrafficTime11To14'],
  ['14~17시', 'footTrafficTime14To17'],
  ['17~21시', 'footTrafficTime17To21'],
  ['21~24시', 'footTrafficTime21To24'],
] as const
const footDayDefinitions = [
  ['월', 'mondayFootTraffic'],
  ['화', 'tuesdayFootTraffic'],
  ['수', 'wednesdayFootTraffic'],
  ['목', 'thursdayFootTraffic'],
  ['금', 'fridayFootTraffic'],
  ['토', 'saturdayFootTraffic'],
  ['일', 'sundayFootTraffic'],
] as const
const footAgeDefinitions = [
  ['10대', 'age10FootTraffic'],
  ['20대', 'age20FootTraffic'],
  ['30대', 'age30FootTraffic'],
  ['40대', 'age40FootTraffic'],
  ['50대', 'age50FootTraffic'],
  ['60대 이상', 'age60PlusFootTraffic'],
] as const
const salesTimeDefinitions = [
  ['00~06시', 'salesAmountTime00To06'],
  ['06~11시', 'salesAmountTime06To11'],
  ['11~14시', 'salesAmountTime11To14'],
  ['14~17시', 'salesAmountTime14To17'],
  ['17~21시', 'salesAmountTime17To21'],
  ['21~24시', 'salesAmountTime21To24'],
] as const
const salesDayDefinitions = [
  ['월', 'mondaySalesAmount'],
  ['화', 'tuesdaySalesAmount'],
  ['수', 'wednesdaySalesAmount'],
  ['목', 'thursdaySalesAmount'],
  ['금', 'fridaySalesAmount'],
  ['토', 'saturdaySalesAmount'],
  ['일', 'sundaySalesAmount'],
] as const
const salesAgeDefinitions = [
  ['10대', 'age10SalesAmount'],
  ['20대', 'age20SalesAmount'],
  ['30대', 'age30SalesAmount'],
  ['40대', 'age40SalesAmount'],
  ['50대', 'age50SalesAmount'],
  ['60대 이상', 'age60PlusSalesAmount'],
] as const
const populationAgeDefinitions = [
  ['10대', 'age10ResidentPopulation'],
  ['20대', 'age20ResidentPopulation'],
  ['30대', 'age30ResidentPopulation'],
  ['40대', 'age40ResidentPopulation'],
  ['50대', 'age50ResidentPopulation'],
  ['60대 이상', 'age60PlusResidentPopulation'],
] as const
const expenseDefinitions = [
  ['식료품', 'groceryExpenseAmount'],
  ['의류·신발', 'clothingExpenseAmount'],
  ['의료', 'medicalExpenseAmount'],
  ['생활용품', 'householdExpenseAmount'],
  ['교통', 'transportationExpenseAmount'],
  ['여가·오락', 'leisureExpenseAmount'],
  ['문화·취미', 'cultureExpenseAmount'],
  ['교육', 'educationExpenseAmount'],
  ['유흥', 'entertainmentExpenseAmount'],
] as const

export default function AnalysisResultView({
  onClose,
}: AnalysisResultViewProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const selection = useMemo(
    () => parseAnalysisSelection(searchParams),
    [searchParams],
  )
  const activeTab = normalizeAnalysisTab(searchParams.get('tab'))
  const invalidMessage = createInvalidResultMessage(selection)
  const enabled = invalidMessage === null
  const districtCode = selection.districtCode ?? ''
  const administrationCode = selection.administrationCode ?? ''
  const commercialCode = selection.commercialCode ?? ''
  const serviceCode = selection.serviceCode ?? ''
  const periodCode = selection.periodCode
  const contextParams = {
    districtCode,
    administrationCode,
    serviceCode,
    periodCode,
  }
  const currentHref = `${pathname}?${searchParams.toString()}`
  const hasHydrated = useAuthStore(state => state.hasHydrated)
  const isLoggedIn = useAuthStore(state => state.isLoggedIn)
  const memberId = useAuthStore(state => state.memberInfo?.memberId ?? null)
  const bookmarksQuery = useCommercialBookmarks(
    memberId,
    hasHydrated && isLoggedIn,
  )
  const [actionFeedback, setActionFeedback] = useState<{
    error: boolean
    message: string
  } | null>(null)

  const profileQuery = useQuery({
    queryKey: ['analysis', 'profile', commercialCode, serviceCode, periodCode],
    queryFn: () =>
      fetchCommercialProfile(commercialCode, serviceCode, periodCode),
    enabled,
    retry: 1,
  })
  const salesSummaryQuery = useQuery({
    queryKey: ['analysis', 'sales-summary', commercialCode, contextParams],
    queryFn: () => fetchCommercialSalesSummary(commercialCode, contextParams),
    enabled,
    retry: 1,
  })
  const storesQuery = useQuery({
    queryKey: ['analysis', 'stores', commercialCode, serviceCode, periodCode],
    queryFn: () =>
      fetchCommercialStores(commercialCode, serviceCode, periodCode),
    enabled,
    retry: 1,
  })
  const populationQuery = useQuery({
    queryKey: ['analysis', 'population', commercialCode, periodCode],
    queryFn: () => fetchCommercialPopulation(commercialCode, periodCode),
    enabled,
    retry: 1,
  })
  const incomeSummaryQuery = useQuery({
    queryKey: [
      'analysis',
      'income-summary',
      commercialCode,
      districtCode,
      administrationCode,
      periodCode,
    ],
    queryFn: () =>
      fetchCommercialIncomeSummary(
        commercialCode,
        districtCode,
        administrationCode,
        periodCode,
      ),
    enabled,
    retry: 1,
  })
  const facilitiesQuery = useQuery({
    queryKey: ['analysis', 'facilities', commercialCode, periodCode],
    queryFn: () => fetchCommercialFacilities(commercialCode, periodCode),
    enabled,
    retry: 1,
  })
  const footTrafficQuery = useQuery({
    queryKey: ['analysis', 'foot-traffic', commercialCode, periodCode],
    queryFn: () => fetchCommercialFootTraffic(commercialCode, periodCode),
    enabled: enabled && activeTab === 'foot-traffic',
    retry: 1,
  })
  const salesQuery = useQuery({
    queryKey: ['analysis', 'sales', commercialCode, serviceCode, periodCode],
    queryFn: () =>
      fetchCommercialSales(commercialCode, serviceCode, periodCode),
    enabled: enabled && activeTab === 'sales',
    retry: 1,
  })
  const incomeQuery = useQuery({
    queryKey: ['analysis', 'income', commercialCode, periodCode],
    queryFn: () => fetchCommercialIncome(commercialCode, periodCode),
    enabled: enabled && activeTab === 'living',
    retry: 1,
  })
  const salesTrendQuery = useQuery({
    queryKey: [
      'analysis',
      'trend',
      commercialCode,
      serviceCode,
      'SALES',
      periodCode,
    ],
    queryFn: () =>
      fetchCommercialTrend(commercialCode, {
        serviceCode,
        metricType: 'SALES',
        periodCode,
        periodCount: 4,
      }),
    enabled: enabled && activeTab === 'trend',
    retry: 1,
  })
  const footTrendQuery = useQuery({
    queryKey: [
      'analysis',
      'trend',
      commercialCode,
      serviceCode,
      'FOOT_TRAFFIC',
      periodCode,
    ],
    queryFn: () =>
      fetchCommercialTrend(commercialCode, {
        serviceCode,
        metricType: 'FOOT_TRAFFIC',
        periodCode,
        periodCount: 4,
      }),
    enabled: enabled && activeTab === 'trend',
    retry: 1,
  })
  const storeTrendQuery = useQuery({
    queryKey: [
      'analysis',
      'trend',
      commercialCode,
      serviceCode,
      'STORE',
      periodCode,
    ],
    queryFn: () =>
      fetchCommercialTrend(commercialCode, {
        serviceCode,
        metricType: 'STORE',
        periodCode,
        periodCount: 4,
      }),
    enabled: enabled && activeTab === 'trend',
    retry: 1,
  })
  const benchmarkQuery = useQuery({
    queryKey: [
      'analysis',
      'benchmark',
      commercialCode,
      serviceCode,
      periodCode,
    ],
    queryFn: () =>
      fetchCommercialBenchmark(commercialCode, serviceCode, periodCode),
    enabled: enabled && activeTab === 'benchmark',
    retry: 1,
  })

  const profile = getResponseBody(profileQuery.data) as CommercialProfile | null
  const salesSummary = getResponseBody(
    salesSummaryQuery.data,
  ) as CommercialSalesSummary | null
  const stores = getResponseBody(
    storesQuery.data,
  ) as CommercialStoreAnalysis | null
  const population = getResponseBody(
    populationQuery.data,
  ) as CommercialResidentPopulation | null
  const incomeSummary = getResponseBody(
    incomeSummaryQuery.data,
  ) as CommercialIncomeSummary | null
  const facilities = getResponseBody(
    facilitiesQuery.data,
  ) as CommercialFacility | null
  const footTraffic = getResponseBody(
    footTrafficQuery.data,
  ) as CommercialFootTraffic | null
  const sales = getResponseBody(salesQuery.data) as CommercialSales | null
  const income = getResponseBody(
    incomeQuery.data,
  ) as CommercialIncomeAndExpense | null
  const benchmark = getResponseBody(
    benchmarkQuery.data,
  ) as CommercialBenchmark | null
  const trends: Array<{
    metric: CommercialTrendMetric
    label: string
    unit: string
    query: typeof salesTrendQuery
    data: CommercialTrend | null
  }> = [
    {
      metric: 'SALES',
      label: '매출 변화',
      unit: '원',
      query: salesTrendQuery,
      data: getResponseBody(salesTrendQuery.data),
    },
    {
      metric: 'FOOT_TRAFFIC',
      label: '유동인구 변화',
      unit: '명',
      query: footTrendQuery,
      data: getResponseBody(footTrendQuery.data),
    },
    {
      metric: 'STORE',
      label: '점포 변화',
      unit: '개',
      query: storeTrendQuery,
      data: getResponseBody(storeTrendQuery.data),
    },
  ]

  const bookmark = bookmarksQuery.bookmarks.find(
    item => item.targetCode === commercialCode,
  )
  const bookmarkMutation = useMutation({
    mutationFn: async () => {
      if (!memberId || !profile?.commercialName) {
        throw new Error('회원 또는 상권 정보를 확인하지 못했습니다.')
      }
      return bookmark
        ? removeMemberBookmark(bookmark.bookmarkId)
        : addMemberBookmark({
            targetType: 'COMMERCIAL',
            targetCode: commercialCode,
            targetName: profile.commercialName,
          })
    },
    onSuccess: async response => {
      if (!isApiSuccess(response)) {
        throw new Error('상권 저장을 처리하지 못했습니다.')
      }
      if (memberId) {
        await invalidateMemberBookmarksQuery(queryClient, memberId)
      }
      setActionFeedback({
        error: false,
        message: bookmark ? '상권 저장을 해제했어요.' : '상권을 저장했어요.',
      })
    },
    onError: error => {
      setActionFeedback({
        error: true,
        message:
          error instanceof Error
            ? error.message
            : '상권 저장을 처리하지 못했습니다.',
      })
    },
  })

  if (invalidMessage) {
    return (
      <Root>
        <Content>
          <EmptyState
            title={invalidMessage}
            description="지역, 상권, 업종을 다시 선택하면 분석을 시작할 수 있어요."
            action={
              <Button onClick={() => router.push('/analysis')}>
                조건 다시 선택
              </Button>
            }
          />
        </Content>
      </Root>
    )
  }

  const handleShare = async () => {
    const absoluteUrl =
      typeof window === 'undefined'
        ? currentHref
        : new URL(currentHref, window.location.origin).toString()
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({
          title: `${profile?.commercialName ?? '상권'} 분석 결과`,
          url: absoluteUrl,
        })
      } else {
        await navigator.clipboard.writeText(absoluteUrl)
      }
      setActionFeedback({
        error: false,
        message: '현재 분석 URL을 공유할 수 있게 준비했어요.',
      })
    } catch {
      setActionFeedback({
        error: true,
        message: '공유하지 못했습니다. 다시 시도해 주세요.',
      })
    }
  }

  const handleBookmark = () => {
    if (!hasHydrated) return
    if (!isLoggedIn) {
      router.push(getCommercialBookmarkLoginHref(currentHref))
      return
    }
    bookmarkMutation.mutate()
  }

  const summaryCards = [
    {
      label: '월 매출',
      value:
        profile?.keyMetrics?.totalSalesAmount ??
        salesSummary?.commercial?.monthlySalesAmount,
      unit: '원',
    },
    {
      label: '유동인구',
      value: profile?.keyMetrics?.totalFootTraffic,
      unit: '명',
    },
    {
      label: '점포 수',
      value: profile?.keyMetrics?.totalStoreCount ?? stores?.totalStoreCount,
      unit: '개',
    },
    {
      label: '상주인구',
      value:
        profile?.keyMetrics?.totalResidentPopulation ??
        population?.byAgeItem?.totalResidentPopulation,
      unit: '명',
    },
  ] as const

  return (
    <Root>
      <StickyHeader>
        <HeaderInner>
          <HeaderTop>
            <IconButton
              type="button"
              aria-label={onClose ? '상권 분석 결과 닫기' : '조건 다시 선택'}
              onClick={
                onClose ??
                (() => router.push(createAnalysisExplorerHref(selection)))
              }
            >
              {onClose ? <X /> : <ArrowLeft />}
            </IconButton>
            <HeaderCopy>
              <p>상권 분석 리포트</p>
              <h1>
                {profileQuery.isPending
                  ? '상권 정보를 불러오는 중'
                  : (profile?.commercialName ?? `상권 ${commercialCode}`)}
              </h1>
              <small>
                {profile
                  ? `${profile.districtName} · ${profile.administrationName} · ${formatPeriodCode(
                      periodCode,
                    )} 기준`
                  : `${formatPeriodCode(periodCode)} 기준`}
              </small>
            </HeaderCopy>
          </HeaderTop>
          <TabList aria-label="분석 결과 항목" role="tablist">
            {ANALYSIS_TABS.map(tab => (
              <TabButton
                key={tab.value}
                type="button"
                role="tab"
                $active={activeTab === tab.value}
                aria-selected={activeTab === tab.value}
                onClick={() =>
                  router.replace(createResultTabHref(selection, tab.value))
                }
              >
                {tab.label}
              </TabButton>
            ))}
          </TabList>
        </HeaderInner>
      </StickyHeader>

      <Content>
        <ContextHero>
          <ContextCopy>
            <p>선택 업종 {serviceCode}</p>
            <h2>
              {profile?.commercialName ?? '선택 상권'}의 창업 데이터를 확인해
              보세요
            </h2>
            <small>
              지표가 없는 항목은 0이 아니라 데이터 없음으로 표시합니다.
            </small>
          </ContextCopy>
          <ActionRow>
            <Button
              size="medium"
              variant="secondary"
              leftIcon={<Share2 />}
              onClick={() => void handleShare()}
            >
              공유
            </Button>
            <Button
              size="medium"
              variant="secondary"
              leftIcon={bookmark ? <Check /> : <Bookmark />}
              isLoading={bookmarkMutation.isPending}
              disabled={!hasHydrated || profileQuery.isPending}
              onClick={handleBookmark}
            >
              {bookmark ? '저장됨' : '상권 저장'}
            </Button>
            <Button
              size="medium"
              rightIcon={<ExternalLink />}
              onClick={() =>
                router.push(
                  `/analysis/simulation?${new URLSearchParams({
                    serviceCode,
                    serviceCodeName: '',
                    gugun: profile?.districtName ?? '',
                  })}`,
                )
              }
            >
              시뮬레이션
            </Button>
          </ActionRow>
        </ContextHero>

        {actionFeedback ? (
          <Feedback $error={actionFeedback.error} role="status">
            {actionFeedback.message}
          </Feedback>
        ) : null}
        {bookmarksQuery.errorMessage ? (
          <Feedback $error>{bookmarksQuery.errorMessage}</Feedback>
        ) : null}

        {activeTab === 'summary' ? (
          <>
            <AnalysisResultSection
              title="핵심 지표"
              description="선택한 상권과 업종의 주요 수치를 먼저 확인하세요."
              loading={profileQuery.isPending}
              error={
                profileQuery.isError ||
                isResponseError(profileQuery.data as ApiResponse<unknown>)
              }
              empty={!profile?.keyMetrics && !salesSummary && !stores}
              onRetry={() => void profileQuery.refetch()}
            >
              {renderCards(summaryCards)}
            </AnalysisResultSection>

            <AnalysisResultSection
              title="지역별 월 매출 비교"
              loading={salesSummaryQuery.isPending}
              error={
                salesSummaryQuery.isError ||
                isResponseError(salesSummaryQuery.data as ApiResponse<unknown>)
              }
              empty={!hasObjectValues(salesSummary)}
              onRetry={() => void salesSummaryQuery.refetch()}
            >
              <ComparisonGrid>
                {[
                  salesSummary?.district,
                  salesSummary?.administration,
                  salesSummary?.commercial,
                ].map((item, index) => (
                  <ComparisonItem key={item?.code ?? index}>
                    <span>
                      {item?.name ?? ['자치구', '행정동', '상권'][index]}
                    </span>
                    <strong>
                      {formatAnalysisValue(item?.monthlySalesAmount, '원')}
                    </strong>
                  </ComparisonItem>
                ))}
              </ComparisonGrid>
            </AnalysisResultSection>

            <SplitGrid>
              <AnalysisResultSection
                title="점포 현황"
                loading={storesQuery.isPending}
                error={
                  storesQuery.isError ||
                  isResponseError(storesQuery.data as ApiResponse<unknown>)
                }
                empty={!hasObjectValues(stores)}
                onRetry={() => void storesQuery.refetch()}
              >
                {renderCards([
                  {
                    label: '총 점포',
                    value: stores?.totalStoreCount,
                    unit: '개',
                  },
                  {
                    label: '개업률',
                    value: stores?.openingRate,
                    unit: '%',
                  },
                  {
                    label: '폐업률',
                    value: stores?.closureRate,
                    unit: '%',
                  },
                  {
                    label: '프랜차이즈',
                    value: stores?.franchiseStoreCount,
                    unit: '개',
                  },
                ])}
              </AnalysisResultSection>
              <AnalysisResultSection
                title="생활권·시설"
                loading={populationQuery.isPending || facilitiesQuery.isPending}
                error={
                  populationQuery.isError ||
                  facilitiesQuery.isError ||
                  isResponseError(
                    populationQuery.data as ApiResponse<unknown>,
                  ) ||
                  isResponseError(facilitiesQuery.data as ApiResponse<unknown>)
                }
                empty={
                  !hasObjectValues(population) && !hasObjectValues(facilities)
                }
                onRetry={() => {
                  void populationQuery.refetch()
                  void facilitiesQuery.refetch()
                }}
              >
                {renderCards([
                  {
                    label: '상주인구',
                    value: population?.byAgeItem?.totalResidentPopulation,
                    unit: '명',
                  },
                  {
                    label: '주요 시설',
                    value: facilities?.totalFacilityCount,
                    unit: '개',
                  },
                  {
                    label: '학교',
                    value: facilities?.schoolCountItem?.totalSchoolCount,
                    unit: '개',
                  },
                  {
                    label: '대중교통',
                    value: facilities?.totalTransportationFacilityCount,
                    unit: '개',
                  },
                ])}
              </AnalysisResultSection>
            </SplitGrid>
          </>
        ) : null}

        {activeTab === 'foot-traffic' ? (
          <>
            {[
              [
                '시간대별 유동인구',
                footTraffic?.byTimeSlotItem,
                footTimeDefinitions,
              ],
              [
                '요일별 유동인구',
                footTraffic?.byDayOfWeekItem,
                footDayDefinitions,
              ],
              [
                '연령별 유동인구',
                footTraffic?.byAgeGroupItem,
                footAgeDefinitions,
              ],
            ].map(([title, source, definitions]) => (
              <AnalysisResultSection
                key={String(title)}
                title={String(title)}
                loading={footTrafficQuery.isPending}
                error={
                  footTrafficQuery.isError ||
                  isResponseError(footTrafficQuery.data as ApiResponse<unknown>)
                }
                empty={
                  !hasObjectValues(
                    source as Record<string, number | null> | null,
                  )
                }
                onRetry={() => void footTrafficQuery.refetch()}
              >
                <AnalysisMetricList
                  rows={createRows(
                    source as Record<string, number | null>,
                    definitions as readonly (readonly [string, string])[],
                  )}
                  unit="명"
                />
              </AnalysisResultSection>
            ))}
          </>
        ) : null}

        {activeTab === 'sales' ? (
          <>
            {[
              [
                '시간대별 매출',
                sales?.amountByTimeSlotItem,
                salesTimeDefinitions,
              ],
              [
                '요일별 매출',
                sales?.amountByDayOfWeekItem,
                salesDayDefinitions,
              ],
              ['연령별 매출', sales?.amountByAgeItem, salesAgeDefinitions],
            ].map(([title, source, definitions]) => (
              <AnalysisResultSection
                key={String(title)}
                title={String(title)}
                loading={salesQuery.isPending}
                error={
                  salesQuery.isError ||
                  isResponseError(salesQuery.data as ApiResponse<unknown>)
                }
                empty={
                  !hasObjectValues(
                    source as Record<string, number | null> | null,
                  )
                }
                onRetry={() => void salesQuery.refetch()}
              >
                <AnalysisMetricList
                  rows={createRows(
                    source as Record<string, number | null>,
                    definitions as readonly (readonly [string, string])[],
                  )}
                  unit="원"
                />
              </AnalysisResultSection>
            ))}
          </>
        ) : null}

        {activeTab === 'stores' ? (
          <AnalysisResultSection
            title="점포 분석"
            description="개·폐업과 프랜차이즈 현황을 함께 확인하세요."
            loading={storesQuery.isPending}
            error={
              storesQuery.isError ||
              isResponseError(storesQuery.data as ApiResponse<unknown>)
            }
            empty={!hasObjectValues(stores)}
            onRetry={() => void storesQuery.refetch()}
          >
            {renderCards([
              {
                label: '총 점포',
                value: stores?.totalStoreCount,
                unit: '개',
              },
              {
                label: '유사 업종 점포',
                value: stores?.similarStoreCount,
                unit: '개',
              },
              {
                label: '개업 점포',
                value: stores?.openedStoreCount,
                unit: '개',
              },
              {
                label: '폐업 점포',
                value: stores?.closedStoreCount,
                unit: '개',
              },
            ])}
          </AnalysisResultSection>
        ) : null}

        {activeTab === 'living' ? (
          <>
            <AnalysisResultSection
              title="연령별 상주인구"
              loading={populationQuery.isPending}
              error={
                populationQuery.isError ||
                isResponseError(populationQuery.data as ApiResponse<unknown>)
              }
              empty={!hasObjectValues(population?.byAgeItem)}
              onRetry={() => void populationQuery.refetch()}
            >
              <AnalysisMetricList
                rows={createRows(
                  population?.byAgeItem as Record<
                    string,
                    number | null | undefined
                  >,
                  populationAgeDefinitions,
                )}
                unit="명"
              />
            </AnalysisResultSection>
            <AnalysisResultSection
              title="소득과 소비"
              loading={incomeQuery.isPending}
              error={
                incomeQuery.isError ||
                isResponseError(incomeQuery.data as ApiResponse<unknown>) ||
                incomeSummaryQuery.isError
              }
              empty={
                !hasObjectValues(income) && !hasObjectValues(incomeSummary)
              }
              onRetry={() => {
                void incomeQuery.refetch()
                void incomeSummaryQuery.refetch()
              }}
            >
              <MetricCard>
                <span>월 평균 소득</span>
                <strong>
                  {formatAnalysisValue(
                    income?.averageIncomeItem?.monthlyAverageIncomeAmount,
                    '원',
                  )}
                </strong>
              </MetricCard>
              <AnalysisMetricList
                rows={createRows(
                  income?.expenseByCategoryItem as Record<
                    string,
                    number | null | undefined
                  >,
                  expenseDefinitions,
                )}
                unit="원"
              />
            </AnalysisResultSection>
            <AnalysisResultSection
              title="주요 시설과 교통"
              loading={facilitiesQuery.isPending}
              error={
                facilitiesQuery.isError ||
                isResponseError(facilitiesQuery.data as ApiResponse<unknown>)
              }
              empty={!hasObjectValues(facilities)}
              onRetry={() => void facilitiesQuery.refetch()}
            >
              {renderCards([
                {
                  label: '전체 시설',
                  value: facilities?.totalFacilityCount,
                  unit: '개',
                },
                {
                  label: '전체 학교',
                  value: facilities?.schoolCountItem?.totalSchoolCount,
                  unit: '개',
                },
                {
                  label: '초·중·고',
                  value:
                    (facilities?.schoolCountItem?.elementarySchoolCount ?? 0) +
                    (facilities?.schoolCountItem?.middleSchoolCount ?? 0) +
                    (facilities?.schoolCountItem?.highSchoolCount ?? 0),
                  unit: '개',
                },
                {
                  label: '대중교통 시설',
                  value: facilities?.totalTransportationFacilityCount,
                  unit: '개',
                },
              ])}
            </AnalysisResultSection>
          </>
        ) : null}

        {activeTab === 'trend' ? (
          <>
            {trends.map(({ metric, label, unit, query, data }) => (
              <AnalysisResultSection
                key={metric}
                title={label}
                description={
                  data?.trendDirection
                    ? `최근 추세: ${data.trendDirection}`
                    : undefined
                }
                loading={query.isPending}
                error={
                  query.isError ||
                  isResponseError(query.data as ApiResponse<unknown>)
                }
                empty={!data?.periods?.length}
                onRetry={() => void query.refetch()}
              >
                <AnalysisMetricList
                  rows={(data?.periods ?? []).map(period => ({
                    label: period.periodCode
                      ? formatPeriodCode(period.periodCode)
                      : '시점 정보 없음',
                    value: period.value ?? null,
                  }))}
                  unit={unit}
                />
              </AnalysisResultSection>
            ))}
          </>
        ) : null}

        {activeTab === 'benchmark' ? (
          <AnalysisResultSection
            title="비교 분석"
            description={benchmark?.summary ?? undefined}
            loading={benchmarkQuery.isPending}
            error={
              benchmarkQuery.isError ||
              isResponseError(benchmarkQuery.data as ApiResponse<unknown>)
            }
            empty={!hasObjectValues(benchmark)}
            onRetry={() => void benchmarkQuery.refetch()}
          >
            {benchmark?.benchmarkHighlights?.length ? (
              <HighlightList>
                {benchmark.benchmarkHighlights.map(highlight => (
                  <li key={highlight}>{highlight}</li>
                ))}
              </HighlightList>
            ) : (
              <EmptyState
                title="비교 하이라이트가 없어요"
                description="제공된 지역별 매출과 소비 수치를 확인해 주세요."
              />
            )}
            <ComparisonGrid>
              {[
                benchmark?.salesSummary?.district,
                benchmark?.salesSummary?.administration,
                benchmark?.salesSummary?.commercial,
              ].map((item, index) => (
                <ComparisonItem key={item?.code ?? index}>
                  <span>
                    {item?.name ?? ['자치구', '행정동', '상권'][index]}
                  </span>
                  <strong>
                    {formatAnalysisValue(item?.monthlySalesAmount, '원')}
                  </strong>
                </ComparisonItem>
              ))}
            </ComparisonGrid>
          </AnalysisResultSection>
        ) : null}
      </Content>
    </Root>
  )
}
