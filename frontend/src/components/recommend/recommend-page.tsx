'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import styled from 'styled-components'
import LocationSelector from '@/components/location/location-selector'
import { districts } from '@/data/districts'
import {
  recommendCommercial,
  recommendDelete,
  recommendSave,
  recommendSaveList,
} from '@/lib/api/recommend'
import { getApiMessage, isApiSuccess } from '@/lib/api/response'
import { useAuthStore } from '@/stores/auth-store'
import { useSelectPlaceStore } from '@/stores/select-place-store'

const Page = styled.main`
  width: min(1200px, calc(100% - 48px));
  margin: 0 auto;
  padding: 40px 0 72px;
  display: grid;
  gap: 24px;
`

const Hero = styled.section`
  display: grid;
  gap: 16px;
  padding: 32px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  box-shadow: var(--shadow-level-1);
`

const Eyebrow = styled.p`
  color: var(--color-text-caption);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`

const HeroTitle = styled.h1`
  color: var(--color-text-900);
  font-size: 26px;
  line-height: 1.1;
  letter-spacing: 0;
`

const HeroBody = styled.p`
  max-width: 760px;
  color: var(--color-text-500);
  line-height: 1.8;
`

const Grid = styled.section`
  display: grid;
  grid-template-columns: 360px minmax(0, 1fr);
  gap: 24px;

  @media (max-width: 1040px) {
    grid-template-columns: 1fr;
  }
`

const Panel = styled.section`
  padding: 24px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: white;
  box-shadow: var(--shadow-level-1);
`

const PanelHeader = styled.div`
  display: grid;
  gap: 8px;
  margin-bottom: 18px;
`

const PanelTitle = styled.h2`
  color: var(--color-text-900);
  font-size: 24px;
  line-height: 1.2;
  letter-spacing: 0;
`

const PanelDescription = styled.p`
  color: var(--color-text-500);
  line-height: 1.75;
`

const ActionRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 18px;
`

const PrimaryButton = styled.button`
  height: 48px;
  padding: 0 18px;
  border: none;
  border-radius: var(--radius-control);
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

const SecondaryButton = styled.button`
  height: 48px;
  padding: 0 18px;
  border: 1px solid var(--color-primary-700);
  border-radius: var(--radius-control);
  background: white;
  color: var(--color-primary-700);
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
`

const PrimaryLink = styled(Link)`
  min-height: 48px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 18px;
  border-radius: var(--radius-control);
  background: var(--color-primary-700);
  color: white;
  font-size: 15px;
  font-weight: 700;
`

const Notice = styled.div<{ $tone?: 'error' | 'info' | 'success' }>`
  padding: 16px 18px;
  border-radius: var(--radius-card);
  background: ${props => {
    if (props.$tone === 'error') return 'rgba(209, 67, 67, 0.08)'
    if (props.$tone === 'success') return 'rgba(31, 157, 85, 0.08)'
    return 'var(--color-primary-100)'
  }};
  color: ${props => {
    if (props.$tone === 'error') return 'var(--color-danger)'
    if (props.$tone === 'success') return 'var(--color-success)'
    return 'var(--color-primary-700)'
  }};
  line-height: 1.75;
`

const Helper = styled.p`
  color: var(--color-text-500);
  font-size: 13px;
  line-height: 1.75;
`

const ResultLayout = styled.div`
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 20px;

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
  }
`

const ResultList = styled.div`
  display: grid;
  gap: 10px;
`

const ResultCard = styled.button<{ $selected: boolean }>`
  width: 100%;
  display: grid;
  gap: 8px;
  padding: 16px;
  border: 1px solid
    ${props =>
      props.$selected ? 'var(--color-primary-700)' : 'var(--color-border-200)'};
  border-radius: var(--radius-card);
  background: ${props =>
    props.$selected
      ? 'var(--color-primary-100)'
      : 'var(--color-surface-muted)'};
  text-align: left;
  cursor: pointer;
`

const ResultRank = styled.p`
  color: var(--color-primary-700);
  font-size: 13px;
  font-weight: 700;
`

const ResultName = styled.p`
  color: var(--color-text-900);
  font-size: 16px;
  font-weight: 700;
`

