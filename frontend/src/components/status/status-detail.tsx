'use client'

import type { ReactNode, Ref } from 'react'
import { ArrowLeft, X } from 'lucide-react'
import styled from 'styled-components'
import BarChart from '@/components/analysis/charts/bar-chart'
import DonutChart from '@/components/analysis/charts/donut-chart'
import HorizontalBarChart from '@/components/analysis/charts/horizontal-bar-chart'
import {
  createDistrictAdministrationHref,
  createDistrictServiceHref,
  formatChangeSuffix,
  formatRateSuffix,
} from '@/lib/status/status-links'
import LineChart from '@/components/analysis/charts/line-chart'
import { Skeleton } from '@/components/ui/skeleton'
import { isRetryable, type NormalizedApiError } from '@/lib/api/api-error'
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
  /**
   * 정규화된 API 오류(`resolveApiError(query)`). 성공이면 null.
   * `kind === 'not-found'`면 데이터 부재이므로 재시도 버튼을 렌더하지 않는다.
   */
  error: NormalizedApiError | null
  onRetry: () => void
  onBack?: () => void
  backButtonRef?: Ref<HTMLButtonElement>
  onClose?: () => void
  /** 'sheet'는 모바일 바텀시트용 컴팩트 헤더(작은 뒤로가기·제목)를 적용한다. */
  variant?: 'panel' | 'sheet'
}

type ChangeTone = 'danger' | 'neutral' | 'success' | 'warning'

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

// 유동인구(명)도 억/만 단위로 축약해 툴팁이 "123,124,234명"처럼 길게 뜨지 않게 한다.
const formatPeople = (value: number): string => formatSinoUnit(value, '명')

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

const Header = styled.header<{ $compact?: boolean }>`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${props => (props.$compact ? '12px' : '16px')};
  padding: ${props => (props.$compact ? '14px 16px' : '20px')};
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

// compact 는 모바일 바텀시트 헤더다. 시각 크기 28px 은 컴팩트 헤더의 여백 규격이라
// 유지하되, DESIGN.md 753행 「모바일 헤더 액션 최소 40px」을 만족하도록 ::after 로
// 히트 영역만 40px 로 넓힌다(레이아웃 비점유라 헤더 높이가 밀리지 않는다).
const BackButton = styled.button<{ $compact?: boolean }>`
  position: relative;
  width: ${props => (props.$compact ? '28px' : '44px')};
  height: ${props => (props.$compact ? '28px' : '44px')};
  min-width: ${props => (props.$compact ? '28px' : '44px')};
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

  &::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: max(100%, 40px);
    height: max(100%, 40px);
    transform: translate(-50%, -50%);
  }
`

const Title = styled.h2<{ $compact?: boolean }>`
  color: var(--color-text-900);
  font-size: ${props => (props.$compact ? '16px' : '22px')};
  font-weight: 700;
  line-height: ${props => (props.$compact ? '22px' : '30px')};
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

const changeToneColor = (tone: ChangeTone): string => {
  if (tone === 'danger') return 'var(--color-danger)'
  if (tone === 'success') return 'var(--color-success)'
  if (tone === 'warning') return 'var(--color-warning)'
  return 'var(--color-border-300)'
}

const HeaderChange = styled.span<{ $tone: ChangeTone }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 10px;
  border-radius: var(--radius-pill);
  background: ${props =>
    `color-mix(in srgb, ${changeToneColor(props.$tone)} 10%, var(--color-surface))`};
  /* 테두리는 StatusCallout 과 같은 20% 다. 이게 없으면 neutral(=border-300, #d1d6db)
     처럼 대비가 낮은 tone 은 흰 배경 위에서 틴트가 사라져 칩이 아니라 맨 텍스트로 보인다
     — 같은 행에서 tone 마다 모양이 달라진다. */
  border: 1px solid
    ${props =>
      `color-mix(in srgb, ${changeToneColor(props.$tone)} 20%, transparent)`};
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

