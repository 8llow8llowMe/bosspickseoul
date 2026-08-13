'use client'

import type { Ref } from 'react'
import { ArrowLeft } from 'lucide-react'
import styled from 'styled-components'
import { Skeleton } from '@/components/ui/skeleton'
import {
  formatSinoUnit,
  formatStatusChange,
  formatStatusValue,
} from '@/lib/status/status-formatters'
import type {
  CodeNameDescriptionMetadata,
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

const METRIC_LABELS: Record<StatusMetric, string> = {
  footTraffic: '유동인구',
  sales: '매출',
  opened: '개업',
  closed: '폐업',
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

const numberFormatter = new Intl.NumberFormat('ko-KR', {
  maximumFractionDigits: 2,
})

const isFiniteNumber = (value: number | null | undefined): value is number =>
  typeof value === 'number' && Number.isFinite(value)

const formatNumber = (
  value: number | null | undefined,
  suffix: string,
): string =>
  isFiniteNumber(value)
    ? `${numberFormatter.format(value)}${suffix}`
    : '데이터 없음'

// 금액·인원은 억/만 단위(만 단위 반올림)로 축약 표기한다.
const formatMoney = (value: number | null | undefined): string =>
  formatSinoUnit(value, '원')

const formatPeople = (value: number | null | undefined): string =>
  formatSinoUnit(value, '명')

const getMetadataName = (
  metadata: CodeNameDescriptionMetadata | null | undefined,
): string | null => metadata?.name?.trim() || null

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

const Eyebrow = styled.p`
  color: var(--color-text-600);
  font-size: 13px;
  font-weight: 600;
`

const Title = styled.h2`
  color: var(--color-text-900);
  font-size: 22px;
  font-weight: 700;
  line-height: 30px;
`

const HeaderMetric = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px 12px;
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
  min-width: 44px;
  min-height: 44px;
  flex: 0 0 auto;
  padding: 0 12px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-control);
  background: var(--color-surface);
  color: var(--color-text-700);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    border-color: var(--color-primary-600);
    color: var(--color-text-900);
  }
`

const Body = styled.div`
  display: grid;
  gap: 12px;
  padding: 20px;
`

const DetailDisclosure = styled.details`
  overflow: hidden;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-control);
  background: var(--color-surface);

  &[open] > summary {
    border-bottom: 1px solid var(--color-border-200);
    color: var(--color-text-900);
  }

  &[open] > summary::after {
    transform: rotate(225deg);
  }
`

const DisclosureSummary = styled.summary`
  min-height: 48px;
  display: flex;
  align-items: center;
  padding: 10px 14px;
  color: var(--color-text-700);
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  list-style: none;

  &::-webkit-details-marker {
    display: none;
  }

  &::after {
    width: 8px;
    height: 8px;
    flex: 0 0 auto;
    margin-left: auto;
    border-right: 2px solid var(--color-text-600);
    border-bottom: 2px solid var(--color-text-600);
    content: '';
    transform: rotate(45deg);
    transition: transform var(--motion-fast) var(--ease-standard);
  }
`

const DisclosureContent = styled.div`
  display: grid;
  gap: 16px;
  padding: 16px;
`

const Group = styled.section`
  display: grid;
  gap: 8px;
`

const GroupTitle = styled.h3`
  color: var(--color-text-800);
  font-size: 14px;
  font-weight: 700;
  line-height: 22px;
`

const GroupDescription = styled.p`
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

function DetailGroup({
  title,
  description,
  rows,
}: {
  title: string
  description?: string | null
  rows: DetailRow[]
}) {
  return (
    <Group>
      <GroupTitle>{title}</GroupTitle>
      {description ? <GroupDescription>{description}</GroupDescription> : null}
      <DetailRows rows={rows} />
    </Group>
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
      value: formatNumber(indicator.averageOpenedMonths, '개월'),
    })
  }

  if (isFiniteNumber(indicator?.averageClosedMonths)) {
    rows.push({
      label: '평균 폐업 영업 기간',
      value: formatNumber(indicator.averageClosedMonths, '개월'),
    })
  }

  return (
    <DetailDisclosure open>
      <DisclosureSummary>상권 변화 지표</DisclosureSummary>
      <DisclosureContent>
        <DetailRows rows={rows} />
      </DisclosureContent>
    </DetailDisclosure>
  )
}