const ResultMeta = styled.p`
  color: var(--color-text-500);
  font-size: 13px;
  line-height: 1.65;
`

const DetailStack = styled.div`
  display: grid;
  gap: 20px;
`

const SummaryCard = styled.section`
  padding: 24px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface-muted);
`

const SummaryTitle = styled.h3`
  color: var(--color-text-900);
  font-size: 24px;
  line-height: 1.3;
  letter-spacing: 0;
`

const SummaryBody = styled.p`
  margin-top: 12px;
  color: var(--color-text-500);
  line-height: 1.85;
`

const BadgeRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
`

const Badge = styled.span`
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  padding: 0 12px;
  border-radius: 999px;
  background: white;
  color: var(--color-text-700);
  font-size: 13px;
  font-weight: 600;
`

const MetricsGrid = styled.div`
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
  border-radius: var(--radius-card);
  background: white;
`

const MetricTitle = styled.h4`
  color: var(--color-text-900);
  font-size: 18px;
`

const MetricBars = styled.div`
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
  background: var(--color-primary-100);
`

const BarFill = styled.div<{
  $width: number
  $tone: 'primary' | 'secondary' | 'muted'
}>`
  width: ${props => props.$width}%;
  height: 100%;
  border-radius: inherit;
  background: ${props => {
    if (props.$tone === 'secondary') return 'var(--color-success)'
    if (props.$tone === 'muted') return '#90a4c6'
    return 'var(--color-primary-700)'
  }};
`

const BlueOceanList = styled.div`
  display: grid;
  gap: 12px;
`

const BlueOceanItem = styled.article`
  padding: 18px 20px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface-muted);
`

const BlueOceanTitle = styled.p`
  color: var(--color-text-900);
  font-size: 16px;
  font-weight: 700;
`

const BlueOceanText = styled.p`
  margin-top: 8px;
  color: var(--color-text-500);
  line-height: 1.75;
