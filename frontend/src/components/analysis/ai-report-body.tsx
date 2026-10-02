'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import styled from 'styled-components'

import ReportChartSection from '@/components/analysis/ai-report/report-chart-section'
import ReportInsightSection from '@/components/analysis/ai-report/report-insight-section'
import ReportMetricCards from '@/components/analysis/ai-report/report-metric-cards'
import { useAiReport, type AiReportState } from '@/hooks/use-ai-report'
import { useResolvedAnalysisPeriod } from '@/hooks/use-resolved-analysis-period'
import {
  resolveAiReportLevel,
  resolveAiReportTargetCode,
} from '@/lib/analysis/ai-report-presentation'
import { selectSalesGrowth } from '@/lib/analysis/commercial-chart-selectors'
import {
  resolveInsightMode,
  resolveMetricCards,
} from '@/lib/analysis/report-section-state'
import {
  createAiReportHref,
  createAnalysisResultHref,
  type AnalysisSelection,
} from '@/lib/analysis/selection'
import {
  fetchCommercialFootTraffic,
  fetchCommercialSales,
  fetchCommercialServiceCategories,
  fetchCommercialTrend,
} from '@/lib/api/commercial-analysis'
import { fetchCommercialProfile } from '@/lib/api/recommend'
import { getResponseBody } from '@/lib/api/response'
import { useAuthStore } from '@/stores/auth-store'
import type {
  CommercialFootTraffic,
  CommercialSales,
  CommercialServiceCategory,
} from '@/types/commercial-analysis'
import type { CommercialProfile } from '@/types/recommend'

const Body = styled.div<{ $variant: 'full' | 'compact' }>`
  display: grid;
  gap: ${props => (props.$variant === 'compact' ? '16px' : '24px')};
  background: var(--color-surface);
  padding: ${props => (props.$variant === 'compact' ? '16px' : '0')};
`

const Header = styled.header`
  display: grid;
  gap: 4px;
`

const Title = styled.h1`
  color: var(--color-text-900);
  font-size: 26px;
  font-weight: 700;
  line-height: 1.3;

  @media (max-width: 640px) {
    font-size: 20px;
  }
`

const SubLabel = styled.span`
  color: var(--color-text-600);
  font-size: 13px;
  line-height: 18px;
`

const InsightSection = styled.section`
  display: grid;
  gap: 8px;
`

const SectionTitle = styled.h2`
  color: var(--color-text-700);
  font-size: 14px;
  font-weight: 700;
`

const Footer = styled.footer`
  display: flex;
  justify-content: center;
  padding-top: 8px;
`

const FooterLink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 18px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-control);
  background: var(--color-surface);
  color: var(--color-text-700);
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;

  /*
    hover 와 포커스를 한 선택자에 묶고 'outline: none' 까지 두면 키보드 포커스가
    화면에서 사라진다 — 마우스로 지나간 것과 똑같이 보이고, 링도 없다. 배경 변화는
    둘 다 유지하고 포커스에서는 전역 :focus-visible 링을 그대로 살려 둔다.
  */
  &:hover,
  &:focus-visible {
    background: var(--color-surface-muted);
    color: var(--color-text-900);
  }
