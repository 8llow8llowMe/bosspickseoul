'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import styled from 'styled-components'
import BarChart from '@/components/analysis/charts/bar-chart'
import DonutChart from '@/components/analysis/charts/donut-chart'
import HorizontalBarChart from '@/components/analysis/charts/horizontal-bar-chart'
import { ButtonLink } from '@/components/ui/button'
import {
  createDistrictAdministrationHref,
  createDistrictHref,
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
  getStatusChangeTone,
  STATUS_METRIC_LABELS,
  type StatusChangeTone,
} from '@/lib/status/status-formatters'
import type {
  DistrictDetail,
  StatusMetric,
  StatusSelectedDistrict,
} from '@/types/status'

type StatusDetailProps = {
  metric: StatusMetric
  /** 순위 밖 구도 올 수 있다 — 그때 `rankedItem` 이 null 이다. */
  selectedDistrict: StatusSelectedDistrict | null
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
  /** 'sheet'는 모바일 바텀시트용 컴팩트 헤더(작은 뒤로가기·제목)를 적용한다. */
  variant?: 'panel' | 'sheet'
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

const Root = styled.article`
  min-width: 0;
  /* hidden 이 아니라 clip 이다. hidden 은 스크롤 컨테이너가 돼, 시트 안에서 머리·바로가기
     칩·CTA 의 sticky 가 바깥 스크롤(시트 본문)이 아니라 이 상자에 묶여 붙지 않는다. */
  overflow: clip;
  /* 차트 2열 전환을 뷰포트가 아니라 상세 자신의 폭으로 정한다(아래 ChartGrid).
     데스크톱 상세가 좌측 열(340~480px)로 옮겨 가면서 뷰포트 기준이 맞지 않게 됐다. */
  container-type: inline-size;
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
    outline: 2px solid var(--color-primary-700);
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

// 값(00명)과 변화(감소 -x%)를 한 줄에 가로로 붙인다. 좁으면 **칩을 통째로** 다음 줄로
// 보낸다 — 예전엔 nowrap 이라 값이 「…5205만 / 원」으로 쪼개지고 칩이 「감 / 소」로 세워졌다.
const HeaderMetric = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 10px;
`

const HeaderValue = styled.strong`
  color: var(--color-text-900);
  font-size: 20px;
  font-variant-numeric: tabular-nums;
  line-height: 28px;
  white-space: nowrap;
`

// 머리 숫자가 무슨 지표의 몇 위인지 적는다. 순위 밖 구는 이 줄만 남는다.
const HeaderRank = styled.p`
  color: var(--color-text-600);
  font-size: 13px;
  font-weight: 600;
  line-height: 18px;
`

// 어느 쪽이 좋고 나쁜지는 목록과 같은 규칙(`getStatusChangeTone`, 폐업 반전)을 따른다.
const CHANGE_TONE_AREA_COLOR: Record<StatusChangeTone, string> = {
  positive: 'var(--color-positive)',
  negative: 'var(--color-negative)',
  neutral: 'var(--color-border-300)',
}

// 칩의 색은 **면적**(틴트·테두리)에만 쓴다 — 글자는 text-800 이다. 그래서 글자용 -text 토큰이
// 아니라 면적 토큰이다(contrast-tokens.md D3-3). 변동 없음은 틴트가 흰 바탕에 묻히지 않게
// 회색 테두리 색을 쓴다.
const changeToneColor = (tone: StatusChangeTone): string =>
  CHANGE_TONE_AREA_COLOR[tone]

const HeaderChange = styled.span<{ $tone: StatusChangeTone }>`
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
  white-space: nowrap;
`

const Body = styled.div`
  display: grid;
  /* 암시적 auto 열은 자식의 min-content 로 벌어진다. StatGrid(auto-fit, 최소 200px)가
     타일 둘을 나란히 요구해 좁은 좌측 열(340px)에서 상세가 오른쪽으로 잘렸다.
     ReportSection 도 같은 이유로 열을 고정한다. */
  grid-template-columns: minmax(0, 1fr);
  gap: 24px;
  padding: 20px;
`

/*
 * 머리와 바로가기 칩은 함께 위에 붙고, 분석 CTA 는 아래에 붙는다(status.md 1.4). 붙는 기준은
 * 가장 가까운 스크롤 상자다 — 데스크톱은 상세 자신, 시트는 시트 본문.
 */
const StickyTop = styled.div`
  position: sticky;
  top: 0;
  z-index: 2;
  background: var(--color-surface);
`

const SectionNav = styled.nav<{ $compact?: boolean }>`
  display: flex;
  gap: 6px;
  padding: ${props => (props.$compact ? '8px 16px' : '10px 20px')};
  overflow-x: auto;
  border-bottom: 1px solid var(--color-border-200);
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
`

const SectionChip = styled.button<{ $active: boolean }>`
  min-height: 32px;
  flex: none;
  padding: 0 12px;
  border: 1px solid
    ${props =>
      props.$active ? 'var(--color-text-900)' : 'var(--color-border-200)'};
  border-radius: var(--radius-pill);
  background: ${props =>
    props.$active ? 'var(--color-text-900)' : 'var(--color-surface)'};
  color: ${props =>
    props.$active ? 'var(--color-surface)' : 'var(--color-text-700)'};
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--color-blue-500);
    outline-offset: 2px;
  }
`

// 칩이 포커스를 옮겨 받는 자리다(tabIndex -1). 칩을 누른 결과라 링을 그리지 않는다.
const SectionAnchor = styled.div`
  min-width: 0;

  &:focus {
    outline: none;
  }
`

const CtaBar = styled.div<{ $compact?: boolean }>`
  position: sticky;
  bottom: 0;
  z-index: 2;
  display: grid;
  padding: ${props => (props.$compact ? '12px 16px' : '12px 20px 16px')};
  border-top: 1px solid var(--color-border-200);
  background: var(--color-surface);

  /* 한 화면의 주 행동이라 열 폭을 다 쓴다(ButtonLink 는 기본이 inline-flex). */
  & > a {
    width: 100%;
    justify-content: center;
  }
`

// 드롭다운 대신 보고서 방식: 그룹 제목(유동인구/점포/매출) 아래에 데이터를 나열한다.
const ReportSection = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
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

// 상세 폭이 넉넉하면(640px 이상) 차트를 세로 나열이 아니라 2열 그리드로 배치한다.
const ChartGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;

  & > * {
    min-width: 0;
  }

  @container (min-width: 640px) {
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

const DETAIL_SECTIONS = [
  { key: 'flow', label: '상권 흐름' },
  { key: 'footTraffic', label: '유동인구' },
  { key: 'store', label: '점포' },
  { key: 'sales', label: '매출' },
] as const

type DetailSectionKey = (typeof DETAIL_SECTIONS)[number]['key']

// 칩이 가리킬 묶음을 고를 때, 붙어 있는 머리 아래로 이만큼 들어온 묶음까지 「지금 보는 것」이다.
const SECTION_ACTIVE_SLACK_PX = 16
// 칩을 눌러 부드럽게 스크롤하는 동안에는 지나가는 묶음 칩이 차례로 켜지지 않게 잠근다.
// `scrollend` 가 없는 브라우저를 위해 이 시간 뒤에는 잠금을 푼다.
const SECTION_SCROLL_LOCK_MS = 800

/*
 * 가장 가까운 스크롤 상자. `hidden` 도 스크롤 상자다 — 시트가 접혀 있으면 시트 본문이
 * `hidden` 이 되는데, 그때 로딩이 끝나도 같은 상자를 잡아야 펼친 뒤 스크롤 추적이 된다.
 * 상세 자신의 `clip` 은 스크롤 상자가 아니라 건너뛴다(데스크톱은 상세가 `auto` 라 먼저 잡힌다).
 */
const findScrollParent = (element: HTMLElement | null): HTMLElement | null => {
  let current = element

  while (current) {
    const { overflowY } = window.getComputedStyle(current)
    if (
      overflowY === 'auto' ||
      overflowY === 'scroll' ||
      overflowY === 'hidden'
    )
      return current
    current = current.parentElement
  }

  return null
}

/**
 * 상세 바로가기 칩. 누르면 그 묶음으로 스크롤하고 포커스도 옮기며, 스크롤하면 지금 보는
 * 묶음 칩이 켜진다. 스크롤 상자는 렌더 자리마다 다르다(데스크톱 = 상세, 시트 = 시트
 * 본문) — 가장 가까운 스크롤 조상을 찾아 거기에 붙는다.
 *
 * 붙어 있는 머리·칩과 아래 CTA 가 포커스를 가리지 않게(WCAG 2.4.11) 스크롤 상자의
 * `scroll-padding` 을 그 높이로 맞춘다. 스크롤 상자는 이 컴포넌트 밖(시트 본문)일 수 있어
 * 떠날 때 되돌린다.
 */
function useDetailSections(enabled: boolean) {
  const rootRef = useRef<HTMLElement>(null)
  const stickyRef = useRef<HTMLDivElement>(null)
  const ctaRef = useRef<HTMLDivElement>(null)
  const lockedKeyRef = useRef<DetailSectionKey | null>(null)
  const [activeKey, setActiveKey] = useState<DetailSectionKey>('flow')

  const getSectionTops = useCallback(() => {
    const root = rootRef.current
    const scroller = findScrollParent(root)
    if (!root || !scroller) return null

    const scrollerTop = scroller.getBoundingClientRect().top
    const stickyHeight = stickyRef.current?.offsetHeight ?? 0
    const sections = DETAIL_SECTIONS.map(({ key }) =>
      root.querySelector<HTMLElement>(`[data-status-detail-section="${key}"]`),
    )
    const tops = sections.map(section =>
      section
        ? section.getBoundingClientRect().top - scrollerTop - stickyHeight
        : null,
    )

    return { scroller, sections, tops }
  }, [])

  useEffect(() => {
    if (!enabled) return
    const measured = getSectionTops()
    if (!measured) return
    const { scroller } = measured
    const previousPaddingTop = scroller.style.scrollPaddingTop
    const previousPaddingBottom = scroller.style.scrollPaddingBottom
    let unlockTimer: number | undefined

    const syncScrollPadding = () => {
      scroller.style.scrollPaddingTop = `${stickyRef.current?.offsetHeight ?? 0}px`
      scroller.style.scrollPaddingBottom = `${ctaRef.current?.offsetHeight ?? 0}px`
    }

    const update = () => {
      if (lockedKeyRef.current) return
      const current = getSectionTops()
      if (!current) return
      const atBottom =
        scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2
      // 맨 아래에 닿으면 짧은 마지막 묶음이 위까지 올라오지 못해도 켠다.
      const index = atBottom
        ? DETAIL_SECTIONS.length - 1
        : current.tops.reduce<number>(
            (active, top, i) =>
              top !== null && top <= SECTION_ACTIVE_SLACK_PX ? i : active,
            0,
          )

      setActiveKey(DETAIL_SECTIONS[index].key)
    }

    const unlock = () => {
      lockedKeyRef.current = null
    }

    const handleScroll = () => {
      if (lockedKeyRef.current) {
        window.clearTimeout(unlockTimer)
        unlockTimer = window.setTimeout(unlock, SECTION_SCROLL_LOCK_MS)
        return
      }
      update()
    }

    syncScrollPadding()
    update()
    const resizeObserver = new ResizeObserver(syncScrollPadding)
    if (stickyRef.current) resizeObserver.observe(stickyRef.current)
    if (ctaRef.current) resizeObserver.observe(ctaRef.current)
    scroller.addEventListener('scroll', handleScroll, { passive: true })
    scroller.addEventListener('scrollend', unlock)

    return () => {
      window.clearTimeout(unlockTimer)
      resizeObserver.disconnect()
      scroller.removeEventListener('scroll', handleScroll)
      scroller.removeEventListener('scrollend', unlock)
      scroller.style.scrollPaddingTop = previousPaddingTop
      scroller.style.scrollPaddingBottom = previousPaddingBottom
    }
  }, [enabled, getSectionTops])

  const scrollToSection = (key: DetailSectionKey) => {
    const measured = getSectionTops()
    if (!measured) return
    const index = DETAIL_SECTIONS.findIndex(section => section.key === key)
    const top = measured.tops[index]
    const section = measured.sections[index]
    if (top === null || !section) return

    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    lockedKeyRef.current = reduceMotion ? null : key
    measured.scroller.scrollBy({
      top,
      behavior: reduceMotion ? 'auto' : 'smooth',
    })
    // 스크롤만 옮기면 키보드 사용자의 다음 Tab 이 칩 바로 뒤(위쪽 묶음의 링크)로 가서 화면이
    // 되돌아간다. 묶음으로 포커스를 옮긴다 — 스크롤은 위에서 이미 했다.
    section.focus({ preventScroll: true })
    setActiveKey(key)
  }

  return { rootRef, stickyRef, ctaRef, activeKey, scrollToSection }
}

function DetailHeader({
  metric,
  selectedDistrict,
  onBack,
  backButtonRef,
  variant = 'panel',
}: Pick<
  StatusDetailProps,
  'metric' | 'selectedDistrict' | 'onBack' | 'backButtonRef' | 'variant'
>) {
  const compact = variant === 'sheet'
  const rankedItem = selectedDistrict?.rankedItem ?? null
  const metricLabel = STATUS_METRIC_LABELS[metric]
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
            {selectedDistrict
              ? `${selectedDistrict.districtName} 상세`
              : '자치구 상세'}
          </Title>
          {rankedItem ? (
            <HeaderMetric>
              <HeaderValue>
                {formatStatusValue(metric, rankedItem.value)}
              </HeaderValue>
              <HeaderChange
                $tone={getStatusChangeTone(metric, rankedItem.changeRate)}
              >
                <span>{getChangeCue(metric, rankedItem.changeRate)}</span>
                <span>{formatStatusChange(rankedItem.changeRate)}</span>
              </HeaderChange>
            </HeaderMetric>
          ) : null}
          {selectedDistrict ? (
            <HeaderRank data-status-detail-rank>
              {rankedItem
                ? `${metricLabel} ${rankedItem.rank}위`
                : `${metricLabel} 상위 10위 밖`}
            </HeaderRank>
          ) : null}
        </HeaderContent>
      </HeaderMain>
    </Header>
  )
}

export default function StatusDetail({
  metric,
  selectedDistrict,
  detail,
  isLoading,
  error,
  onRetry,
  onBack,
  backButtonRef,
  variant = 'panel',
}: StatusDetailProps) {
  const compact = variant === 'sheet'
  const hasSections = !isLoading && error === null && detail !== null
  const { rootRef, stickyRef, ctaRef, activeKey, scrollToSection } =
    useDetailSections(hasSections)
  const analysisHref = createDistrictHref(selectedDistrict?.districtCode)
  const header = (
    <DetailHeader
      backButtonRef={backButtonRef}
      metric={metric}
      onBack={onBack}
      selectedDistrict={selectedDistrict}
      variant={variant}
    />
  )

  return (
    <Root ref={rootRef} aria-busy={isLoading || undefined}>
      {/* 시트는 높이가 모자라다(펼침 약 380px). 머리까지 붙이면 칩·CTA 와 함께 본문이 90px
          남짓만 남아, 시트에서는 머리는 스크롤로 넘기고 바로가기 칩만 붙인다. */}
      {compact ? header : null}
      <StickyTop ref={stickyRef}>
        {compact ? null : header}
        {hasSections ? (
          <SectionNav $compact={compact} aria-label="상세 바로가기">
            {DETAIL_SECTIONS.map(section => (
              <SectionChip
                key={section.key}
                $active={activeKey === section.key}
                aria-current={
                  activeKey === section.key ? 'location' : undefined
                }
                data-status-detail-chip={section.key}
                type="button"
                onClick={() => scrollToSection(section.key)}
              >
                {section.label}
              </SectionChip>
            ))}
          </SectionNav>
        ) : null}
      </StickyTop>
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
          <SectionAnchor
            aria-label="상권 흐름"
            data-status-detail-section="flow"
            role="region"
            tabIndex={-1}
          >
            <ChangeIndicatorSection detail={detail} />
          </SectionAnchor>
          <SectionAnchor
            aria-label="유동인구"
            data-status-detail-section="footTraffic"
            role="region"
            tabIndex={-1}
          >
            <FootTrafficSection detail={detail} />
          </SectionAnchor>
          <SectionAnchor
            aria-label="점포"
            data-status-detail-section="store"
            role="region"
            tabIndex={-1}
          >
            <StoreSection
              detail={detail}
              districtCode={selectedDistrict?.districtCode ?? null}
            />
          </SectionAnchor>
          <SectionAnchor
            aria-label="매출"
            data-status-detail-section="sales"
            role="region"
            tabIndex={-1}
          >
            <SalesSection
              detail={detail}
              districtCode={selectedDistrict?.districtCode ?? null}
            />
          </SectionAnchor>
        </Body>
      ) : (
        <Body>
          <EmptyMessage>
            이 자치구의 상세 현황 데이터가 아직 없어요.
          </EmptyMessage>
        </Body>
      )}
      {/* 이 화면의 목적은 「좁혀서 넘기기」다. 상세가 비거나 실패해도 출구는 늘 보인다. */}
      {selectedDistrict && analysisHref ? (
        <CtaBar ref={ctaRef} $compact={compact}>
          <ButtonLink
            data-status-detail-cta
            href={analysisHref}
            rightIcon={<ArrowRight size={18} strokeWidth={2} />}
            size="large"
          >
            {selectedDistrict.districtName} 상권 분석하기
          </ButtonLink>
        </CtaBar>
      ) : null}
    </Root>
  )
}
