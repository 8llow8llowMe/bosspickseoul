'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import styled from 'styled-components'
import {
  fetchExpenditureData,
  fetchFlowPopulationData,
  fetchResidentPopulationData,
  fetchSalesData,
  fetchStoreCountData,
  fetchTotalExpenditureData,
  fetchTotalSalesData,
  saveAnalysisBookmark,
} from '@/lib/api/analysis'
import { getApiMessage, isApiSuccess } from '@/lib/api/response'
import { formatLargeWon } from '@/lib/format'
import { useAuthStore } from '@/stores/auth-store'
import type { ApiResponse } from '@/types/api'
import type {
  AnalysisBookmarkRequest,
  FlowPopulationDataBody,
  SalesDataBody,
} from '@/types/analysis'

const Page = styled.main`
  width: min(1240px, calc(100% - 48px));
  margin: 0 auto;
  padding: 32px 0 72px;
  display: grid;
  gap: 24px;
`

const Hero = styled.section`
  display: grid;
  gap: 18px;
  padding: 32px;
  border: 1px solid rgba(21, 73, 181, 0.12);
  border-radius: 28px;
  background:
    radial-gradient(
      circle at top left,
      rgba(51, 109, 211, 0.16),
      transparent 32%
    ),
    linear-gradient(180deg, #f8fbff 0%, #ffffff 100%);
  box-shadow: 0 18px 44px rgba(21, 73, 181, 0.08);
`

const Eyebrow = styled.p`
  color: var(--color-primary-700);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`

const Title = styled.h1`
  color: var(--color-text-900);
  font-size: clamp(30px, 4vw, 42px);
  line-height: 1.15;
  letter-spacing: -0.04em;
`

const HeroBody = styled.p`
  max-width: 860px;
  color: var(--color-text-500);
  line-height: 1.8;
`

const MetaRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
`

const MetaBadge = styled.span`
  min-height: 34px;
  display: inline-flex;
  align-items: center;
  padding: 0 14px;
  border-radius: 999px;
  background: rgba(21, 73, 181, 0.08);
  color: var(--color-primary-700);
  font-size: 13px;
  font-weight: 700;
`

const ActionRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
`

const PrimaryButton = styled.button`
  min-height: 48px;
  padding: 0 18px;
  border: none;
  border-radius: 14px;
  background: var(--color-primary-700);
  color: white;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;

  &:disabled {
    cursor: not-allowed;
    background: #a9b5cb;
  }
`

const SecondaryLink = styled(Link)`
  min-height: 48px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 18px;
  border: 1px solid var(--color-primary-700);
  border-radius: 14px;
  color: var(--color-primary-700);
  font-size: 15px;
  font-weight: 700;
`

const SummaryGrid = styled.section`
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 16px;

  @media (max-width: 1200px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  @media (max-width: 760px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`

const SummaryCard = styled.article`
  padding: 22px;
  border: 1px solid var(--color-border-200);
  border-radius: 22px;
  background: white;
  box-shadow: 0 10px 30px rgba(21, 73, 181, 0.08);
`

const SummaryLabel = styled.p`
  color: var(--color-text-500);
  font-size: 13px;
`

const SummaryValue = styled.p`
  margin-top: 8px;
  color: var(--color-text-900);
  font-size: 24px;
  font-weight: 700;
  line-height: 1.3;
  letter-spacing: -0.03em;
`

const SummaryHelper = styled.p`
  margin-top: 8px;
  color: var(--color-text-500);
  font-size: 13px;
  line-height: 1.6;
`

const Controls = styled.section`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 24px;
  border: 1px solid var(--color-border-200);
  border-radius: 22px;
  background: white;
  box-shadow: 0 10px 30px rgba(21, 73, 181, 0.08);

  @media (max-width: 760px) {
    flex-direction: column;
    align-items: flex-start;
  }
`

const ControlText = styled.p`
  color: var(--color-text-500);
  line-height: 1.75;
`

const Select = styled.select`
  min-width: 180px;
  min-height: 46px;
  padding: 0 14px;
  border: 1px solid var(--color-border-200);
  border-radius: 14px;
  background: white;
  color: var(--color-text-900);
  font-size: 14px;
`

