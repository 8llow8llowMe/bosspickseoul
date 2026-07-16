'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import styled from 'styled-components'
import { fetchStatusDetail, fetchTopList } from '@/lib/api/status'
import { getApiMessage, isApiSuccess } from '@/lib/api/response'
import type {
  FootTrafficSeries,
  StatusTopList,
  TopListItem,
} from '@/types/status'

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

const TabList = styled.nav`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
`

const TabButton = styled.button<{ $active: boolean }>`
  min-height: 42px;
  padding: 0 16px;
  border: 1px solid
    ${props =>
      props.$active ? 'var(--color-primary-700)' : 'var(--color-border-200)'};
  border-radius: 999px;
  background: ${props =>
    props.$active ? 'var(--color-primary-100)' : 'white'};
  color: ${props =>
    props.$active ? 'var(--color-primary-700)' : 'var(--color-text-500)'};
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
`

const ContentGrid = styled.section`
  display: grid;
  grid-template-columns: 340px minmax(0, 1fr);
  gap: 24px;

  @media (max-width: 1024px) {
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

const RankingList = styled.div`
  display: grid;
  gap: 10px;
`

const RankingButton = styled.button<{ $selected: boolean }>`
  width: 100%;
  display: grid;
  gap: 10px;
  padding: 16px 18px;
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

const RankingTopRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`

const RankingName = styled.p`
  color: var(--color-text-900);
  font-size: 16px;
  font-weight: 700;
`

const RankingMeta = styled.p`
  color: var(--color-text-500);
  font-size: 13px;
  line-height: 1.6;
`

const RatePill = styled.span<{ $positive: boolean }>`
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 0 10px;
  border-radius: 999px;
  background: ${props =>
    props.$positive ? 'rgba(31, 157, 85, 0.08)' : 'rgba(217, 130, 43, 0.12)'};
  color: ${props =>
    props.$positive ? 'var(--color-success)' : 'var(--color-warning)'};
  font-size: 12px;
  font-weight: 700;
`

const DistrictGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 1180px) {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  @media (max-width: 820px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  @media (max-width: 560px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`

const DistrictCard = styled.button<{ $level: number; $selected: boolean }>`
  min-height: 116px;
  padding: 16px;
  border: 1px solid
    ${props =>
      props.$selected
        ? 'var(--color-primary-700)'
        : 'var(--color-primary-100)'};
  border-radius: var(--radius-card);
  background: ${props => {
    const palette = ['#eef4ff', '#dce8ff', '#c4d9ff', '#94bcff', '#5b92ef']
    return palette[Math.max(0, Math.min(4, props.$level - 1))]
  }};
  color: ${props =>
    props.$level >= 4
      ? 'white'
      : props.$selected
        ? 'var(--color-primary-700)'
        : 'var(--color-text-900)'};
  text-align: left;
  cursor: pointer;
  box-shadow: ${props => (props.$selected ? 'var(--shadow-level-2)' : 'none')};
`

const DistrictName = styled.p`
  margin-bottom: 8px;
  font-size: 15px;
  font-weight: 700;
`

const DistrictMetric = styled.p`
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 0;
`

const DistrictSub = styled.p`
  margin-top: 6px;
  font-size: 12px;
  opacity: 0.9;
`

const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`

const SummaryCard = styled.article`
  padding: 20px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface-muted);
`

const SummaryLabel = styled.p`
  margin-bottom: 10px;
  color: var(--color-text-500);
  font-size: 13px;
`

const SummaryValue = styled.p`
  color: var(--color-text-900);
  font-size: 24px;
  font-weight: 700;
  letter-spacing: 0;
`

const SectionGrid = styled.div`
  display: grid;
  gap: 20px;
`

const DetailSection = styled.section`
  padding: 24px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: white;
`

const SectionTitle = styled.h3`
  color: var(--color-text-900);
  font-size: 22px;
  line-height: 1.3;
`

const SectionText = styled.p`
  margin-top: 8px;
  color: var(--color-text-500);
  line-height: 1.75;