// 상권 흐름: 서울시 상권변화지표(운영/폐업 영업개월을 서울 평균과 비교한 4분류)를
// 소상공인이 바로 이해하도록 평서문 헤드라인 + 근거 문장으로 풀어 보여준다.
// 개업/폐업 평균 영업기간은 그 판단의 근거이므로 아래 스탯 타일로 함께 둔다.
type IndicatorTone = 'success' | 'info' | 'warning' | 'danger'

const INDICATOR_COPY: Record<
  string,
  { headline: string; body: string; tone: IndicatorTone }
> = {
  상권확장: {
    headline: '확장되는 상권이에요',
    body: '점포가 오래 유지되고 새로 여는 가게도 자리를 잡는, 커지는 상권이에요.',
    tone: 'success',
  },
  다이나믹: {
    headline: '변화가 활발한 상권이에요',
    body: '새 가게 유입과 교체가 빠른, 역동적인 상권이에요.',
    tone: 'info',
  },
  정체: {
    headline: '정체된 상권이에요',
    body: '새 유입이 적어 큰 변화 없이 머물러 있는 상권이에요.',
    tone: 'warning',
  },
  상권축소: {
    headline: '위축되는 상권이에요',
    body: '점포가 오래 버티지 못하고 줄어드는, 축소되는 상권이에요.',
    tone: 'danger',
  },
}

const toneColor = (tone: IndicatorTone): string => {
  if (tone === 'success') return 'var(--color-success)'
  if (tone === 'warning') return 'var(--color-warning)'
  if (tone === 'danger') return 'var(--color-danger)'
  return 'var(--color-primary-600)'
}

// 톤은 좌측 선이 아니라 배경 틴트로 전한다(기존 토큰에서 color-mix로 파생 →
// 새 토큰 없이 다크모드 자동 대응). 선은 같은 색 계열로 은은하게만.
const StatusCallout = styled.div<{ $tone: IndicatorTone }>`
  display: grid;
  gap: 6px;
  padding: 14px 16px;
  border-radius: var(--radius-card);
  background: ${props =>
    `color-mix(in srgb, ${toneColor(props.$tone)} 9%, var(--color-surface))`};
  border: 1px solid
    ${props => `color-mix(in srgb, ${toneColor(props.$tone)} 20%, transparent)`};
`

const StatusHeadline = styled.strong`
  color: var(--color-text-900);
  font-size: 16px;
  font-weight: 700;
  line-height: 24px;
`

const StatusBody = styled.p`
  color: var(--color-text-600);
  font-size: 13px;
  line-height: 20px;
`

// 원 분류명(다이나믹 등)을 근거 문장 끝에 작게 붙여 서울시 용어와의 연결을 남긴다.
const StatusTag = styled.span`
  color: var(--color-text-500);
  font-weight: 600;
`

/*
  auto-fit 은 열 수에 상한이 없다. 셸에서 폭 상한을 걷어낸 뒤 2560px 칸에서
  18열까지 갔다. CSS 에 max-columns 가 없으므로 그리드 자체에 폭 상한을 건다.
  최소 트랙을 140 -> 200 으로 올려 지표 카드 가독성도 함께 올린다.

  (테스트가 단독 렌더해야 해서 export 한다 — 화면 전체를 렌더하면 SSR 에서
  쿼리가 pending 이라 스켈레톤만 그려져 이 스타일이 시트에 나오지 않는다.)
*/
export const StatGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  max-width: var(--w-wide);
  gap: 12px;
`

const StatTile = styled.div`
  display: grid;
  gap: 6px;
  padding: 14px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface-muted);
`

const StatLabel = styled.span`
  color: var(--color-text-600);
  font-size: 13px;
  line-height: 18px;