const SectionGrid = styled.section`
  display: grid;
  gap: 20px;
`

const SectionCard = styled.section`
  padding: 24px;
  border: 1px solid var(--color-border-200);
  border-radius: 24px;
  background: white;
  box-shadow: 0 10px 30px rgba(21, 73, 181, 0.08);
`

const SectionHeader = styled.div`
  display: grid;
  gap: 8px;
  margin-bottom: 18px;
`

const SectionTitle = styled.h2`
  color: var(--color-text-900);
  font-size: 24px;
  line-height: 1.2;
  letter-spacing: -0.03em;
`

const SectionBody = styled.p`
  color: var(--color-text-500);
  line-height: 1.75;
`

const Notice = styled.div<{ $tone?: 'error' | 'info' | 'success' }>`
  padding: 16px 18px;
  border-radius: 18px;
  background: ${props => {
    if (props.$tone === 'error') return 'rgba(209, 67, 67, 0.08)'
    if (props.$tone === 'success') return 'rgba(31, 157, 85, 0.08)'
    return 'rgba(51, 109, 211, 0.08)'
  }};
  color: ${props => {
    if (props.$tone === 'error') return 'var(--color-danger)'
    if (props.$tone === 'success') return 'var(--color-success)'
    return 'var(--color-primary-700)'
  }};
  line-height: 1.75;
`

const MetricGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
  }
`

const MetricCard = styled.article`
  padding: 20px;
  border: 1px solid var(--color-border-200);
  border-radius: 20px;
  background: var(--color-surface-muted);
`

const MetricTitle = styled.h3`
  color: var(--color-text-900);
  font-size: 18px;
  line-height: 1.3;
`

const MetricValue = styled.p`
  margin-top: 8px;
  color: var(--color-text-900);
  font-size: 28px;
  font-weight: 700;
  line-height: 1.3;
`

const MetricCaption = styled.p`
  margin-top: 8px;
  color: var(--color-text-500);
  line-height: 1.7;
`

const ChartGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
  }
`

const ChartCard = styled.article`
  padding: 20px;
  border: 1px solid var(--color-border-200);
  border-radius: 20px;
  background: var(--color-surface-muted);
`

const ChartTitle = styled.h3`
  color: var(--color-text-900);
  font-size: 18px;
  line-height: 1.3;
`

const ChartHelper = styled.p`
  margin-top: 8px;
  color: var(--color-text-500);
  line-height: 1.7;
`

const BarList = styled.div`
  display: grid;
  gap: 12px;
  margin-top: 16px;
`

const BarRow = styled.div`
  display: grid;
  gap: 6px;
`

const BarTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`

const BarLabel = styled.span`
  color: var(--color-text-700);
  font-size: 13px;
  font-weight: 600;
`

const BarValue = styled.span`
  color: var(--color-text-500);
  font-size: 13px;
`

const BarTrack = styled.div`
  overflow: hidden;
  height: 10px;
  border-radius: 999px;
  background: rgba(21, 73, 181, 0.08);
`

const BarFill = styled.div<{ $width: number; $tone?: 'primary' | 'success' }>`
  width: ${props => props.$width}%;
  height: 100%;
  border-radius: inherit;
  background: ${props =>
    props.$tone === 'success'
      ? 'var(--color-success)'
      : 'var(--color-primary-700)'};
`

const EmptyState = styled.div`
  padding: 32px 24px;
  border: 1px dashed var(--color-border-300);
  border-radius: 20px;
  background: white;
  color: var(--color-text-500);
  line-height: 1.8;
