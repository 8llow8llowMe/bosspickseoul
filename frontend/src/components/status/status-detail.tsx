'use client'

import type { ReactNode, Ref } from 'react'
import { ArrowLeft, X } from 'lucide-react'
import styled from 'styled-components'
import BarChart from '@/components/analysis/charts/bar-chart'
import DonutChart from '@/components/analysis/charts/donut-chart'
import HorizontalBarChart from '@/components/analysis/charts/horizontal-bar-chart'
import LineChart from '@/components/analysis/charts/line-chart'
import { Skeleton } from '@/components/ui/skeleton'
import type { GenderSegment, TrendPoint } from '@/lib/analysis/chart-data'
import {
  type AnalysisMetricRow,
  formatPeriodCode,
} from '@/lib/analysis/presentation'
import {
  formatMonths,
  formatSinoUnit,
  formatStatusChange,
  formatStatusValue,
} from '@/lib/status/status-formatters'
import type {
  DistrictDetail,
  StatusMetric,
  StatusRankedItem,
} from '@/types/status'

type StatusDetailProps = {
  metric: StatusMetric
  selectedItem: StatusRankedItem | null
  detail: DistrictDetail | null
  isLoading: boolean
  errorMessage: string | null
  onRetry: () => void
  onBack?: () => void
  backButtonRef?: Ref<HTMLButtonElement>
  onClose?: () => void
}

type ChangeTone = 'danger' | 'neutral' | 'success' | 'warning'

type DetailRow = {
  label: string
  value: string
}

const TIME_SLOT_LABELS = [
  ['00~06시', 'footTrafficTime00To06'],
  ['06~11시', 'footTrafficTime06To11'],
  ['11~14시', 'footTrafficTime11To14'],
  ['14~17시', 'footTrafficTime14To17'],
  ['17~21시', 'footTrafficTime17To21'],
  ['21~24시', 'footTrafficTime21To24'],
] as const

const AGE_GROUP_LABELS = [
  ['10대', 'age10FootTraffic'],
  ['20대', 'age20FootTraffic'],
  ['30대', 'age30FootTraffic'],
  ['40대', 'age40FootTraffic'],
  ['50대', 'age50FootTraffic'],
  ['60대 이상', 'age60PlusFootTraffic'],
] as const

const DAY_OF_WEEK_LABELS = [
  ['월요일', 'mondayFootTraffic'],
  ['화요일', 'tuesdayFootTraffic'],
  ['수요일', 'wednesdayFootTraffic'],
  ['목요일', 'thursdayFootTraffic'],
  ['금요일', 'fridayFootTraffic'],
  ['토요일', 'saturdayFootTraffic'],
  ['일요일', 'sundayFootTraffic'],
] as const

const koreanIntegerFormatter = new Intl.NumberFormat('ko-KR')

const isFiniteNumber = (value: number | null | undefined): value is number =>
  typeof value === 'number' && Number.isFinite(value)

// 금액은 억/만 단위(만 단위 반올림)로 축약 표기한다.
const formatMoney = (value: number | null | undefined): string =>
  formatSinoUnit(value, '원')

// 점포 개수 등 소규모 정수는 콤마 + 단위로 표기한다.
const formatCount = (value: number): string =>
  `${koreanIntegerFormatter.format(value)}개`

// 라벨↔키 정의로 차트용 행({label, value})을 만든다. 숫자가 아니면 value=null.
const toChartRows = <T,>(
  source: T | null | undefined,
  definitions: readonly (readonly [label: string, key: keyof T])[],
): AnalysisMetricRow[] =>
  definitions.map(([label, key]) => {
    const value = source?.[key]
    return {
      label,
      value: typeof value === 'number' && Number.isFinite(value) ? value : null,
    }
  })

const getChangeTone = (
  metric: StatusMetric,
  changeRate: number,
): ChangeTone => {
  if (!Number.isFinite(changeRate) || changeRate === 0) {
    return 'neutral'
  }

  if (metric === 'closed') {
    return changeRate > 0 ? 'danger' : 'success'
  }

  return changeRate > 0 ? 'success' : 'warning'
}

const Root = styled.article`
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  box-shadow: var(--shadow-level-1);
`

