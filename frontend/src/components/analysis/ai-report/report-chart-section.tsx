'use client'

import styled from 'styled-components'

import BarChart from '@/components/analysis/charts/bar-chart'
import { AXIS_UNIT_CAPTION_HEIGHT } from '@/components/analysis/charts/chart-theme'
import PopulationPyramid from '@/components/analysis/charts/population-pyramid'
import { Skeleton } from '@/components/ui/skeleton'
import {
  buildFootAgeGenderPyramid,
  buildFootDayBars,
  buildSalesTimeBars,
} from '@/lib/analysis/commercial-chart-selectors'
import { resolveChartSlot } from '@/lib/analysis/report-section-state'
import type {
  CommercialFootTraffic,
  CommercialSales,
} from '@/types/commercial-analysis'

const Grid = styled.div<{ $variant: 'full' | 'compact' }>`
  display: grid;
  gap: 12px;
  grid-template-columns: 1fr;

  @media (min-width: 768px) {
    grid-template-columns: ${props =>
      props.$variant === 'compact' ? '1fr' : 'repeat(2, minmax(0, 1fr))'};
  }

  @media (min-width: 1080px) {
    grid-template-columns: ${props =>
      props.$variant === 'compact' ? '1fr' : 'repeat(3, minmax(0, 1fr))'};
  }
`

const Card = styled.div`
  display: grid;
  gap: 10px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-control);
  background: var(--color-surface);
  padding: 16px;
`

const CardTitle = styled.span`
  color: var(--color-text-caption);
  font-size: 12px;
  font-weight: 700;
`

const Empty = styled.p`
  padding: 24px 0;
  color: var(--color-text-600);
  font-size: 13px;
  text-align: center;
`

export default function ReportChartSection({
  sales,
  foot,
  salesLoading,
  footLoading,
  variant = 'full',
}: {
  sales: CommercialSales | null
  foot: CommercialFootTraffic | null
  salesLoading: boolean
  footLoading: boolean
  variant?: 'full' | 'compact'
}) {
  const CHART_HEIGHT = variant === 'compact' ? 160 : 200
  // 매출(원)·유동인구(명) 차트는 축 단위 표기가 위에 붙는다. 피라미드(%)는 붙지 않는다.
  const salesTimeBars = buildSalesTimeBars(sales)
  const footDayBars = buildFootDayBars(foot)
  const footPyramidRows = buildFootAgeGenderPyramid(foot)

  const salesTimeSlot = resolveChartSlot(
    salesLoading,
    salesTimeBars.every(row => row.value === null),
  )
  const footDaySlot = resolveChartSlot(
    footLoading,
    footDayBars.every(row => row.value === null),
  )
  const footPyramidSlot = resolveChartSlot(
    footLoading,
    footPyramidRows.every(row => row.male === null && row.female === null),
  )

  return (
    <Grid $variant={variant}>
      <Card aria-busy={salesTimeSlot === 'loading'}>
        <CardTitle>언제 파나 · 시간대별 매출</CardTitle>
        {salesTimeSlot === 'loading' ? (
          <Skeleton
            $height={`${CHART_HEIGHT + AXIS_UNIT_CAPTION_HEIGHT}px`}
            aria-hidden
          />
        ) : salesTimeSlot === 'empty' ? (
          <Empty>데이터 없음</Empty>
        ) : (
          <BarChart
            items={salesTimeBars}
            unit="원"
            ariaLabel="시간대별 매출 막대 차트"
            highlightMax
            height={CHART_HEIGHT}
          />
        )}
      </Card>

      <Card aria-busy={footDaySlot === 'loading'}>
        <CardTitle>언제 붐비나 · 요일별 유동인구</CardTitle>
        {footDaySlot === 'loading' ? (
          <Skeleton
            $height={`${CHART_HEIGHT + AXIS_UNIT_CAPTION_HEIGHT}px`}
            aria-hidden
          />
        ) : footDaySlot === 'empty' ? (
          <Empty>데이터 없음</Empty>
        ) : (
          <BarChart
            items={footDayBars}
            unit="명"
            ariaLabel="요일별 유동인구 막대 차트"
            highlightMax
            height={CHART_HEIGHT}
          />
        )}
      </Card>

      <Card aria-busy={footPyramidSlot === 'loading'}>
        <CardTitle>누가 오나 · 연령·성별 유동인구</CardTitle>
        {footPyramidSlot === 'loading' ? (
          <Skeleton $height={`${CHART_HEIGHT}px`} aria-hidden />
        ) : footPyramidSlot === 'empty' ? (
          <Empty>데이터 없음</Empty>
        ) : (
          <PopulationPyramid
            rows={footPyramidRows}
            unit="%"
            height={CHART_HEIGHT}
          />
        )}
      </Card>
    </Grid>
  )
}