`

const periodOptions = [
  { value: '20233', label: '2023년 3분기' },
  { value: '20232', label: '2023년 2분기' },
  { value: '20231', label: '2023년 1분기' },
  { value: '20224', label: '2022년 4분기' },
  { value: '20223', label: '2022년 3분기' },
  { value: '20222', label: '2022년 2분기' },
  { value: '20221', label: '2022년 1분기' },
] as const

const numberFormatter = new Intl.NumberFormat('ko-KR')

const toMetricBars = (
  values: Record<string, number>,
  labels: Record<string, string>,
) =>
  Object.entries(values).map(([key, value]) => ({
    label: labels[key] ?? key,
    value,
  }))

const sumRecordValues = (values: Record<string, number>) =>
  Object.values(values).reduce((acc, value) => acc + value, 0)

const toGenderBars = (
  values:
    | FlowPopulationDataBody['ageGenderPercentFootTraffic']
    | SalesDataBody['ageGenderPercentSales'],
) => {
  let male = 0
  let female = 0

  Object.entries(values).forEach(([key, value]) => {
    if (key.startsWith('male')) {
      male += value
    }

    if (key.startsWith('female')) {
      female += value
    }
  })

  return [
    { label: '남성', value: Number(male.toFixed(2)) },
    { label: '여성', value: Number(female.toFixed(2)) },
  ]
}

const createSimulationHref = ({
  districtName,
  serviceCode,
  serviceName,
}: {
  districtName: string
  serviceCode: string
  serviceName: string
}) => {
  const params = new URLSearchParams({
    gugun: districtName,
    serviceCode,
    serviceCodeName: serviceName,
  })

  return `/analysis/simulation?${params.toString()}`
}

function ChartSection({
  title,
  helper,
  items,
  tone = 'primary',
  suffix = '',
}: {
  title: string
  helper: string
  items: { label: string; value: number }[]
  tone?: 'primary' | 'success'
  suffix?: string
}) {
  const maxValue = Math.max(...items.map(item => item.value), 0)

  return (
    <ChartCard>
      <ChartTitle>{title}</ChartTitle>
      <ChartHelper>{helper}</ChartHelper>
      <BarList>
        {items.map(item => (
          <BarRow key={item.label}>
            <BarTop>
              <BarLabel>{item.label}</BarLabel>
              <BarValue>
                {numberFormatter.format(item.value)}
                {suffix}
              </BarValue>
            </BarTop>
            <BarTrack>
              <BarFill
                $tone={tone}
                $width={maxValue === 0 ? 0 : (item.value / maxValue) * 100}
              />
            </BarTrack>
          </BarRow>
        ))}
      </BarList>
    </ChartCard>
  )
}

function SectionFallback({
  query,
  pendingMessage,
  errorMessage,
}: {
  query: {
    isPending: boolean
    data?: ApiResponse<unknown> | null
  }
  pendingMessage: string
  errorMessage: string
}) {
  if (query.isPending) {
    return <Notice>{pendingMessage}</Notice>
  }

  if (!query.data || !isApiSuccess(query.data)) {
    return (
      <Notice $tone="error">{getApiMessage(query.data, errorMessage)}</Notice>
    )
  }

  return null
}

export default function AnalysisResultPage() {
  const searchParams = useSearchParams()
  const hasHydrated = useAuthStore(state => state.hasHydrated)
  const isLoggedIn = useAuthStore(state => state.isLoggedIn)

  const districtCode = searchParams.get('districtCode') ?? ''
  const districtName = searchParams.get('districtName') ?? ''
  const administrationCode = searchParams.get('administrationCode') ?? ''
  const administrationName = searchParams.get('administrationName') ?? ''
  const commercialCode = searchParams.get('commercialCode') ?? ''
  const commercialName = searchParams.get('commercialName') ?? ''
  const serviceCode = searchParams.get('serviceCode') ?? ''
  const serviceName = searchParams.get('serviceName') ?? ''
  const serviceType = searchParams.get('serviceType') ?? ''
  const [periodCode, setPeriodCode] = useState(
    searchParams.get('periodCode') ?? '20233',
  )
  const [feedback, setFeedback] = useState<{
    tone: 'error' | 'info' | 'success'
    text: string
  } | null>(null)

  const hasSelection =
    Boolean(districtCode) &&
    Boolean(administrationCode) &&
    Boolean(commercialCode) &&
    Boolean(serviceCode)

  const flowQuery = useQuery({
    queryKey: ['analysisFlowPopulation', commercialCode, periodCode],
    queryFn: () => fetchFlowPopulationData(commercialCode, periodCode),
    enabled: hasSelection,
  })

  const salesQuery = useQuery({
    queryKey: ['analysisSales', commercialCode, serviceCode, periodCode],
    queryFn: () => fetchSalesData(commercialCode, serviceCode, periodCode),
    enabled: hasSelection,
  })

  const totalSalesQuery = useQuery({
    queryKey: [
      'analysisTotalSales',
      districtCode,
      administrationCode,
      commercialCode,
      serviceCode,
      periodCode,
    ],
    queryFn: () =>
      fetchTotalSalesData(
        districtCode,
        administrationCode,
        commercialCode,
        serviceCode,
        periodCode,
      ),
    enabled: hasSelection,
  })

  const storeQuery = useQuery({
    queryKey: ['analysisStoreCount', commercialCode, serviceCode, periodCode],
    queryFn: () => fetchStoreCountData(commercialCode, serviceCode, periodCode),
    enabled: hasSelection,
  })

  const residentQuery = useQuery({
    queryKey: ['analysisResident', commercialCode, periodCode],
    queryFn: () => fetchResidentPopulationData(commercialCode, periodCode),
    enabled: hasSelection,
  })

  const expenditureQuery = useQuery({
    queryKey: ['analysisExpenditure', commercialCode, periodCode],
    queryFn: () => fetchExpenditureData(commercialCode, periodCode),
    enabled: hasSelection,
  })

  const totalExpenditureQuery = useQuery({
    queryKey: [
      'analysisTotalExpenditure',
      districtCode,
      administrationCode,
      commercialCode,
      periodCode,
    ],
    queryFn: () =>
      fetchTotalExpenditureData(
        districtCode,
        administrationCode,
        commercialCode,
        periodCode,
      ),
    enabled: hasSelection,
  })

  const saveMutation = useMutation({
    mutationFn: saveAnalysisBookmark,
    onSuccess: response => {
      if (isApiSuccess(response)) {
        setFeedback({
          tone: 'success',
          text: '상권 분석 북마크에 저장했습니다.',
        })
        return
      }

      setFeedback({
        tone: 'error',
        text: getApiMessage(response, '분석 북마크 저장에 실패했습니다.'),
      })
    },
    onError: () => {
      setFeedback({
        tone: 'error',
        text: '분석 북마크 저장 중 문제가 발생했습니다.',
      })
    },
  })

  if (!hasSelection) {
    return (
      <Page>
        <EmptyState>
          분석에 필요한 상권 또는 업종 정보가 없습니다. 다시 조건을 선택해
          주세요.
        </EmptyState>
        <SecondaryLink href="/analysis">분석 조건 다시 선택하기</SecondaryLink>
      </Page>
    )
  }

  const flowData =
    flowQuery.data && isApiSuccess(flowQuery.data)
      ? flowQuery.data.dataBody
      : null
  const salesData =
    salesQuery.data && isApiSuccess(salesQuery.data)
      ? salesQuery.data.dataBody
      : null
  const totalSalesData =
    totalSalesQuery.data && isApiSuccess(totalSalesQuery.data)
      ? totalSalesQuery.data.dataBody
      : null
  const storeData =
    storeQuery.data && isApiSuccess(storeQuery.data)
      ? storeQuery.data.dataBody
      : null
  const residentData =
    residentQuery.data && isApiSuccess(residentQuery.data)
      ? residentQuery.data.dataBody
      : null
  const expenditureData =
    expenditureQuery.data && isApiSuccess(expenditureQuery.data)
      ? expenditureQuery.data.dataBody
      : null
  const totalExpenditureData =
    totalExpenditureQuery.data && isApiSuccess(totalExpenditureQuery.data)
      ? totalExpenditureQuery.data.dataBody
      : null

  const bookmarkPayload: AnalysisBookmarkRequest = {
    districtCode,
    districtCodeName: districtName,
    administrationCode,
    administrationCodeName: administrationName,
    commercialCode,
    commercialCodeName: commercialName,
    serviceType,
    serviceCode,
    serviceCodeName: serviceName,
  }

  const handleSave = () => {
    if (!hasHydrated) {
      setFeedback({
        tone: 'info',
        text: '로그인 상태를 확인한 뒤 다시 시도해 주세요.',
      })
      return
    }

    if (!isLoggedIn) {
      setFeedback({
        tone: 'info',
        text: '분석 북마크 저장은 로그인 후 사용할 수 있습니다.',
      })
      return
    }

    saveMutation.mutate(bookmarkPayload)
  }

  const simulationHref = createSimulationHref({
    districtName,
    serviceCode,
    serviceName,
  })

  const flowSummary = flowData
    ? sumRecordValues(flowData.timeSlotFootTraffic)
    : null
  const salesSummary =
    totalSalesData?.commercialTotalSalesInfo.totalSales ?? null
  const storeSummary = storeData?.sameTotalStore ?? null
  const residentSummary = residentData?.populationInfo.totalPopulation ?? null
  const expenditureSummary =
    totalExpenditureData?.commercialTotalIncomeInfo.totalPrice ?? null

  return (
    <Page>
      <Hero>
        <Eyebrow>Analysis Result</Eyebrow>
        <Title>
          {commercialName} · {serviceName || '업종 미선택'}
        </Title>
        <HeroBody>
          {districtName} {administrationName} 기준 분석 결과입니다. 레거시의
          유동인구, 매출, 점포, 상주인구, 지출 분석 API를 한 화면에서 다시
          조합했습니다.
        </HeroBody>
        <MetaRow>
          <MetaBadge>{districtName}</MetaBadge>
          <MetaBadge>{administrationName}</MetaBadge>
          <MetaBadge>{commercialName}</MetaBadge>
          {serviceType ? <MetaBadge>{serviceType}</MetaBadge> : null}
        </MetaRow>
        <ActionRow>
          <PrimaryButton
            type="button"
            onClick={handleSave}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? '저장 중...' : '분석 북마크 저장'}
          </PrimaryButton>
          <SecondaryLink href={simulationHref}>
            시뮬레이션 이어가기
          </SecondaryLink>
          <SecondaryLink href="/analysis">조건 다시 선택하기</SecondaryLink>
        </ActionRow>
        {feedback ? (
          <Notice $tone={feedback.tone}>{feedback.text}</Notice>
        ) : null}
      </Hero>

      <SummaryGrid>
        <SummaryCard>
          <SummaryLabel>상권 예상 매출</SummaryLabel>
          <SummaryValue>
            {salesSummary !== null ? formatLargeWon(salesSummary) : '-'}
          </SummaryValue>
          <SummaryHelper>선택 분기 기준 상권 총 매출입니다.</SummaryHelper>
        </SummaryCard>
        <SummaryCard>
          <SummaryLabel>유동인구 총합</SummaryLabel>
          <SummaryValue>
            {flowSummary !== null
              ? `${numberFormatter.format(flowSummary)}명`
              : '-'}
          </SummaryValue>
          <SummaryHelper>시간대 합산 기준 유동인구 규모입니다.</SummaryHelper>
        </SummaryCard>
        <SummaryCard>
          <SummaryLabel>동일 업종 점포수</SummaryLabel>
          <SummaryValue>
            {storeSummary !== null
              ? `${numberFormatter.format(storeSummary)}개`
              : '-'}
          </SummaryValue>
          <SummaryHelper>같은 상권 내 동일 업종 점포수입니다.</SummaryHelper>
        </SummaryCard>
        <SummaryCard>
          <SummaryLabel>상주인구</SummaryLabel>
          <SummaryValue>
            {residentSummary !== null
              ? `${numberFormatter.format(residentSummary)}명`
              : '-'}
          </SummaryValue>
          <SummaryHelper>선택 상권 상주인구 총합입니다.</SummaryHelper>
        </SummaryCard>
        <SummaryCard>
          <SummaryLabel>소비 지출 규모</SummaryLabel>
          <SummaryValue>
            {expenditureSummary !== null
              ? formatLargeWon(expenditureSummary)
              : '-'}
          </SummaryValue>
          <SummaryHelper>상권 기준 소비 지출 총액입니다.</SummaryHelper>
        </SummaryCard>
      </SummaryGrid>

      <Controls>
        <ControlText>
          분기를 바꾸면 모든 분석 카드가 함께 갱신됩니다. 레거시처럼 각 섹션별
          분기를 따로 들고 가지 않고, 해석이 쉬운 단일 분기 기준으로
          재구성했습니다.
        </ControlText>
        <Select
          value={periodCode}
          onChange={event => setPeriodCode(event.target.value)}
        >
          {periodOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </Controls>

      <SectionGrid>
        <SectionCard>
          <SectionHeader>
            <SectionTitle>유동인구 분석</SectionTitle>
            <SectionBody>
              시간, 요일, 연령, 성별 기준으로 상권 내 유입 패턴을 확인합니다.
            </SectionBody>
          </SectionHeader>
          <SectionFallback
            query={flowQuery}
            pendingMessage="유동인구 데이터를 불러오는 중입니다."
            errorMessage="유동인구 데이터를 불러오지 못했습니다."
          />
          {flowData ? (
            <ChartGrid>
              <ChartSection
                title="시간대별 유동인구"
                helper="어느 시간대에 유동인구가 집중되는지 확인합니다."
                items={toMetricBars(flowData.timeSlotFootTraffic, {
                  footTraffic00: '00시',
                  footTraffic06: '06시',
                  footTraffic11: '11시',
                  footTraffic14: '14시',
                  footTraffic17: '17시',
                  footTraffic21: '21시',
                })}
                suffix="명"
              />
              <ChartSection
                title="요일별 유동인구"
                helper="주중과 주말 유입 차이를 함께 봅니다."
                items={toMetricBars(flowData.dayOfWeekFootTraffic, {
                  monFootTraffic: '월',
                  tueFootTraffic: '화',
                  wedFootTraffic: '수',
                  thuFootTraffic: '목',
                  friFootTraffic: '금',
                  satFootTraffic: '토',
                  sunFootTraffic: '일',
                })}
                suffix="명"
              />
              <ChartSection
                title="연령대별 유동인구"
                helper="어떤 연령층이 가장 많이 방문하는지 보여줍니다."
                items={toMetricBars(flowData.ageGroupFootTraffic, {
                  teenFootTraffic: '10대',
                  twentyFootTraffic: '20대',
                  thirtyFootTraffic: '30대',
                  fortyFootTraffic: '40대',
                  fiftyFootTraffic: '50대',
                  sixtyFootTraffic: '60대+',
                })}
                suffix="명"
              />
              <ChartSection
                title="성별 비중"
                helper="연령대별 성별 구성 비율을 합산해 보여줍니다."
                items={toGenderBars(flowData.ageGenderPercentFootTraffic)}
                tone="success"
                suffix="%"
              />
            </ChartGrid>
          ) : null}
        </SectionCard>

        <SectionCard>
          <SectionHeader>
            <SectionTitle>매출 분석</SectionTitle>
            <SectionBody>
              상권 총 매출, 요일/시간/연령 매출, 결제 건수 흐름을 함께
              비교합니다.
            </SectionBody>
          </SectionHeader>
          <SectionFallback
            query={salesQuery}
            pendingMessage="매출 데이터를 불러오는 중입니다."
            errorMessage="매출 데이터를 불러오지 못했습니다."
          />
          {salesData && totalSalesData ? (
            <>
              <MetricGrid>
                <MetricCard>
                  <MetricTitle>매출 총액 비교</MetricTitle>
                  <MetricValue>
                    {formatLargeWon(
                      totalSalesData.commercialTotalSalesInfo.totalSales,
                    )}
                  </MetricValue>
                  <MetricCaption>
                    자치구{' '}
                    {formatLargeWon(
                      totalSalesData.districtTotalSalesInfo.totalSales,
                    )}
                    {' · '}
                    행정동{' '}
                    {formatLargeWon(
                      totalSalesData.administrationTotalSalesInfo.totalSales,
                    )}
                  </MetricCaption>
                </MetricCard>
                <MetricCard>
                  <MetricTitle>결제 건수</MetricTitle>
                  <MetricValue>
                    {numberFormatter.format(
                      salesData.genderSalesCountInfo.maleSalesCount +
                        salesData.genderSalesCountInfo.femaleSalesCount,
                    )}
                    건
                  </MetricValue>
                  <MetricCaption>
                    남성{' '}
                    {numberFormatter.format(
                      salesData.genderSalesCountInfo.maleSalesCount,
                    )}
                    건 · 여성{' '}
                    {numberFormatter.format(
                      salesData.genderSalesCountInfo.femaleSalesCount,
                    )}
                    건
                  </MetricCaption>
                </MetricCard>
              </MetricGrid>
              <ChartGrid>
                <ChartSection
                  title="시간대별 매출"
                  helper="매출이 집중되는 시간대를 확인합니다."
                  items={toMetricBars(salesData.timeSalesInfo, {
                    sales00: '00시',
                    sales06: '06시',
                    sales11: '11시',
                    sales14: '14시',
                    sales17: '17시',
                    sales21: '21시',
                  })}
                  suffix="원"
                />
                <ChartSection
                  title="요일별 매출"
                  helper="요일별 매출 차이를 확인합니다."
                  items={toMetricBars(salesData.daySalesInfo, {
                    monSales: '월',
                    tueSales: '화',
                    wedSales: '수',
                    thuSales: '목',
                    friSales: '금',
                    satSales: '토',
                    sunSales: '일',
                  })}
                  suffix="원"
                />
                <ChartSection
                  title="연령대별 매출"
                  helper="가장 구매력이 높은 연령층을 비교합니다."
                  items={toMetricBars(salesData.ageSalesInfo, {
                    teenSales: '10대',
                    twentySales: '20대',
                    thirtySales: '30대',
                    fortySales: '40대',
                    fiftySales: '50대',
                    sixtySales: '60대+',
                  })}
                  suffix="원"
                />
                <ChartSection
                  title="성별 매출 비중"
                  helper="성별 매출 비중을 퍼센트로 정리합니다."
                  items={toGenderBars(salesData.ageGenderPercentSales)}
                  tone="success"
                  suffix="%"
                />
              </ChartGrid>
            </>
          ) : null}
        </SectionCard>

        <SectionCard>
          <SectionHeader>
            <SectionTitle>점포 분석</SectionTitle>
            <SectionBody>
              동일 업종 점포 분포와 가맹/일반 점포 비중, 개업률과 폐업률을
              확인합니다.
            </SectionBody>
          </SectionHeader>
          <SectionFallback
            query={storeQuery}
            pendingMessage="점포 데이터를 불러오는 중입니다."
            errorMessage="점포 데이터를 불러오지 못했습니다."
          />
          {storeData ? (
            <>
              <MetricGrid>
                <MetricCard>
                  <MetricTitle>일반점포 vs 프랜차이즈</MetricTitle>
                  <MetricValue>
                    일반{' '}
                    {storeData.franchiseStoreInfo.normalStorePercentage.toFixed(
                      1,
                    )}
                    %
                  </MetricValue>
                  <MetricCaption>
                    프랜차이즈{' '}
                    {storeData.franchiseStoreInfo.franchisePercentage.toFixed(
                      1,
                    )}
                    %
                  </MetricCaption>
                </MetricCard>
                <MetricCard>
                  <MetricTitle>개폐업률</MetricTitle>
                  <MetricValue>
                    개업 {storeData.openAndCloseStoreInfo.openedRate.toFixed(2)}
                    %
                  </MetricValue>
                  <MetricCaption>
                    폐업 {storeData.openAndCloseStoreInfo.closedRate.toFixed(2)}
                    %
                  </MetricCaption>
                </MetricCard>
              </MetricGrid>
              <ChartGrid>
                <ChartSection
                  title="유사 업종 점포수"
                  helper="선택 상권에서 경쟁 중인 세부 업종 분포입니다."
                  items={storeData.sameStoreInfos.map(item => ({
                    label: item.serviceCodeName,
                    value: item.totalStore,
                  }))}
                  suffix="개"
                />
              </ChartGrid>
            </>
          ) : null}
        </SectionCard>

        <SectionCard>
          <SectionHeader>
            <SectionTitle>상주인구 분석</SectionTitle>
            <SectionBody>
              상주인구 총합과 성별, 연령대 구성을 함께 확인합니다.
            </SectionBody>
          </SectionHeader>
          <SectionFallback
            query={residentQuery}
            pendingMessage="상주인구 데이터를 불러오는 중입니다."
            errorMessage="상주인구 데이터를 불러오지 못했습니다."
          />
          {residentData ? (
            <>
              <MetricGrid>
                <MetricCard>
                  <MetricTitle>상주인구 총합</MetricTitle>
                  <MetricValue>
                    {numberFormatter.format(
                      residentData.populationInfo.totalPopulation,
                    )}
                    명
                  </MetricValue>
                  <MetricCaption>
                    생활권 기반 상주인구 규모를 추정한 값입니다.
                  </MetricCaption>
                </MetricCard>
                <MetricCard>
                  <MetricTitle>성별 구성</MetricTitle>
                  <MetricValue>
                    남성 {residentData.malePercentage.toFixed(1)}%
                  </MetricValue>
                  <MetricCaption>
                    여성 {residentData.femalePercentage.toFixed(1)}%
                  </MetricCaption>
                </MetricCard>
              </MetricGrid>
              <ChartGrid>
                <ChartSection
                  title="연령대별 상주인구"
                  helper="방문객과 상주인구 연령대가 다를 수 있는지 비교해 볼 수 있습니다."
                  items={toMetricBars(
                    {
                      teenPopulation:
                        residentData.populationInfo.teenPopulation,
                      twentyPopulation:
                        residentData.populationInfo.twentyPopulation,
                      thirtyPopulation:
                        residentData.populationInfo.thirtyPopulation,
                      fortyPopulation:
                        residentData.populationInfo.fortyPopulation,
                      fiftyPopulation:
                        residentData.populationInfo.fiftyPopulation,
                      sixtyPopulation:
                        residentData.populationInfo.sixtyPopulation,
                    },
                    {
                      teenPopulation: '10대',
                      twentyPopulation: '20대',
                      thirtyPopulation: '30대',
                      fortyPopulation: '40대',
                      fiftyPopulation: '50대',
                      sixtyPopulation: '60대+',
                    },
                  )}
                  suffix="명"
                />
              </ChartGrid>
            </>
          ) : null}
        </SectionCard>

        <SectionCard>
          <SectionHeader>
            <SectionTitle>지출 분석</SectionTitle>
            <SectionBody>
              상권 총 지출 규모와 소비 카테고리 구성을 기준으로 구매력을
              추정합니다.
            </SectionBody>
          </SectionHeader>
          <SectionFallback
            query={expenditureQuery}
            pendingMessage="지출 데이터를 불러오는 중입니다."
            errorMessage="지출 데이터를 불러오지 못했습니다."
          />
          {expenditureData && totalExpenditureData ? (
            <>
              <MetricGrid>
                <MetricCard>
                  <MetricTitle>상권 총 지출</MetricTitle>
                  <MetricValue>
                    {formatLargeWon(
                      totalExpenditureData.commercialTotalIncomeInfo.totalPrice,
                    )}
                  </MetricValue>
                  <MetricCaption>
                    자치구{' '}
                    {formatLargeWon(
                      totalExpenditureData.districtTotalIncomeInfo.totalPrice,
                    )}
                    {' · '}
                    행정동{' '}
                    {formatLargeWon(
                      totalExpenditureData.administrationTotalIncomeInfo
                        .totalPrice,
                    )}
                  </MetricCaption>
                </MetricCard>
                <MetricCard>
                  <MetricTitle>월 평균 소득</MetricTitle>
                  <MetricValue>
                    {formatLargeWon(
                      expenditureData.avgIncomeInfo.monthAvgIncome,
                    )}
                  </MetricValue>
                  <MetricCaption>
                    소득 구간 코드{' '}
                    {expenditureData.avgIncomeInfo.incomeSectionCode}
                  </MetricCaption>
                </MetricCard>
              </MetricGrid>
              <ChartGrid>
                <ChartSection
                  title="지출 카테고리 분포"
                  helper="생활 소비가 어떤 카테고리에 집중되는지 확인합니다."
                  items={toMetricBars(expenditureData.typeIncomeInfo, {
                    groceryPrice: '식료품',
                    clothesPrice: '의류',
                    medicalPrice: '의료',
                    lifePrice: '생활',
                    trafficPrice: '교통',
                    leisurePrice: '레저',
                    culturePrice: '문화',
                    educationPrice: '교육',
                    luxuryPrice: '기타',
                  })}
                  suffix="원"
                />
              </ChartGrid>
            </>
          ) : null}
        </SectionCard>
      </SectionGrid>
    </Page>
  )
}