`

const StatValue = styled.strong`
  color: var(--color-text-900);
  font-size: 20px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 26px;
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
  const indicatorName = indicator?.changeIndicatorName?.trim()
  const copy = indicatorName ? INDICATOR_COPY[indicatorName] : undefined
  const openedMonths = indicator?.averageOpenedMonths
  const closedMonths = indicator?.averageClosedMonths
  const hasAnyStat =
    isFiniteNumber(openedMonths) || isFiniteNumber(closedMonths)

  if (!indicatorName && !hasAnyStat) {
    return (
      <ReportSection>
        <GroupHeading>상권 흐름</GroupHeading>
        {/* DESIGN.md §Empty: 왜 비었는지 한 줄. 값 자리의 `데이터 없음` 표기와 달리
            여기는 섹션 전체의 빈 상태라 사유가 드러나야 한다. */}
        <EmptyMessage>
          이 자치구는 상권 흐름 지표가 아직 집계되지 않았어요.
        </EmptyMessage>
      </ReportSection>
    )
  }

  return (
    <ReportSection>
      <GroupHeading>상권 흐름</GroupHeading>
      {indicatorName ? (
        <StatusCallout $tone={copy?.tone ?? 'info'}>
          <StatusHeadline>
            {copy ? copy.headline : indicatorName}
          </StatusHeadline>
          {copy ? (
            <StatusBody>
              {copy.body} <StatusTag>· {indicatorName}</StatusTag>
            </StatusBody>
          ) : null}
        </StatusCallout>
      ) : null}
      {hasAnyStat ? (
        <StatGrid>
          <StatTile>
            <StatLabel>개업 매장 평균 영업 기간</StatLabel>
            <StatValue>
              {isFiniteNumber(openedMonths)
                ? formatMonths(openedMonths)
                : '데이터 없음'}
            </StatValue>
          </StatTile>
          <StatTile>
            <StatLabel>폐업 매장 평균 영업 기간</StatLabel>
            <StatValue>
              {isFiniteNumber(closedMonths)
                ? formatMonths(closedMonths)
                : '데이터 없음'}
            </StatValue>
          </StatTile>
        </StatGrid>
      ) : null}
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
            valueFormatter={formatPeople}
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
            valueFormatter={formatPeople}
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
            valueFormatter={formatPeople}
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
            valueFormatter={formatPeople}
          />
        </ChartPanel>
        <ChartPanel
          description={footTraffic?.gender?.dominantGenderType?.description}
          title="성별 유동인구"
        >
          <DonutChart
            ariaLabel="성별 유동인구 비율"
            segments={genderSegments}
            unit="명"
            valueFormatter={formatPeople}
          />
        </ChartPanel>
      </ChartGrid>
    </ReportSection>
  )
}