`

const ChartGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-top: 18px;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`

const ChartCard = styled.article`
  padding: 18px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface-muted);
`

const ChartTitle = styled.h4`
  color: var(--color-text-900);
  font-size: 16px;
  line-height: 1.4;
`

const ChartSummary = styled.p`
  margin-top: 6px;
  color: var(--color-text-500);
  font-size: 13px;
  line-height: 1.7;
`

const BarList = styled.div`
  display: grid;
  gap: 10px;
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
  $tone?: 'primary' | 'success' | 'warning'
}>`
  width: ${props => props.$width}%;
  height: 100%;
  border-radius: inherit;
  background: ${props => {
    if (props.$tone === 'success') return 'var(--color-success)'
    if (props.$tone === 'warning') return 'var(--color-warning)'
    return 'var(--color-primary-700)'
  }};
`

const Notice = styled.div<{ $tone?: 'error' | 'info' }>`
  padding: 16px 18px;
  border-radius: var(--radius-card);
  background: ${props =>
    props.$tone === 'error'
      ? 'rgba(209, 67, 67, 0.08)'
      : 'var(--color-primary-100)'};
  color: ${props =>
    props.$tone === 'error'
      ? 'var(--color-danger)'
      : 'var(--color-primary-700)'};
  line-height: 1.75;
