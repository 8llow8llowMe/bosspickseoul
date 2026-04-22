'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import styled from 'styled-components'
import {
  createSimulationReport,
  fetchSavedSimulationList,
} from '@/lib/api/simulation'
import { getApiMessage, isApiSuccess } from '@/lib/api/response'
import { formatLargeWon } from '@/lib/format'
import type {
  SimulationReportRequest,
  SimulationSavedItem,
} from '@/types/simulation'

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

const SecondaryLink = styled(Link)`
  min-height: 48px;
  width: fit-content;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 18px;
  border: 1px solid var(--color-primary-700);
  border-radius: var(--radius-control);
  color: var(--color-primary-700);
  font-size: 15px;
  font-weight: 700;
`

const Panel = styled.section`
  padding: 24px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: white;
  box-shadow: var(--shadow-level-1);
`

const ControlGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;

  @media (max-width: 840px) {
    grid-template-columns: 1fr;
  }
`

const Select = styled.select`
  width: 100%;
  min-height: 50px;
  padding: 0 16px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-control);
  background: white;
  color: var(--color-text-900);
  font-size: 15px;
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

const CompareGrid = styled.section`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
  }
`

const CompareCard = styled.article`
  padding: 24px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: white;
  box-shadow: var(--shadow-level-1);
`

const CompareTitle = styled.h2`
  color: var(--color-text-900);
  font-size: 24px;
  line-height: 1.2;
  letter-spacing: 0;
`

const CompareSubtitle = styled.p`
  margin-top: 8px;
  color: var(--color-text-500);
  line-height: 1.75;
`

const StatGrid = styled.div`
  display: grid;
  gap: 12px;
  margin-top: 18px;
`

const StatCard = styled.div`
  padding: 16px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface-muted);
`

const StatLabel = styled.p`
  color: var(--color-text-500);
  font-size: 13px;
`

const StatValue = styled.p`
  margin-top: 6px;
  color: var(--color-text-900);
  font-size: 20px;
  font-weight: 700;
  line-height: 1.4;
`

const toRequest = (item: SimulationSavedItem): SimulationReportRequest => ({
  isFranchisee: item.isFranchisee,
  brandName: item.brandName,
  gugun: item.gugun,
  serviceCode: item.serviceCode,
  serviceCodeName: item.serviceCodeName,
  storeSize: item.storeSize,
  floor: item.floor,
})

const toOptionLabel = (item: SimulationSavedItem) =>
  `${item.brandName ?? '개인 창업'} · ${item.gugun} · ${item.serviceCodeName} · ${item.storeSize}㎡ · ${item.floor}`

type SimulationComparePageProps = {
  basePath: '/analysis/simulation' | '/simulation'
}