`

const numberFormatter = new Intl.NumberFormat('ko-KR')
const compactFormatter = new Intl.NumberFormat('ko-KR', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

const formatPercent = (value: number) => `${value.toFixed(2)}%`

const formatCurrency = (value: number) => `${compactFormatter.format(value)}원`

const formatSummaryText = (current: number, average: number, unit: string) => {
  const difference = current - average
  const absolute = Math.abs(difference)
  const verb = difference >= 0 ? '많습니다' : '적습니다'

  return `${compactFormatter.format(absolute)}${unit} 더 ${verb}`
}

function ComparisonMetric({
  title,
  myValue,
  administrationValue,
  otherValue,
  formatter,
}: {
  title: string
  myValue: number
  administrationValue: number
  otherValue: number
  formatter: (value: number) => string
}) {
  const maxValue = Math.max(myValue, administrationValue, otherValue, 0)

  return (
    <MetricCard>
      <MetricTitle>{title}</MetricTitle>
      <MetricBars>
        {[
          { label: '선택 상권', value: myValue, tone: 'primary' as const },
          {
            label: '행정동 평균',
            value: administrationValue,
            tone: 'secondary' as const,
          },
          { label: '서울 평균', value: otherValue, tone: 'muted' as const },
        ].map(item => (
          <BarRow key={item.label}>
            <BarTop>
              <BarLabel>{item.label}</BarLabel>
              <BarValue>{formatter(item.value)}</BarValue>
            </BarTop>
            <BarTrack>
              <BarFill
                $tone={item.tone}
                $width={maxValue === 0 ? 0 : (item.value / maxValue) * 100}
              />
            </BarTrack>
          </BarRow>
        ))}
      </MetricBars>
    </MetricCard>
  )
}

export default function RecommendPage() {
  const queryClient = useQueryClient()
  const [hasRequested, setHasRequested] = useState(false)
  const [selectedCommercialCode, setSelectedCommercialCode] = useState<
    number | null
  >(null)
  const [message, setMessage] = useState<{
    tone: 'error' | 'info' | 'success'
    text: string
  } | null>(null)
  const hasHydrated = useAuthStore(state => state.hasHydrated)
  const isLoggedIn = useAuthStore(state => state.isLoggedIn)
  const selectedDistrict = useSelectPlaceStore(state => state.selectedDistrict)
  const selectedAdministration = useSelectPlaceStore(
    state => state.selectedAdministration,
  )

  const hasValidSelection =
    selectedDistrict.code > 0 && selectedAdministration.code > 0

  const resultQuery = useQuery({
    queryKey: [
      'recommendCommercial',
      selectedDistrict.code,
      selectedAdministration.code,
    ],
    queryFn: () =>
      recommendCommercial({
        districtCode: selectedDistrict.code,
        administrationCode: selectedAdministration.code,
      }),
    enabled: hasRequested && hasHydrated && isLoggedIn && hasValidSelection,
  })

  const savedListQuery = useQuery({
    queryKey: ['recommendSaveList'],
    queryFn: recommendSaveList,
    enabled: hasHydrated && isLoggedIn,
  })

  const saveMutation = useMutation({
    mutationFn: recommendSave,
    onSuccess: response => {
      if (!isApiSuccess(response)) {
        setMessage({
          tone: 'error',
          text: getApiMessage(response, '추천 상권을 저장하지 못했습니다.'),
        })
        return
      }

      setMessage({
        tone: 'success',
        text: '추천 상권을 내 보관함에 저장했습니다.',
      })
      queryClient.invalidateQueries({ queryKey: ['recommendSaveList'] })
    },
    onError: () => {
      setMessage({
        tone: 'error',
        text: '추천 상권 정보를 확인한 뒤 다시 저장해주세요.',
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: recommendDelete,
    onSuccess: response => {
      if (!isApiSuccess(response)) {
        setMessage({
          tone: 'error',
          text: getApiMessage(
            response,
            '추천 상권 저장을 해제하지 못했습니다.',
          ),
        })
        return
      }

      setMessage({
        tone: 'success',
        text: '추천 상권을 내 보관함에서 제거했습니다.',
      })
      queryClient.invalidateQueries({ queryKey: ['recommendSaveList'] })
    },
    onError: () => {
      setMessage({
        tone: 'error',
        text: '저장 상태를 확인한 뒤 다시 해제해주세요.',
      })
    },
  })

  const results =
    resultQuery.data && isApiSuccess(resultQuery.data)
      ? resultQuery.data.dataBody
      : []
  const selectedResult =
    results.find(item => item.commercialCode === selectedCommercialCode) ??
    results[0] ??
    null
  const currentDistrict = districts.find(
    district => district.gooCode === selectedDistrict.code,
  )
  const isSaved =
    Boolean(selectedResult) &&
    Boolean(
      savedListQuery.data &&
      isApiSuccess(savedListQuery.data) &&
      savedListQuery.data.dataBody.data.some(
        item => Number(item.commercialCode) === selectedResult.commercialCode,
      ),
    )

  const handleSubmit = () => {
    setMessage(null)

    if (!hasValidSelection) {
      setMessage({
        tone: 'error',
        text: '자치구와 행정동을 모두 선택한 뒤 추천을 요청해주세요.',
      })
      return
    }

    if (!hasHydrated || !isLoggedIn) {
      setMessage({
        tone: 'info',
        text: '상권 추천 결과 조회와 저장은 로그인 후 사용할 수 있습니다.',
      })
      return
    }

    setHasRequested(true)
    setSelectedCommercialCode(null)
  }

  const handleSaveToggle = () => {
    if (!selectedResult) {
      return
    }

    const payload = {
      districtCode: selectedDistrict.code,
      administrationCode: selectedAdministration.code,
      commercialCode: selectedResult.commercialCode,
    }

    if (isSaved) {
      deleteMutation.mutate(payload)
      return
    }

    saveMutation.mutate(payload)
  }

  return (
    <Page>
      <Hero>
        <Eyebrow>Recommend</Eyebrow>
        <HeroTitle>선택한 구와 동을 기준으로 추천 상권을 비교합니다.</HeroTitle>
        <HeroBody>
          레거시 추천 플로우의 핵심인 지역 선택, 추천 결과 비교, 저장 토글을
          Next 구조로 이관했습니다. 현재 단계에서는 지도 SDK 대신 선택 지역과
          추천 결과를 데이터 카드 중심으로 정리합니다.
        </HeroBody>
      </Hero>

      <Grid>
        <Panel>
          <PanelHeader>
            <PanelTitle>추천 조건 선택</PanelTitle>
            <PanelDescription>
              자치구와 행정동을 고른 뒤 추천을 요청하면 상권 후보 리스트와 비교
              지표가 열립니다.
            </PanelDescription>
          </PanelHeader>

          <LocationSelector
            title="위치 선택"
            description="추천은 자치구와 행정동 조합을 기준으로 계산됩니다."
          />

          {currentDistrict ? (
            <Notice>
              선택 자치구 중심 좌표: {currentDistrict.gooCenter[1].toFixed(4)},{' '}
              {currentDistrict.gooCenter[0].toFixed(4)}
            </Notice>
          ) : null}

          {message ? (
            <Notice $tone={message.tone}>{message.text}</Notice>
          ) : null}

          <ActionRow>
            {hasHydrated && isLoggedIn ? (
              <PrimaryButton type="button" onClick={handleSubmit}>
                상권 추천받기
              </PrimaryButton>
            ) : (
              <PrimaryLink href="/login">로그인 후 추천받기</PrimaryLink>
            )}
            <SecondaryButton
              type="button"
              onClick={() => setHasRequested(false)}
            >
              결과 접기
            </SecondaryButton>
          </ActionRow>

          <Helper>
            레거시와 동일하게 추천 결과 조회와 저장은 로그인 사용자 기준으로
            동작합니다.
          </Helper>
        </Panel>

        <Panel>
          <PanelHeader>
            <PanelTitle>추천 결과</PanelTitle>
            <PanelDescription>
              추천 상권 간 상대 비교와 블루오션 후보를 한 화면에서 확인할 수
              있습니다.
            </PanelDescription>
          </PanelHeader>

          {!hasRequested ? (
            <Notice>왼쪽에서 위치를 선택하고 추천 요청을 실행해주세요.</Notice>
          ) : null}

          {hasRequested && resultQuery.isPending ? (
            <Notice>추천 상권 데이터를 불러오는 중입니다.</Notice>
          ) : null}

          {hasRequested &&
          resultQuery.data &&
          !isApiSuccess(resultQuery.data) ? (
            <Notice $tone="error">
              {getApiMessage(
                resultQuery.data,
                '추천 상권 결과를 불러오지 못했습니다.',
              )}
            </Notice>
          ) : null}

          {hasRequested &&
          resultQuery.data &&
          isApiSuccess(resultQuery.data) &&
          results.length === 0 ? (
            <Notice $tone="info">
              현재 선택 조건으로 제공 가능한 추천 상권이 없습니다.
            </Notice>
          ) : null}

          {selectedResult ? (
            <ResultLayout>
              <ResultList>
                {results.map((item, index) => (
                  <ResultCard
                    key={item.commercialCode}
                    type="button"
                    $selected={
                      item.commercialCode === selectedResult.commercialCode
                    }
                    onClick={() =>
                      setSelectedCommercialCode(item.commercialCode)
                    }
                  >
                    <ResultRank>{index + 1}. 추천 후보</ResultRank>
                    <ResultName>{item.commercialCodeName}</ResultName>
                    <ResultMeta>
                      유동인구{' '}
                      {numberFormatter.format(
                        item.footTrafficCommercialInfo.myFootTraffic,
                      )}
                      명
                    </ResultMeta>
                  </ResultCard>
                ))}
              </ResultList>

              <DetailStack>
                <SummaryCard>
                  <SummaryTitle>
                    {selectedResult.commercialCodeName}
                  </SummaryTitle>
                  <SummaryBody>
                    선택 상권의 점포 수는 행정동 평균 대비{' '}
                    {formatSummaryText(
                      selectedResult.storeCommercialInfo.myStores,
                      selectedResult.storeCommercialInfo.administrationStores,
                      '개',
                    )}
                    . 유동인구는{' '}
                    {formatSummaryText(
                      selectedResult.footTrafficCommercialInfo.myFootTraffic,
                      selectedResult.footTrafficCommercialInfo
                        .administrationFootTraffic,
                      '명',
                    )}
                    . 평균 총매출은{' '}
                    {formatSummaryText(
                      selectedResult.salesCommercialInfo.mySales / 4,
                      selectedResult.salesCommercialInfo.administrationSales /
                        4,
                      '원',
                    )}
                    . 폐업률은 행정동 평균 대비{' '}
                    {formatPercent(
                      selectedResult.closedRateCommercialInfo.myClosedRate -
                        selectedResult.closedRateCommercialInfo
                          .administrationClosedRate,
                    )}
                    의 차이를 보입니다.
                  </SummaryBody>
                  <BadgeRow>
                    <Badge>{selectedDistrict.name}</Badge>
                    <Badge>{selectedAdministration.name}</Badge>
                    <Badge>상권 코드 {selectedResult.commercialCode}</Badge>
                  </BadgeRow>
                  {hasHydrated && isLoggedIn ? (
                    <ActionRow>
                      <PrimaryButton
                        type="button"
                        onClick={handleSaveToggle}
                        disabled={
                          saveMutation.isPending || deleteMutation.isPending
                        }
                      >
                        {saveMutation.isPending || deleteMutation.isPending
                          ? '처리 중...'
                          : isSaved
                            ? '저장 해제'
                            : '내 보관함 저장'}
                      </PrimaryButton>
                      <SecondaryButton as={Link} href="/analysis/simulation">
                        창업 시뮬레이션으로 이동
                      </SecondaryButton>
                    </ActionRow>
                  ) : null}
                </SummaryCard>

                <MetricsGrid>
                  <ComparisonMetric
                    title="유동 인구"
                    myValue={
                      selectedResult.footTrafficCommercialInfo.myFootTraffic
                    }
                    administrationValue={
                      selectedResult.footTrafficCommercialInfo
                        .administrationFootTraffic
                    }
                    otherValue={
                      selectedResult.footTrafficCommercialInfo.otherFootTraffic
                    }
                    formatter={value => `${compactFormatter.format(value)}명`}
                  />
                  <ComparisonMetric
                    title="점포 수"
                    myValue={selectedResult.storeCommercialInfo.myStores}
                    administrationValue={
                      selectedResult.storeCommercialInfo.administrationStores
                    }
                    otherValue={selectedResult.storeCommercialInfo.otherStores}
                    formatter={value => `${numberFormatter.format(value)}개`}
                  />
                  <ComparisonMetric
                    title="폐업률"
                    myValue={
                      selectedResult.closedRateCommercialInfo.myClosedRate
                    }
                    administrationValue={
                      selectedResult.closedRateCommercialInfo
                        .administrationClosedRate
                    }
                    otherValue={
                      selectedResult.closedRateCommercialInfo.otherClosedRate
                    }
                    formatter={formatPercent}
                  />
                  <ComparisonMetric
                    title="평균 총매출"
                    myValue={selectedResult.salesCommercialInfo.mySales / 4}
                    administrationValue={
                      selectedResult.salesCommercialInfo.administrationSales / 4
                    }
                    otherValue={
                      selectedResult.salesCommercialInfo.otherSales / 4
                    }
                    formatter={formatCurrency}
                  />
                </MetricsGrid>

                <Panel>
                  <PanelHeader>
                    <PanelTitle>블루오션 제안</PanelTitle>
                    <PanelDescription>
                      주변 상권에는 상대적으로 많지만 현재 상권에는 적은 업종을
                      기준으로 정리합니다.
                    </PanelDescription>
                  </PanelHeader>
                  <BlueOceanList>
                    {selectedResult.blueOceanInfo.map(item => (
                      <BlueOceanItem key={item.serviceCodeName}>
                        <BlueOceanTitle>{item.serviceCodeName}</BlueOceanTitle>
                        <BlueOceanText>
                          현재 상권 점포수{' '}
                          {numberFormatter.format(item.myStore)}개 / 주변 전체{' '}
                          {numberFormatter.format(item.totalStore)}개 / 점포
                          비중 {item.storeRate.toFixed(1)}%
                        </BlueOceanText>
                      </BlueOceanItem>
                    ))}
                  </BlueOceanList>
                </Panel>
              </DetailStack>
            </ResultLayout>
          ) : null}
        </Panel>
      </Grid>
    </Page>
  )
}