function FootTrafficSection({ detail }: { detail: DistrictDetail }) {
  const footTraffic = detail.footTraffic
  const periodRows = (footTraffic?.periodTotalFootTrafficList ?? []).flatMap(
    item =>
      item?.periodCode && isFiniteNumber(item.totalFootTraffic)
        ? [
            {
              label: item.periodCode,
              value: formatPeople(item.totalFootTraffic),
            },
          ]
        : [],
  )
  const timeRows = TIME_SLOT_LABELS.flatMap(([label, key]) => {
    const value = footTraffic?.timeSlot?.[key]
    return isFiniteNumber(value) ? [{ label, value: formatPeople(value) }] : []
  })
  const genderRows: DetailRow[] = []
  const maleFootTraffic = footTraffic?.gender?.maleFootTraffic
  const femaleFootTraffic = footTraffic?.gender?.femaleFootTraffic

  if (isFiniteNumber(maleFootTraffic)) {
    genderRows.push({
      label: '남성',
      value: formatPeople(maleFootTraffic),
    })
  }
  if (isFiniteNumber(femaleFootTraffic)) {
    genderRows.push({
      label: '여성',
      value: formatPeople(femaleFootTraffic),
    })
  }

  const ageRows = AGE_GROUP_LABELS.flatMap(([label, key]) => {
    const value = footTraffic?.ageGroup?.[key]
    return isFiniteNumber(value) ? [{ label, value: formatPeople(value) }] : []
  })
  const dayRows = DAY_OF_WEEK_LABELS.flatMap(([label, key]) => {
    const value = footTraffic?.dayOfWeek?.[key]
    return isFiniteNumber(value) ? [{ label, value: formatPeople(value) }] : []
  })

  return (
    <DetailDisclosure>
      <DisclosureSummary>유동인구</DisclosureSummary>
      <DisclosureContent>
        <DetailGroup
          description={footTraffic?.periodTrend?.description}
          rows={periodRows}
          title={getMetadataName(footTraffic?.periodTrend) ?? '기간별 추이'}
        />
        <DetailGroup
          description={footTraffic?.timeSlot?.dominantTimeSlotType?.description}
          rows={timeRows}
          title={
            getMetadataName(footTraffic?.timeSlot?.dominantTimeSlotType) ??
            '시간대별 유동인구'
          }
        />
        <DetailGroup
          description={footTraffic?.gender?.dominantGenderType?.description}
          rows={genderRows}
          title={
            getMetadataName(footTraffic?.gender?.dominantGenderType) ??
            '성별 유동인구'
          }
        />
        <DetailGroup
          description={footTraffic?.ageGroup?.dominantAgeGroupType?.description}
          rows={ageRows}
          title={
            getMetadataName(footTraffic?.ageGroup?.dominantAgeGroupType) ??
            '연령대별 유동인구'
          }
        />
        <DetailGroup
          description={
            footTraffic?.dayOfWeek?.dominantDayOfWeekType?.description
          }
          rows={dayRows}
          title={
            getMetadataName(footTraffic?.dayOfWeek?.dominantDayOfWeekType) ??
            '요일별 유동인구'
          }
        />
      </DisclosureContent>
    </DetailDisclosure>
  )
}

function StoreSection({ detail }: { detail: DistrictDetail }) {
  const store = detail.store
  const serviceRows = (store?.topStoreServices ?? []).flatMap(item =>
    item?.serviceName && isFiniteNumber(item.totalStoreCount)
      ? [
          {
            label: item.serviceName,
            value: formatNumber(item.totalStoreCount, '개'),
          },
        ]
      : [],
  )
  const openedRows = (store?.topOpenedAdministrations ?? []).flatMap(item =>
    item?.administrationName &&
    (isFiniteNumber(item.openedStoreCount) || isFiniteNumber(item.openingRate))
      ? [
          {
            label: item.administrationName,
            value: `${formatNumber(item.openedStoreCount, '개')} · ${formatStatusChange(item.openingRate)}`,
          },
        ]
      : [],
  )
  const closedRows = (store?.topClosedAdministrations ?? []).flatMap(item =>
    item?.administrationName &&
    (isFiniteNumber(item.closedStoreCount) || isFiniteNumber(item.closureRate))
      ? [
          {
            label: item.administrationName,
            value: `${formatNumber(item.closedStoreCount, '개')} · ${formatStatusChange(item.closureRate)}`,
          },
        ]
      : [],
  )

  return (
    <DetailDisclosure>
      <DisclosureSummary>점포</DisclosureSummary>
      <DisclosureContent>
        <DetailGroup rows={serviceRows} title="업종별 점포수" />
        <DetailGroup rows={openedRows} title="행정동별 개업" />
        <DetailGroup rows={closedRows} title="행정동별 폐업" />
      </DisclosureContent>
    </DetailDisclosure>
  )
}

function SalesSection({ detail }: { detail: DistrictDetail }) {
  const sales = detail.sales
  const serviceRows = (sales?.topSalesServices ?? []).flatMap(item =>
    item?.serviceName && isFiniteNumber(item.salesChangeRate)
      ? [
          {
            label: item.serviceName,
            value: formatStatusChange(item.salesChangeRate),
          },
        ]
      : [],
  )
  const administrationRows = (sales?.topSalesAdministrations ?? []).flatMap(
    item =>
      item?.administrationName &&
      (isFiniteNumber(item.totalSalesAmount) ||
        isFiniteNumber(item.salesChangeRate))
        ? [
            {
              label: item.administrationName,
              value: `${formatMoney(item.totalSalesAmount)} · ${formatStatusChange(item.salesChangeRate)}`,
            },
          ]
        : [],
  )

  return (
    <DetailDisclosure>
      <DisclosureSummary>매출</DisclosureSummary>
      <DisclosureContent>
        <DetailGroup rows={serviceRows} title="업종별 매출 변화" />
        <DetailGroup rows={administrationRows} title="행정동별 매출" />
      </DisclosureContent>
    </DetailDisclosure>
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
          <Eyebrow>{METRIC_LABELS[metric]} 상세 현황</Eyebrow>
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
        <CloseButton type="button" onClick={onClose}>
          닫기
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