`

export default function AiReportBody({
  selection,
  variant = 'full',
  title,
}: {
  selection: AnalysisSelection
  variant?: 'full' | 'compact'
  title?: string
}) {
  const hasHydrated = useAuthStore(state => state.hasHydrated)
  const isLoggedIn = useAuthStore(state => state.isLoggedIn)

  const commercialCode = selection.commercialCode
  const serviceCode = selection.serviceCode
  /* URL 에 분기가 없으면 서버 기본 분기로 해석한다(period-catalog.md D5-1). 해석 전에는 요청하지 않는다. */
  const { periodCode: resolvedPeriodCode, catalog: periodCatalog } =
    useResolvedAnalysisPeriod(selection.periodCode)
  const periodCode = resolvedPeriodCode ?? ''
  const periodReady = resolvedPeriodCode !== null
  const enabled = Boolean(commercialCode && serviceCode) && periodReady

  // 빠른 층: 상권 프로필·매출·유동인구·매출 추세를 병렬로 즉시 요청한다.
  // 쿼리 키는 결과 페이지(analysis-result-view)와 동일하게 맞춰 캐시를 공유한다.
  const profileQuery = useQuery({
    queryKey: ['analysis', 'profile', commercialCode, serviceCode, periodCode],
    queryFn: () =>
      fetchCommercialProfile(commercialCode!, serviceCode!, periodCode),
    enabled,
    retry: 1,
  })
  const salesQuery = useQuery({
    queryKey: ['analysis', 'sales', commercialCode, serviceCode, periodCode],
    queryFn: () =>
      fetchCommercialSales(commercialCode!, serviceCode!, periodCode),
    enabled,
    retry: 1,
  })
  const footQuery = useQuery({
    queryKey: ['analysis', 'foot-traffic', commercialCode, periodCode],
    queryFn: () => fetchCommercialFootTraffic(commercialCode!, periodCode),
    enabled: Boolean(commercialCode) && periodReady,
    retry: 1,
  })
  // 쿼리 키를 결과 페이지(analysis-result-view)와 동일하게 맞춰 캐시를 공유한다.
  const servicesQuery = useQuery({
    queryKey: ['analysis', 'services', commercialCode],
    queryFn: () => fetchCommercialServiceCategories(commercialCode!),
    enabled: Boolean(commercialCode),
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
      fetchCommercialTrend(commercialCode!, {
        serviceCode: serviceCode!,
        metricType: 'SALES',
        periodCode,
        periodCount: 4,
      }),
    enabled,
    retry: 1,
  })

  const profile = getResponseBody(profileQuery.data) as CommercialProfile | null
  const sales = getResponseBody(salesQuery.data) as CommercialSales | null
  const foot = getResponseBody(footQuery.data) as CommercialFootTraffic | null
  const growth = selectSalesGrowth(getResponseBody(salesTrendQuery.data))
  const services = getResponseBody(servicesQuery.data) as
    CommercialServiceCategory[] | null
  const serviceName = services?.find(
    item => item.serviceCode === serviceCode,
  )?.serviceName

  /*
    분기를 해석하는 동안(카탈로그 대기)은 쿼리가 꺼져 있어 `isLoading` 이 false 다. 그대로 두면 카드·차트가
    「값 없음」으로 그려진다 — 해석 전도 불러오는 중으로 본다.
  */
  const periodPending = !periodReady && !periodCatalog.isUnavailable
  const cards = resolveMetricCards({
    profile,
    profileLoading: profileQuery.isLoading || periodPending,
    growth,
    growthLoading: salesTrendQuery.isLoading || periodPending,
  })

  // 느린 층: AI 리포트는 로그인 사용자에게만, 전용 페이지에서는 항상 활성으로 조회한다.
  const level = resolveAiReportLevel(selection)
  const code = level ? resolveAiReportTargetCode(selection, level) : null
  const { state: reportState, retry: retryReport } = useAiReport({
    level,
    code,
    serviceCode,
    periodCode: resolvedPeriodCode,
    active: true,
    enabled: hasHydrated && isLoggedIn,
  })
  /*
    분기를 정하기 전에는 useAiReport 가 idle 이라 「표시할 내용이 없어요」로 읽힌다. 해석 중이면 불러오는 중,
    카탈로그를 끝내 못 받았으면 재시도할 수 있는 오류로 바꾼다(period-catalog.md D5-3).
  */
  const state: AiReportState = periodPending
    ? { status: 'loading', stage: null, progressMessages: [] }
    : !periodReady
      ? {
          status: 'error',
          message:
            '분석 기준 분기를 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.',
          errorKind: 'unavailable',
          canRetry: true,
        }
      : reportState
  const retry = periodReady ? retryReport : periodCatalog.refetch
  const insightMode = resolveInsightMode({
    hydrated: hasHydrated,
    isLoggedIn,
    state,
  })

  // 로그인 후 되돌아올 리다이렉트 대상은 전체 selection(구/행정동/상권/업종/기간)을
  // 보존해야 한다 — serviceCode가 빠지면 로그인 후에도 프로필·매출·추세 쿼리가
  // enabled=false로 멈춰 지표·차트가 영구히 비고 AI 인사이트도 idle에 고립된다.
  const loginHref = useMemo(
    () =>
      `/login?redirect=${encodeURIComponent(createAiReportHref(selection))}`,
    [selection],
  )
  const resultHref = createAnalysisResultHref(selection, 'summary')

  // 커머셜(상권) v1 스코프: 지표 카드·차트는 상권 데이터 전용이라 자치구/행정동
  // 레벨에서는 렌더하지 않는다(비어있는 카드/차트 대신 AI 텍스트 리포트만 노출).
  const isCommercial = level === 'commercial'

  return (
    <Body $variant={variant}>
      {variant !== 'compact' ? (
        <Header>
          <Title>{title ?? profile?.commercialName ?? '상권 리포트'}</Title>
          {serviceCode ? (
            <SubLabel>업종 · {serviceName ?? serviceCode}</SubLabel>
          ) : null}
        </Header>
      ) : null}
      {isCommercial ? (
        <>
          <ReportMetricCards cards={cards} variant={variant} />
          <ReportChartSection
            sales={sales}
            foot={foot}
            salesLoading={salesQuery.isLoading || periodPending}
            footLoading={footQuery.isLoading || periodPending}
            variant={variant}
          />
        </>
      ) : null}
      <InsightSection>
        <SectionTitle>AI 인사이트</SectionTitle>
        <ReportInsightSection
          mode={insightMode}
          state={state}
          loginHref={loginHref}
          onRetry={retry}
          variant={variant}
        />
      </InsightSection>
      <Footer>
        <FooterLink href={resultHref}>전체 데이터 분석 보기</FooterLink>
      </Footer>
    </Body>
  )
}