function StoreSection({
  detail,
  districtCode,
}: {
  detail: DistrictDetail
  districtCode: string | null
}) {
  const store = detail.store
  const serviceRows: AnalysisMetricRow[] = (
    store?.topStoreServices ?? []
  ).flatMap(item =>
    item?.serviceName && isFiniteNumber(item.totalStoreCount)
      ? [
          {
            label: item.serviceName,
            value: item.totalStoreCount,
            href: createDistrictServiceHref(districtCode, item.serviceCode),
          },
        ]
      : [],
  )
  const openedRows: AnalysisMetricRow[] = (
    store?.topOpenedAdministrations ?? []
  ).flatMap(item =>
    item?.administrationName && isFiniteNumber(item.openedStoreCount)
      ? [
          {
            label: item.administrationName,
            value: item.openedStoreCount,
            href: createDistrictAdministrationHref(
              districtCode,
              item.administrationCode,
            ),
            subLabel: formatRateSuffix('개업률', item.openingRate),
          },
        ]
      : [],
  )
  const closedRows: AnalysisMetricRow[] = (
    store?.topClosedAdministrations ?? []
  ).flatMap(item =>
    item?.administrationName && isFiniteNumber(item.closedStoreCount)
      ? [
          {
            label: item.administrationName,
            value: item.closedStoreCount,
            href: createDistrictAdministrationHref(
              districtCode,
              item.administrationCode,
            ),
            subLabel: formatRateSuffix('폐업률', item.closureRate),
          },
        ]
      : [],
  )

  return (
    <ReportSection>
      <GroupHeading>점포</GroupHeading>
      <ChartGrid>
        {/*
          `full` 을 뗐다. 이 칸만 2열을 다 차지해 막대가 800px 까지 늘어났고
          형제 차트(약 12:1)와 달리 홀로 약 31:1 이 됐다 — 라벨과 값이 멀어져
          어느 줄의 값인지 잇기 어려웠다. 가로 막대는 같은 폭으로 나란히 둔다.
        */}
        <ChartPanel title="업종별 점포수">
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

function SalesSection({
  detail,
  districtCode,
}: {
  detail: DistrictDetail
  districtCode: string | null
}) {
  const sales = detail.sales
  const serviceRows: AnalysisMetricRow[] = (
    sales?.topSalesServices ?? []
  ).flatMap(item =>
    item?.serviceName && isFiniteNumber(item.salesChangeRate)
      ? [
          {
            label: item.serviceName,
            value: item.salesChangeRate,
            href: createDistrictServiceHref(districtCode, item.serviceCode),
          },
        ]
      : [],
  )
  const administrationRows: AnalysisMetricRow[] = (
    sales?.topSalesAdministrations ?? []
  ).flatMap(item =>
    item?.administrationName && isFiniteNumber(item.totalSalesAmount)
      ? [
          {
            label: item.administrationName,
            value: item.totalSalesAmount,
            href: createDistrictAdministrationHref(
              districtCode,
              item.administrationCode,
            ),
            /* 업종별 매출 변화율 차트는 값 자체가 증감률이라 보조 표기가 중복이다.
               행정동별 매출은 값이 금액이므로 증감률을 여기서 함께 적는다. */
            subLabel: formatChangeSuffix(item.salesChangeRate),
          },
        ]
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
  variant = 'panel',
}: Pick<
  StatusDetailProps,
  'metric' | 'selectedItem' | 'onBack' | 'backButtonRef' | 'onClose' | 'variant'
>) {
  const compact = variant === 'sheet'
  return (
    <Header $compact={compact}>
      <HeaderMain>
        {onBack ? (
          <BackButton
            ref={backButtonRef}
            $compact={compact}
            aria-label="상위 10개로 돌아가기"
            type="button"
            onClick={onBack}
          >
            <ArrowLeft
              aria-hidden="true"
              size={compact ? 16 : 20}
              strokeWidth={2}
            />
          </BackButton>
        ) : null}
        <HeaderContent>
          <Title $compact={compact}>
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
  error,
  onRetry,
  onBack,
  backButtonRef,
  onClose,
  variant = 'panel',
}: StatusDetailProps) {
  return (
    <Root aria-busy={isLoading || undefined}>
      <DetailHeader
        backButtonRef={backButtonRef}
        metric={metric}
        onBack={onBack}
        onClose={onClose}
        selectedItem={selectedItem}
        variant={variant}
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
      ) : error !== null ? (
        // not-found 는 데이터 부재라 발화를 가로챌 이유가 없다(polite).
        <ErrorBody
          aria-live={error.kind === 'not-found' ? 'polite' : 'assertive'}
        >
          <ErrorTitle>
            {error.kind === 'not-found'
              ? '상세 현황 데이터가 없어요'
              : '상세 현황을 불러오지 못했어요'}
          </ErrorTitle>
          {/* 빈 메시지는 normalizeApiError 가 이미 종류별 기본 문구로 채운다. */}
          <ErrorMessage>{error.message}</ErrorMessage>
          {isRetryable(error.kind) ? (
            <RetryButton type="button" onClick={onRetry}>
              다시 시도
            </RetryButton>
          ) : null}
        </ErrorBody>
      ) : detail ? (
        <Body>
          <ChangeIndicatorSection detail={detail} />
          <FootTrafficSection detail={detail} />
          <StoreSection
            detail={detail}
            districtCode={selectedItem?.districtCode ?? null}
          />
          <SalesSection
            detail={detail}
            districtCode={selectedItem?.districtCode ?? null}
          />
        </Body>
      ) : (
        <Body>
          <EmptyMessage>
            이 자치구의 상세 현황 데이터가 아직 없어요.
          </EmptyMessage>
        </Body>
      )}
    </Root>
  )
}