export default function SimulationComparePage({
  basePath,
}: SimulationComparePageProps) {
  const [firstId, setFirstId] = useState('')
  const [secondId, setSecondId] = useState('')

  const savedListQuery = useQuery({
    queryKey: ['savedSimulationListForCompare'],
    queryFn: () => fetchSavedSimulationList(0, 20),
  })

  const savedItems =
    savedListQuery.data && isApiSuccess(savedListQuery.data)
      ? savedListQuery.data.dataBody.data
      : []
  const firstItem = savedItems.find(item => String(item.id) === firstId) ?? null
  const secondItem =
    savedItems.find(item => String(item.id) === secondId) ?? null

  const firstReportQuery = useQuery({
    queryKey: ['simulationCompareReport', 'first', firstItem?.id ?? null],
    queryFn: () => createSimulationReport(toRequest(firstItem!)),
    enabled: Boolean(firstItem),
  })

  const secondReportQuery = useQuery({
    queryKey: ['simulationCompareReport', 'second', secondItem?.id ?? null],
    queryFn: () => createSimulationReport(toRequest(secondItem!)),
    enabled: Boolean(secondItem),
  })

  return (
    <Page>
      <Hero>
        <Eyebrow>Simulation Compare</Eyebrow>
        <HeroTitle>저장된 창업 시뮬레이션 두 개를 나란히 비교합니다.</HeroTitle>
        <HeroBody>
          레거시 비교 모달을 Next 페이지 구조로 바꿨습니다. 저장된 시뮬레이션을
          고르면 각 입력값으로 다시 리포트를 생성해서 비교합니다.
        </HeroBody>
        <SecondaryLink href={`${basePath}/report`}>
          최근 리포트로 돌아가기
        </SecondaryLink>
      </Hero>

      <Panel>
        <ControlGrid>
          <Select
            value={firstId}
            onChange={event => setFirstId(event.target.value)}
          >
            <option value="">첫 번째 비교 대상을 선택해 주세요</option>
            {savedItems.map(item => (
              <option key={item.id} value={item.id}>
                {toOptionLabel(item)}
              </option>
            ))}
          </Select>
          <Select
            value={secondId}
            onChange={event => setSecondId(event.target.value)}
          >
            <option value="">두 번째 비교 대상을 선택해 주세요</option>
            {savedItems.map(item => (
              <option key={item.id} value={item.id}>
                {toOptionLabel(item)}
              </option>
            ))}
          </Select>
        </ControlGrid>
      </Panel>

      {savedListQuery.isPending ? (
        <Notice>저장된 시뮬레이션 목록을 불러오는 중입니다.</Notice>
      ) : null}

      {savedListQuery.data && !isApiSuccess(savedListQuery.data) ? (
        <Notice $tone="error">
          {getApiMessage(
            savedListQuery.data,
            '저장된 시뮬레이션 목록을 불러오지 못했습니다.',
          )}
        </Notice>
      ) : null}

      {firstId && secondId && firstId === secondId ? (
        <Notice>
          같은 대상을 두 번 선택했습니다. 서로 다른 항목을 골라 주세요.
        </Notice>
      ) : null}

      <CompareGrid>
        <CompareCard>
          <CompareTitle>
            {firstItem?.brandName ?? '첫 번째 비교 대상'}
          </CompareTitle>
          <CompareSubtitle>
            {firstItem
              ? `${firstItem.gugun}, ${firstItem.serviceCodeName}, ${firstItem.storeSize}㎡, ${firstItem.floor}`
              : '왼쪽 비교 대상을 선택해 주세요.'}
          </CompareSubtitle>
          {firstReportQuery.isPending ? (
            <Notice>첫 번째 리포트를 계산하는 중입니다.</Notice>
          ) : null}
          {firstReportQuery.data && !isApiSuccess(firstReportQuery.data) ? (
            <Notice $tone="error">
              {getApiMessage(
                firstReportQuery.data,
                '첫 번째 비교 리포트를 생성하지 못했습니다.',
              )}
            </Notice>
          ) : null}
          {firstReportQuery.data && isApiSuccess(firstReportQuery.data) ? (
            <StatGrid>
              <StatCard>
                <StatLabel>총 창업 비용</StatLabel>
                <StatValue>
                  {formatLargeWon(firstReportQuery.data.dataBody.totalPrice)}
                </StatValue>
              </StatCard>
              <StatCard>
                <StatLabel>권리금</StatLabel>
                <StatValue>
                  {formatLargeWon(
                    firstReportQuery.data.dataBody.keyMoneyInfo.keyMoney,
                  )}
                </StatValue>
              </StatCard>
              <StatCard>
                <StatLabel>주요 성별 / 연령</StatLabel>
                <StatValue>
                  {firstReportQuery.data.dataBody.genderAndAgeAnalysisInfo
                    .femaleSalesPercent >
                  firstReportQuery.data.dataBody.genderAndAgeAnalysisInfo
                    .maleSalesPercent
                    ? '여성'
                    : '남성'}
                  {' · '}
                  {
                    firstReportQuery.data.dataBody.genderAndAgeAnalysisInfo
                      .first.name
                  }
                </StatValue>
              </StatCard>
              <StatCard>
                <StatLabel>성수기 / 비수기</StatLabel>
                <StatValue>
                  {firstReportQuery.data.dataBody.monthAnalysisInfo.peakSeasons.join(
                    ', ',
                  )}
                  월 /{' '}
                  {firstReportQuery.data.dataBody.monthAnalysisInfo.offPeakSeasons.join(
                    ', ',
                  )}
                  월
                </StatValue>
              </StatCard>
            </StatGrid>
          ) : null}
        </CompareCard>

        <CompareCard>
          <CompareTitle>
            {secondItem?.brandName ?? '두 번째 비교 대상'}
          </CompareTitle>
          <CompareSubtitle>
            {secondItem
              ? `${secondItem.gugun}, ${secondItem.serviceCodeName}, ${secondItem.storeSize}㎡, ${secondItem.floor}`
              : '오른쪽 비교 대상을 선택해 주세요.'}
          </CompareSubtitle>
          {secondReportQuery.isPending ? (
            <Notice>두 번째 리포트를 계산하는 중입니다.</Notice>
          ) : null}
          {secondReportQuery.data && !isApiSuccess(secondReportQuery.data) ? (
            <Notice $tone="error">
              {getApiMessage(
                secondReportQuery.data,
                '두 번째 비교 리포트를 생성하지 못했습니다.',
              )}
            </Notice>
          ) : null}
          {secondReportQuery.data && isApiSuccess(secondReportQuery.data) ? (
            <StatGrid>
              <StatCard>
                <StatLabel>총 창업 비용</StatLabel>
                <StatValue>
                  {formatLargeWon(secondReportQuery.data.dataBody.totalPrice)}
                </StatValue>
              </StatCard>
              <StatCard>
                <StatLabel>권리금</StatLabel>
                <StatValue>
                  {formatLargeWon(
                    secondReportQuery.data.dataBody.keyMoneyInfo.keyMoney,
                  )}
                </StatValue>
              </StatCard>
              <StatCard>
                <StatLabel>주요 성별 / 연령</StatLabel>
                <StatValue>
                  {secondReportQuery.data.dataBody.genderAndAgeAnalysisInfo
                    .femaleSalesPercent >
                  secondReportQuery.data.dataBody.genderAndAgeAnalysisInfo
                    .maleSalesPercent
                    ? '여성'
                    : '남성'}
                  {' · '}
                  {
                    secondReportQuery.data.dataBody.genderAndAgeAnalysisInfo
                      .first.name
                  }
                </StatValue>
              </StatCard>
              <StatCard>
                <StatLabel>성수기 / 비수기</StatLabel>
                <StatValue>
                  {secondReportQuery.data.dataBody.monthAnalysisInfo.peakSeasons.join(
                    ', ',
                  )}
                  월 /{' '}
                  {secondReportQuery.data.dataBody.monthAnalysisInfo.offPeakSeasons.join(
                    ', ',
                  )}
                  월
                </StatValue>
              </StatCard>
            </StatGrid>
          ) : null}
        </CompareCard>
      </CompareGrid>
    </Page>
  )
}