const Header = styled.header`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 20px;
  border-bottom: 1px solid var(--color-border-200);
`

const HeaderMain = styled.div`
  min-width: 0;
  display: flex;
  flex: 1 1 auto;
  align-items: flex-start;
  gap: 12px;
`

const HeaderContent = styled.div`
  min-width: 0;
  display: grid;
  flex: 1 1 auto;
  gap: 8px;
`

const BackButton = styled.button`
  width: 44px;
  height: 44px;
  min-width: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-control);
  background: var(--color-surface);
  color: var(--color-text-800);
  cursor: pointer;

  &:hover {
    border-color: var(--color-primary-600);
    color: var(--color-text-900);
  }

  &:focus-visible {
    outline: 2px solid var(--color-primary-600);
    outline-offset: 2px;
  }
`

const Title = styled.h2`
  color: var(--color-text-900);
  font-size: 22px;
  font-weight: 700;
  line-height: 30px;
`

// 값(00명)과 변화(감소 -x%)를 한 줄에 가로로 붙여 컴팩트하게 보여준다.
const HeaderMetric = styled.div`
  display: flex;
  flex-wrap: nowrap;
  align-items: baseline;
  gap: 10px;
`

const HeaderValue = styled.strong`
  color: var(--color-text-900);
  font-size: 20px;
  font-variant-numeric: tabular-nums;
  line-height: 28px;
`

const HeaderChange = styled.span<{ $tone: ChangeTone }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding-left: 8px;
  border-left: 3px solid
    ${props => {
      if (props.$tone === 'danger') return 'var(--color-danger)'
      if (props.$tone === 'success') return 'var(--color-success)'
      if (props.$tone === 'warning') return 'var(--color-warning)'
      return 'var(--color-border-300)'
    }};
  color: var(--color-text-800);
  font-size: 14px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
`

const CloseButton = styled.button`
  width: 40px;
  height: 40px;
  min-width: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-control);
  background: var(--color-surface);
  color: var(--color-text-700);
  cursor: pointer;

  &:hover {
    border-color: var(--color-primary-600);
    color: var(--color-text-900);
  }

  &:focus-visible {
    outline: 2px solid var(--color-primary-600);
    outline-offset: 2px;
  }
`

const Body = styled.div`
  display: grid;
  gap: 24px;
  padding: 20px;
`

// 드롭다운 대신 보고서 방식: 그룹 제목(유동인구/점포/매출) 아래에 데이터를 나열한다.
const ReportSection = styled.section`
  display: grid;
  gap: 14px;
`

const GroupHeading = styled.h3`
  color: var(--color-text-900);
  font-size: 16px;
  font-weight: 700;
  line-height: 24px;
`

// 넓은 상세 폭을 활용해 차트를 세로 나열이 아니라 2열 그리드로 배치한다.
const ChartGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;

  & > * {
    min-width: 0;
  }

  @media (min-width: 768px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`

const ChartCard = styled.div<{ $full?: boolean }>`
  min-width: 0;
  display: grid;
  gap: 10px;
  align-content: start;
  padding: 16px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);

  ${props => (props.$full ? 'grid-column: 1 / -1;' : '')}
`

const CardTitle = styled.h4`
  color: var(--color-text-800);
  font-size: 14px;
  font-weight: 700;
  line-height: 22px;
`

const CardDescription = styled.p`
  color: var(--color-text-600);
  font-size: 13px;
  line-height: 20px;
`

const RowList = styled.dl`
  display: grid;
  gap: 1px;
  overflow: hidden;
  border-radius: var(--radius-control);
  background: var(--color-border-200);
`

const Row = styled.div`
  min-height: 40px;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 12px;
  background: var(--color-surface-muted);
`

const RowLabel = styled.dt`
  flex: 0 0 auto;
  max-width: 55%;
  min-width: 0;
  overflow: hidden;
  color: var(--color-text-700);
  font-size: 13px;
  line-height: 20px;
  white-space: nowrap;
  text-overflow: ellipsis;
`

// 값이 길면(예: "774억 4039만원 · -20.1%") 라벨을 덮지 않고 다음 줄로 접힌다.
const RowValue = styled.dd`
  flex: 1 1 auto;
  min-width: 0;
  color: var(--color-text-900);
  font-size: 13px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  text-align: right;
  word-break: break-word;
`