`

const tabs = [
  { key: 'footTrafficTopTenList', label: '유동인구' },
  { key: 'salesTopTenList', label: '평균매출' },
  { key: 'openedRateTopTenList', label: '개업률' },
  { key: 'closedRateTopTenList', label: '폐업률' },
] as const

const dayLabels: Record<string, string> = {
  monday: '월요일',
  tuesday: '화요일',
  wednesday: '수요일',
  thursday: '목요일',
  friday: '금요일',
  saturday: '토요일',
  sunday: '일요일',
}

const numberFormatter = new Intl.NumberFormat('ko-KR')

const formatCompact = (value: number) =>
  new Intl.NumberFormat('ko-KR', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)

const formatMetric = (tabIndex: number, item: TopListItem) => {
  if (tabIndex === 0) {
    return `${formatCompact(item.total)}명`
  }

  if (tabIndex === 1) {
    return `${formatCompact(item.total)}원`
  }

  return `${numberFormatter.format(item.total)}개`
}

const formatPercent = (value: number) => `${value.toFixed(2)}%`

const getRankedItems = (topList: StatusTopList, tabIndex: number) => {
  if (tabIndex === 0) return topList.footTrafficTopTenList
  if (tabIndex === 1) return topList.salesTopTenList
  if (tabIndex === 2) return topList.openedRateTopTenList
  return topList.closedRateTopTenList
}

const toBarItems = (series: FootTrafficSeries) => {
  return Object.entries(series.data).map(([label, value]) => ({
    label: dayLabels[label] ?? label,
    value,
  }))
}

const toMetricItems = <T,>(
  items: T[],
  getLabel: (item: T) => string,
  getValue: (item: T) => number,
) =>
  items.map(item => ({
    label: getLabel(item),
    value: getValue(item),
  }))

function MetricBarSection({
  title,
  summary,
  items,
  tone = 'primary',
  suffix = '',
}: {
  title: string
  summary?: string
  items: { label: string; value: number }[]
  tone?: 'primary' | 'success' | 'warning'
  suffix?: string
}) {
  const maxValue = Math.max(...items.map(item => item.value), 0)

  return (
    <ChartCard>
      <ChartTitle>{title}</ChartTitle>
      {summary ? <ChartSummary>{summary}</ChartSummary> : null}
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

export default function StatusPage() {
  const [selectedTab, setSelectedTab] = useState(0)
  const [selectedDistrictCode, setSelectedDistrictCode] = useState<
    number | null
  >(null)

  const topListQuery = useQuery({
    queryKey: ['statusTopList'],
    queryFn: fetchTopList,
  })

  const topListData =
    topListQuery.data && isApiSuccess(topListQuery.data)
      ? topListQuery.data.dataBody
      : null

  const currentItems = topListData
    ? getRankedItems(topListData, selectedTab)
    : []
  const selectedDistrict =
    currentItems.find(
      item => Number(item.districtCode) === selectedDistrictCode,
    ) ?? currentItems[0]
  const selectedDistrictNumber = selectedDistrict
    ? Number(selectedDistrict.districtCode)
    : null

  const detailQuery = useQuery({
    queryKey: ['statusDetail', selectedDistrict?.districtCode ?? null],
    queryFn: () => fetchStatusDetail(selectedDistrictNumber as number),
    enabled: selectedDistrictNumber !== null,
  })

  if (topListQuery.isPending) {
    return (
      <Page>
        <Notice>서울 자치구 상권 현황을 불러오는 중입니다.</Notice>
      </Page>
    )
  }

  if (!topListData) {
    return (
      <Page>
        <Notice $tone="error">
          {getApiMessage(
            topListQuery.data,
            '구별 상권 현황 데이터를 불러오지 못했습니다.',
          )}
        </Notice>
      </Page>
    )
  }

  return (
    <Page>
      <Hero>
        <Eyebrow>Status</Eyebrow>
        <HeroTitle>서울 자치구별 상권 현황을 한 화면에서 비교합니다.</HeroTitle>
        <HeroBody>
          레거시 `status` 화면의 핵심인 랭킹 전환, 자치구 선택, 상세 지표 조회를
          Next 구조로 이관했습니다. 지도 SDK 대신 district surface와 데이터
          패널로 비교 흐름을 우선 안정화했습니다.
        </HeroBody>
        <TabList aria-label="status tabs">
          {tabs.map((tab, index) => (
            <TabButton
              key={tab.key}
              type="button"
              $active={selectedTab === index}
              onClick={() => setSelectedTab(index)}
            >
              {tab.label}
            </TabButton>
          ))}
        </TabList>
      </Hero>

      <ContentGrid>
        <Panel>
          <PanelHeader>
            <PanelTitle>Top 10 랭킹</PanelTitle>
            <PanelDescription>
              현재 탭 기준 상위 자치구를 고르면 오른쪽에 상세 지표가 열립니다.
            </PanelDescription>
          </PanelHeader>
          <RankingList>
            {currentItems.slice(0, 10).map((item, index) => (
              <RankingButton
                key={`${item.districtCode}-${selectedTab}`}
                type="button"
                $selected={item.districtCode === selectedDistrict?.districtCode}
                onClick={() =>
                  setSelectedDistrictCode(Number(item.districtCode))
                }
              >
                <RankingTopRow>
                  <RankingName>
                    {index + 1}. {item.districtCodeName}
                  </RankingName>
                  <RatePill $positive={item.totalRate >= 0}>
                    {formatPercent(item.totalRate)}
                  </RatePill>
                </RankingTopRow>
                <RankingMeta>{formatMetric(selectedTab, item)}</RankingMeta>
              </RankingButton>
            ))}
          </RankingList>
        </Panel>

        <SectionGrid>
          <Panel>
            <PanelHeader>
              <PanelTitle>서울 25개 자치구 비교</PanelTitle>
              <PanelDescription>
                같은 지표 안에서 모든 자치구의 상대적 위치를 색상 단계로
                확인합니다.
              </PanelDescription>
            </PanelHeader>
            <DistrictGrid>
              {currentItems.map(item => (
                <DistrictCard
                  key={`${item.districtCode}-${selectedTab}-surface`}
                  type="button"
                  $level={item.level}
                  $selected={
                    item.districtCode === selectedDistrict?.districtCode
                  }
                  onClick={() =>
                    setSelectedDistrictCode(Number(item.districtCode))
                  }
                >
                  <DistrictName>{item.districtCodeName}</DistrictName>
                  <DistrictMetric>
                    {formatMetric(selectedTab, item)}
                  </DistrictMetric>
                  <DistrictSub>
                    변화율 {formatPercent(item.totalRate)}
                  </DistrictSub>
                </DistrictCard>
              ))}
            </DistrictGrid>
          </Panel>

          {selectedDistrict ? (
            <Panel>
              <PanelHeader>
                <PanelTitle>
                  {selectedDistrict.districtCodeName} 상세 리포트
                </PanelTitle>
                <PanelDescription>
                  선택 지표: {tabs[selectedTab].label}. 레거시
                  `/district/detail/:districtCode` 응답을 기반으로 요약했습니다.
                </PanelDescription>
              </PanelHeader>
              <SummaryGrid>
                <SummaryCard>
                  <SummaryLabel>현재 선택 지표</SummaryLabel>
                  <SummaryValue>
                    {formatMetric(selectedTab, selectedDistrict)}
                  </SummaryValue>
                </SummaryCard>
                <SummaryCard>
                  <SummaryLabel>서울 내 단계</SummaryLabel>
                  <SummaryValue>Level {selectedDistrict.level}</SummaryValue>
                </SummaryCard>
                <SummaryCard>
                  <SummaryLabel>전 분기 대비</SummaryLabel>
                  <SummaryValue>
                    {formatPercent(selectedDistrict.totalRate)}
                  </SummaryValue>
                </SummaryCard>
                <SummaryCard>
                  <SummaryLabel>선택 코드</SummaryLabel>
                  <SummaryValue>{selectedDistrict.districtCode}</SummaryValue>
                </SummaryCard>
              </SummaryGrid>
            </Panel>
          ) : null}

          {detailQuery.isPending ? (
            <Notice>자치구 상세 데이터를 불러오는 중입니다.</Notice>
          ) : null}

          {detailQuery.data && !isApiSuccess(detailQuery.data) ? (
            <Notice $tone="error">
              {getApiMessage(
                detailQuery.data,
                '자치구 상세 데이터를 불러오지 못했습니다.',
              )}
            </Notice>
          ) : null}

          {detailQuery.data && isApiSuccess(detailQuery.data) ? (
            <>
              <DetailSection>
                <SectionTitle>상권 변화 지표</SectionTitle>
                <SectionText>
                  {
                    detailQuery.data.dataBody.changeIndicatorDistrictDetail
                      .changeIndicatorName
                  }
                  {' · '}
                  {
                    detailQuery.data.dataBody.changeIndicatorDistrictDetail
                      .changeIndicator
                  }
                </SectionText>
                <SummaryGrid>
                  <SummaryCard>
                    <SummaryLabel>개업 지속 개월</SummaryLabel>
                    <SummaryValue>
                      {
                        detailQuery.data.dataBody.changeIndicatorDistrictDetail
                          .openedMonths
                      }
                      개월
                    </SummaryValue>
                  </SummaryCard>
                  <SummaryCard>
                    <SummaryLabel>폐업 지속 개월</SummaryLabel>
                    <SummaryValue>
                      {
                        detailQuery.data.dataBody.changeIndicatorDistrictDetail
                          .closedMonths
                      }
                      개월
                    </SummaryValue>
                  </SummaryCard>
                </SummaryGrid>
              </DetailSection>

              <DetailSection>
                <SectionTitle>유동인구 상세</SectionTitle>
                <SectionText>
                  시간대, 요일, 연령, 성별 흐름을 레거시 상세 리포트 구조 그대로
                  나눠서 보여줍니다.
                </SectionText>
                <ChartGrid>
                  <MetricBarSection
                    title="분기별 유동인구"
                    summary={
                      detailQuery.data.dataBody.footTrafficDistrictDetail
                        .footTrafficDistrictListByPeriod.summary
                    }
                    items={toBarItems(
                      detailQuery.data.dataBody.footTrafficDistrictDetail
                        .footTrafficDistrictListByPeriod,
                    )}
                    suffix="명"
                  />
                  <MetricBarSection
                    title="시간대별 유동인구"
                    summary={
                      detailQuery.data.dataBody.footTrafficDistrictDetail
                        .footTrafficDistrictListByTime.summary
                    }
                    items={toBarItems(
                      detailQuery.data.dataBody.footTrafficDistrictDetail
                        .footTrafficDistrictListByTime,
                    )}
                    suffix="명"
                  />
                  <MetricBarSection
                    title="성별 유동인구"
                    summary={
                      detailQuery.data.dataBody.footTrafficDistrictDetail
                        .footTrafficDistrictListByGender.summary
                    }
                    items={toBarItems(
                      detailQuery.data.dataBody.footTrafficDistrictDetail
                        .footTrafficDistrictListByGender,
                    )}
                    tone="success"
                    suffix="명"
                  />
                  <MetricBarSection
                    title="연령대별 유동인구"
                    summary={
                      detailQuery.data.dataBody.footTrafficDistrictDetail
                        .footTrafficDistrictListByAge.summary
                    }
                    items={toBarItems(
                      detailQuery.data.dataBody.footTrafficDistrictDetail
                        .footTrafficDistrictListByAge,
                    )}
                    tone="warning"
                    suffix="명"
                  />
                  <MetricBarSection
                    title="요일별 유동인구"
                    summary={
                      detailQuery.data.dataBody.footTrafficDistrictDetail
                        .footTrafficDistrictListByDay.summary
                    }
                    items={toBarItems(
                      detailQuery.data.dataBody.footTrafficDistrictDetail
                        .footTrafficDistrictListByDay,
                    )}
                    suffix="명"
                  />
                </ChartGrid>
              </DetailSection>

              <DetailSection>
                <SectionTitle>점포수와 개폐업 흐름</SectionTitle>
                <SectionText>
                  업종별 점포수와 행정동 단위 개업률·폐업률 상위 지점을 묶어
                  제공합니다.
                </SectionText>
                <ChartGrid>
                  <MetricBarSection
                    title="업종별 점포수 Top 8"
                    items={toMetricItems(
                      detailQuery.data.dataBody.storeDistrictDetail
                        .storeDistrictTotalTopEightList,
                      item => item.serviceCodeName,
                      item => item.totalStore,
                    )}
                    suffix="개"
                  />
                  <MetricBarSection
                    title="행정동별 개업률 Top 5"
                    items={toMetricItems(
                      detailQuery.data.dataBody.storeDistrictDetail
                        .openedStoreAdministrationTopFiveList,
                      item => item.administrationCodeName,
                      item => item.curOpenedRate,
                    )}
                    tone="success"
                    suffix="%"
                  />
                  <MetricBarSection
                    title="행정동별 폐업률 Top 5"
                    items={toMetricItems(
                      detailQuery.data.dataBody.storeDistrictDetail
                        .closedStoreAdministrationTopFiveList,
                      item => item.administrationCodeName,
                      item => item.curClosedRate,
                    )}
                    tone="warning"
                    suffix="%"
                  />
                </ChartGrid>
              </DetailSection>

              <DetailSection>
                <SectionTitle>매출 변화 분석</SectionTitle>
                <SectionText>
                  업종 단위와 행정동 단위의 월 매출 변화율을 함께 비교합니다.
                </SectionText>
                <ChartGrid>
                  <MetricBarSection
                    title="업종별 월 매출 변화율 Top 5"
                    items={toMetricItems(
                      detailQuery.data.dataBody.salesDistrictDetail
                        .salesDistrictSalesTopFiveList,
                      item => item.serviceCodeName,
                      item => item.monthSalesChangeRate,
                    )}
                    suffix="%"
                  />
                  <MetricBarSection
                    title="행정동별 월 매출 변화율 Top 5"
                    items={toMetricItems(
                      detailQuery.data.dataBody.salesDistrictDetail
                        .salesAdministrationTopFiveList,
                      item => item.administrationCodeName,
                      item => item.monthSalesChangeRate,
                    )}
                    tone="success"
                    suffix="%"
                  />
                </ChartGrid>
              </DetailSection>
            </>
          ) : null}
        </SectionGrid>
      </ContentGrid>
    </Page>
  )
}
