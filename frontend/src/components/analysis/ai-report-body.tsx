'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import styled from 'styled-components'

import ReportChartSection from '@/components/analysis/ai-report/report-chart-section'
import ReportInsightSection from '@/components/analysis/ai-report/report-insight-section'
import ReportMetricCards from '@/components/analysis/ai-report/report-metric-cards'
import { useAiReport } from '@/hooks/use-ai-report'
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
  fetchCommercialTrend,
} from '@/lib/api/commercial-analysis'
import { fetchCommercialProfile } from '@/lib/api/recommend'
import { getResponseBody } from '@/lib/api/response'
import { useAuthStore } from '@/stores/auth-store'
import type {
  CommercialFootTraffic,
  CommercialSales,
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
  font-size: clamp(20px, 3vw, 26px);
  font-weight: 780;
  line-height: 1.3;
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

  &:hover,
  &:focus-visible {
    background: var(--color-surface-muted);
    color: var(--color-text-900);
    outline: none;
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
  const periodCode = selection.periodCode
  const enabled = Boolean(commercialCode && serviceCode)

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

  const cards = resolveMetricCards({
    profile,
    profileLoading: profileQuery.isLoading,
    growth,
    growthLoading: salesTrendQuery.isLoading,
  })

  // 느린 층: AI 리포트는 로그인 사용자에게만, 전용 페이지에서는 항상 활성으로 조회한다.
  const level = resolveAiReportLevel(selection)
  const code = level ? resolveAiReportTargetCode(selection, level) : null
  const { state, retry } = useAiReport({
    level,
    code,
    serviceCode,
    active: true,
    enabled: hasHydrated && isLoggedIn,
  })
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
          {serviceCode ? <SubLabel>업종 코드 {serviceCode}</SubLabel> : null}
        </Header>
      ) : null}
      {isCommercial ? (
        <>
          <ReportMetricCards cards={cards} variant={variant} />
          <ReportChartSection
            sales={sales}
            foot={foot}
            salesLoading={salesQuery.isLoading}
            footLoading={footQuery.isLoading}
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
        />
      </InsightSection>
      <Footer>
        <FooterLink href={resultHref}>전체 데이터 분석 보기</FooterLink>
      </Footer>
    </Body>
  )
}