const EmptyMessage = styled.p`
  padding: 20px 12px;
  color: var(--color-text-600);
  font-size: 14px;
  text-align: center;
`

const LoadingBody = styled.div`
  display: grid;
  gap: 12px;
  padding: 20px;
`

const ErrorBody = styled.div`
  display: grid;
  justify-items: start;
  gap: 12px;
  padding: 24px 20px;
`

const ErrorTitle = styled.h3`
  color: var(--color-text-900);
  font-size: 16px;
  font-weight: 700;
`

const ErrorMessage = styled.p`
  color: var(--color-text-600);
  font-size: 14px;
  line-height: 22px;
`

const RetryButton = styled.button`
  min-height: 44px;
  padding: 0 16px;
  border: 1px solid var(--color-text-900);
  border-radius: var(--radius-control);
  background: var(--color-text-900);
  color: var(--color-surface);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;

  &:hover {
    border-color: var(--color-text-800);
    background: var(--color-text-800);
  }
`

const VisuallyHidden = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  white-space: nowrap;
`

const getChangeCue = (metric: StatusMetric, changeRate: number): string => {
  if (!Number.isFinite(changeRate)) return '변화율'
  if (changeRate === 0) return '변동 없음'
  if (metric === 'closed') return changeRate > 0 ? '주의' : '개선'
  return changeRate > 0 ? '증가' : '감소'
}

function DetailRows({ rows }: { rows: DetailRow[] }) {
  if (rows.length === 0) {
    return <EmptyMessage>데이터 없음</EmptyMessage>
  }

  return (
    <RowList>
      {rows.map((row, index) => (
        <Row key={`${row.label}-${index}`}>
          <RowLabel>{row.label}</RowLabel>
          <RowValue>{row.value}</RowValue>
        </Row>
      ))}
    </RowList>
  )
}

// 차트 카드: 제목 + (제목과 다를 때만) 설명 캡션 + 차트/데이터.
function ChartPanel({
  title,
  description,
  full,
  children,
}: {
  title: string
  description?: string | null
  full?: boolean
  children: ReactNode
}) {
  const desc = description?.trim()
  return (
    <ChartCard $full={full}>
      <CardTitle>{title}</CardTitle>
      {desc && desc !== title ? (
        <CardDescription>{desc}</CardDescription>
      ) : null}
      {children}
    </ChartCard>
  )
}

function ChangeIndicatorSection({ detail }: { detail: DistrictDetail }) {
  const indicator = detail.changeIndicator
  const rows: DetailRow[] = []
  const indicatorName = indicator?.changeIndicatorName?.trim()

  if (indicatorName) {
    rows.push({ label: '변화 지표', value: indicatorName })
  }
  if (isFiniteNumber(indicator?.averageOpenedMonths)) {
    rows.push({
      label: '평균 개업 영업 기간',
      value: formatMonths(indicator.averageOpenedMonths),
    })
  }
  if (isFiniteNumber(indicator?.averageClosedMonths)) {
    rows.push({
      label: '평균 폐업 영업 기간',
      value: formatMonths(indicator.averageClosedMonths),
    })
  }

  return (
    <ReportSection>
      <GroupHeading>상권 변화 지표</GroupHeading>
      <DetailRows rows={rows} />
    </ReportSection>
  )
}

function FootTrafficSection({ detail }: { detail: DistrictDetail }) {
  const footTraffic = detail.footTraffic
  const periodPoints: TrendPoint[] = (
    footTraffic?.periodTotalFootTrafficList ?? []
  ).flatMap(item =>
    item?.periodCode && isFiniteNumber(item.totalFootTraffic)
      ? [
          {
            periodLabel: formatPeriodCode(item.periodCode),
            value: item.totalFootTraffic,
            changeRate: null,
          },
        ]
      : [],
  )
  const timeRows = toChartRows(footTraffic?.timeSlot, TIME_SLOT_LABELS)
  const ageRows = toChartRows(footTraffic?.ageGroup, AGE_GROUP_LABELS)
  const dayRows = toChartRows(footTraffic?.dayOfWeek, DAY_OF_WEEK_LABELS)

  const genderSegments: GenderSegment[] = []
  const maleFootTraffic = footTraffic?.gender?.maleFootTraffic
  const femaleFootTraffic = footTraffic?.gender?.femaleFootTraffic
  if (isFiniteNumber(maleFootTraffic)) {
    genderSegments.push({ label: '남성', value: maleFootTraffic })
  }
  if (isFiniteNumber(femaleFootTraffic)) {
    genderSegments.push({ label: '여성', value: femaleFootTraffic })
  }

  return (
    <ReportSection>
      <GroupHeading>유동인구</GroupHeading>
      <ChartGrid>
        <ChartPanel
          full
          description={footTraffic?.periodTrend?.description}
          title="분기별 추이"
        >
          <LineChart
            ariaLabel="분기별 유동인구 추이"
            height={200}
            points={periodPoints}
            unit="명"
          />
        </ChartPanel>
        <ChartPanel
          description={footTraffic?.timeSlot?.dominantTimeSlotType?.description}
          title="시간대별 유동인구"
        >
          <BarChart
            ariaLabel="시간대별 유동인구"
            height={200}
            items={timeRows}
            unit="명"
          />
        </ChartPanel>
        <ChartPanel
          description={
            footTraffic?.dayOfWeek?.dominantDayOfWeekType?.description
          }
          title="요일별 유동인구"
        >
          <BarChart
            ariaLabel="요일별 유동인구"
            height={200}
            items={dayRows}
            unit="명"
          />
        </ChartPanel>
        <ChartPanel
          description={footTraffic?.ageGroup?.dominantAgeGroupType?.description}
          title="연령대별 유동인구"
        >
          <BarChart
            ariaLabel="연령대별 유동인구"
            height={200}
            items={ageRows}
            unit="명"
          />
        </ChartPanel>
        <ChartPanel
          description={footTraffic?.gender?.dominantGenderType?.description}
          title="성별 유동인구"
        >
          <DonutChart
            ariaLabel="성별 유동인구 비율"
            segments={genderSegments}
          />
        </ChartPanel>
      </ChartGrid>
    </ReportSection>
  )
}

function StoreSection({ detail }: { detail: DistrictDetail }) {
  const store = detail.store
  const serviceRows: AnalysisMetricRow[] = (
    store?.topStoreServices ?? []
  ).flatMap(item =>
    item?.serviceName && isFiniteNumber(item.totalStoreCount)
      ? [{ label: item.serviceName, value: item.totalStoreCount }]
      : [],
  )
  const openedRows: AnalysisMetricRow[] = (
    store?.topOpenedAdministrations ?? []
  ).flatMap(item =>
    item?.administrationName && isFiniteNumber(item.openedStoreCount)
      ? [{ label: item.administrationName, value: item.openedStoreCount }]
      : [],
  )
  const closedRows: AnalysisMetricRow[] = (
    store?.topClosedAdministrations ?? []
  ).flatMap(item =>
    item?.administrationName && isFiniteNumber(item.closedStoreCount)
      ? [{ label: item.administrationName, value: item.closedStoreCount }]
      : [],
  )

  return (
    <ReportSection>
      <GroupHeading>점포</GroupHeading>
      <ChartGrid>
        <ChartPanel full title="업종별 점포수">
          <HorizontalBarChart
            ariaLabel="업종별 점포수"
            items={serviceRows}
            unit="개"
            valueFormatter={formatCount}
          />
        </ChartPanel>
        <ChartPanel title="행정동별 개업">
          <HorizontalBarChart
            ariaLabel="행정동별 개업 점포수"
            items={openedRows}
            unit="개"
            valueFormatter={formatCount}
          />
        </ChartPanel>
        <ChartPanel title="행정동별 폐업">
          <HorizontalBarChart
            ariaLabel="행정동별 폐업 점포수"
            items={closedRows}
            unit="개"
            valueFormatter={formatCount}
          />
        </ChartPanel>
      </ChartGrid>
    </ReportSection>
  )
}

function SalesSection({ detail }: { detail: DistrictDetail }) {
  const sales = detail.sales
  const serviceRows: AnalysisMetricRow[] = (
    sales?.topSalesServices ?? []
  ).flatMap(item =>
    item?.serviceName && isFiniteNumber(item.salesChangeRate)
      ? [{ label: item.serviceName, value: item.salesChangeRate }]
      : [],
  )
  const administrationRows: AnalysisMetricRow[] = (
    sales?.topSalesAdministrations ?? []
  ).flatMap(item =>
    item?.administrationName && isFiniteNumber(item.totalSalesAmount)
      ? [{ label: item.administrationName, value: item.totalSalesAmount }]
      : [],
  )

  return (
    <ReportSection>
      <GroupHeading>매출</GroupHeading>
      <ChartGrid>
        <ChartPanel title="업종별 매출 변화율">
          <HorizontalBarChart
            ariaLabel="업종별 매출 변화율"
            diverging
            items={serviceRows}
            unit="%"
            valueFormatter={formatStatusChange}
          />
        </ChartPanel>
        <ChartPanel title="행정동별 매출">
          <HorizontalBarChart
            ariaLabel="행정동별 매출액"
            items={administrationRows}
            unit="원"
            valueFormatter={formatMoney}
          />
        </ChartPanel>
      </ChartGrid>
    </ReportSection>
  )
}

function DetailHeader({
  metric,
  selectedItem,
  onBack,
  backButtonRef,
  onClose,
}: Pick<
  StatusDetailProps,
  'metric' | 'selectedItem' | 'onBack' | 'backButtonRef' | 'onClose'
>) {
  return (
    <Header>
      <HeaderMain>
        {onBack ? (
          <BackButton
            ref={backButtonRef}
            aria-label="상위 10개로 돌아가기"
            type="button"
            onClick={onBack}
          >
            <ArrowLeft aria-hidden="true" size={20} strokeWidth={2} />
          </BackButton>
        ) : null}
        <HeaderContent>
          <Title>
            {selectedItem ? `${selectedItem.districtName} 상세` : '자치구 상세'}
          </Title>
          {selectedItem ? (
            <HeaderMetric>
              <HeaderValue>
                {formatStatusValue(metric, selectedItem.value)}
              </HeaderValue>
              <HeaderChange
                $tone={getChangeTone(metric, selectedItem.changeRate)}
              >
                <span>{getChangeCue(metric, selectedItem.changeRate)}</span>
                <span>{formatStatusChange(selectedItem.changeRate)}</span>
              </HeaderChange>
            </HeaderMetric>
          ) : null}
        </HeaderContent>
      </HeaderMain>
      {onClose ? (
        <CloseButton aria-label="상세 닫기" type="button" onClick={onClose}>
          <X aria-hidden="true" size={20} strokeWidth={2} />
        </CloseButton>
      ) : null}
    </Header>
  )
}

export default function StatusDetail({
  metric,
  selectedItem,
  detail,
  isLoading,
  errorMessage,
  onRetry,
  onBack,
  backButtonRef,
  onClose,
}: StatusDetailProps) {
  return (
    <Root aria-busy={isLoading || undefined}>
      <DetailHeader
        backButtonRef={backButtonRef}
        metric={metric}
        onBack={onBack}
        onClose={onClose}
        selectedItem={selectedItem}
      />
      {isLoading ? (
        <LoadingBody aria-live="polite">
          <VisuallyHidden>
            자치구 상세 데이터를 불러오는 중입니다.
          </VisuallyHidden>
          <Skeleton $height="48px" />
          <Skeleton $height="48px" />
          <Skeleton $height="48px" />
          <Skeleton $height="48px" />
        </LoadingBody>
      ) : errorMessage !== null ? (
        <ErrorBody aria-live="assertive">
          <ErrorTitle>상세 현황을 불러오지 못했어요</ErrorTitle>
          <ErrorMessage>
            {errorMessage.trim() || '잠시 후 다시 시도해 주세요.'}
          </ErrorMessage>
          <RetryButton type="button" onClick={onRetry}>
            다시 시도
          </RetryButton>
        </ErrorBody>
      ) : detail ? (
        <Body>
          <ChangeIndicatorSection detail={detail} />
          <FootTrafficSection detail={detail} />
          <StoreSection detail={detail} />
          <SalesSection detail={detail} />
        </Body>
      ) : (
        <Body>
          <EmptyMessage>데이터 없음</EmptyMessage>
        </Body>
      )}
    </Root>
  )
}
