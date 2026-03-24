'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import styled from 'styled-components'
import LocationSelector from '@/components/location/location-selector'
import { fetchServiceData } from '@/lib/api/analysis'
import { getApiMessage, isApiSuccess } from '@/lib/api/response'
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
  border: 1px solid rgba(21, 73, 181, 0.12);
  border-radius: 28px;
  background:
    radial-gradient(
      circle at top left,
      rgba(51, 109, 211, 0.16),
      transparent 34%
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

const HeroTitle = styled.h1`
  color: var(--color-text-900);
  font-size: clamp(34px, 5vw, 46px);
  line-height: 1.1;
  letter-spacing: -0.04em;
`

const HeroBody = styled.p`
  max-width: 760px;
  color: var(--color-text-500);
  line-height: 1.8;
`

const Layout = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 24px;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`

const Panel = styled.section`
  padding: 24px;
  border: 1px solid var(--color-border-200);
  border-radius: 24px;
  background: white;
  box-shadow: 0 10px 30px rgba(21, 73, 181, 0.08);
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
  letter-spacing: -0.03em;
`

const PanelDescription = styled.p`
  color: var(--color-text-500);
  line-height: 1.75;
`

const Section = styled.div`
  display: grid;
  gap: 14px;
`

const SectionTitle = styled.h3`
  color: var(--color-text-900);
  font-size: 18px;
  line-height: 1.3;
`

const ChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
`

const ChipButton = styled.button<{ $selected: boolean }>`
  min-height: 42px;
  padding: 0 16px;
  border: 1px solid
    ${props =>
      props.$selected ? 'rgba(21, 73, 181, 0.24)' : 'var(--color-border-200)'};
  border-radius: 999px;
  background: ${props =>
    props.$selected ? 'rgba(21, 73, 181, 0.08)' : 'white'};
  color: ${props =>
    props.$selected ? 'var(--color-primary-700)' : 'var(--color-text-500)'};
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
`

const Select = styled.select`
  width: 100%;
  min-height: 50px;
  padding: 0 16px;
  border: 1px solid var(--color-border-200);
  border-radius: 16px;
  background: white;
  color: var(--color-text-900);
  font-size: 15px;
`

const Notice = styled.div<{ $tone?: 'error' | 'info' }>`
  padding: 16px 18px;
  border-radius: 18px;
  background: ${props =>
    props.$tone === 'error'
      ? 'rgba(209, 67, 67, 0.08)'
      : 'rgba(51, 109, 211, 0.08)'};
  color: ${props =>
    props.$tone === 'error'
      ? 'var(--color-danger)'
      : 'var(--color-primary-700)'};
  line-height: 1.75;
`

const SummaryGrid = styled.div`
  display: grid;
  gap: 12px;
`

const SummaryCard = styled.div`
  padding: 18px;
  border: 1px solid var(--color-border-200);
  border-radius: 20px;
  background: var(--color-surface-muted);
`

const SummaryLabel = styled.p`
  color: var(--color-text-500);
  font-size: 13px;
`

const SummaryValue = styled.p`
  margin-top: 6px;
  color: var(--color-text-900);
  font-size: 18px;
  font-weight: 700;
  line-height: 1.4;
`

const ActionRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 12px;
`

const PrimaryLink = styled(Link)<{ $disabled?: boolean }>`
  min-height: 50px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 18px;
  border-radius: 14px;
  background: ${props =>
    props.$disabled ? 'rgba(169, 181, 203, 1)' : 'var(--color-primary-700)'};
  color: white;
  font-size: 15px;
  font-weight: 700;
  pointer-events: ${props => (props.$disabled ? 'none' : 'auto')};
`

const SecondaryLink = styled(Link)`
  min-height: 50px;
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

const Helper = styled.p`
  color: var(--color-text-500);
  font-size: 13px;
  line-height: 1.75;
`

const Placeholder = styled.div`
  padding: 18px;
  border: 1px dashed var(--color-border-300);
  border-radius: 20px;
  color: var(--color-text-500);
  line-height: 1.75;
`

export default function AnalysisPage() {
  const selectedDistrict = useSelectPlaceStore(state => state.selectedDistrict)
  const selectedAdministration = useSelectPlaceStore(
    state => state.selectedAdministration,
  )
  const selectedCommercial = useSelectPlaceStore(
    state => state.selectedCommercial,
  )
  const [selectedServiceType, setSelectedServiceType] = useState('')
  const [selectedServiceCode, setSelectedServiceCode] = useState('')

  const serviceQuery = useQuery({
    queryKey: ['analysisServiceData', selectedCommercial.code],
    queryFn: () => fetchServiceData(String(selectedCommercial.code)),
    enabled: selectedCommercial.code !== 0,
  })

  const services =
    serviceQuery.data && isApiSuccess(serviceQuery.data)
      ? serviceQuery.data.dataBody
      : []
  const serviceTypes = Array.from(
    new Set(services.map(item => item.serviceType)),
  )
  const resolvedServiceType = serviceTypes.includes(selectedServiceType)
    ? selectedServiceType
    : (serviceTypes[0] ?? '')
  const filteredServices = resolvedServiceType
    ? services.filter(item => item.serviceType === resolvedServiceType)
    : services
  const resolvedServiceCode = filteredServices.some(
    item => item.serviceCode === selectedServiceCode,
  )
    ? selectedServiceCode
    : ''
  const selectedService =
    filteredServices.find(item => item.serviceCode === resolvedServiceCode) ??
    null

  const isReady =
    selectedDistrict.code !== 0 &&
    selectedAdministration.code !== 0 &&
    selectedCommercial.code !== 0 &&
    Boolean(selectedService)

  const resultParams = new URLSearchParams({
    districtCode: String(selectedDistrict.code),
    districtName: selectedDistrict.name,
    administrationCode: String(selectedAdministration.code),
    administrationName: selectedAdministration.name,
    commercialCode: String(selectedCommercial.code),
    commercialName: selectedCommercial.name,
    serviceCode: selectedService?.serviceCode ?? '',
    serviceName: selectedService?.serviceCodeName ?? '',
    serviceType: selectedService?.serviceType ?? '',
    periodCode: '20233',
  }).toString()

  const simulationParams = new URLSearchParams({
    gugun: selectedDistrict.name !== '자치구' ? selectedDistrict.name : '',
    serviceCode: selectedService?.serviceCode ?? '',
    serviceCodeName: selectedService?.serviceCodeName ?? '',
  }).toString()

  return (
    <Page>
      <Hero>
        <Eyebrow>Analysis</Eyebrow>
        <HeroTitle>상권, 업종, 분기 기준으로 서울 상권을 분석합니다.</HeroTitle>
        <HeroBody>
          레거시 `analysis` 흐름의 핵심인 위치 선택, 업종 선택, 결과 진입을 Next
          구조로 이관했습니다. 결과 화면은 query param 기반이라 새로고침과 직접
          공유에도 안정적으로 대응합니다.
        </HeroBody>
      </Hero>

      <Layout>
        <Panel>
          <PanelHeader>
            <PanelTitle>분석 조건 선택</PanelTitle>
            <PanelDescription>
              먼저 자치구, 행정동, 상권을 고른 뒤 업종을 선택하면 결과 화면으로
              이동할 수 있습니다.
            </PanelDescription>
          </PanelHeader>

          <Section>
            <SectionTitle>1. 위치 선택</SectionTitle>
            <LocationSelector
              title="분석할 상권 위치를 선택해 주세요"
              description="자치구, 행정동, 상권을 순서대로 고르면 분석 가능한 업종을 불러옵니다."
              showCommercial
            />
          </Section>

          <Section>
            <SectionTitle>2. 업종 선택</SectionTitle>

            {selectedCommercial.code === 0 ? (
              <Placeholder>
                위치 선택이 끝나면 해당 상권에서 분석 가능한 업종 목록이
                표시됩니다.
              </Placeholder>
            ) : null}

            {serviceQuery.isPending ? (
              <Notice>분석 가능한 업종 목록을 불러오는 중입니다.</Notice>
            ) : null}

            {serviceQuery.data && !isApiSuccess(serviceQuery.data) ? (
              <Notice $tone="error">
                {getApiMessage(
                  serviceQuery.data,
                  '업종 목록을 불러오지 못했습니다.',
                )}
              </Notice>
            ) : null}

            {services.length > 0 ? (
              <>
                <ChipRow>
                  {serviceTypes.map(type => (
                    <ChipButton
                      key={type}
                      type="button"
                      $selected={resolvedServiceType === type}
                      onClick={() => {
                        setSelectedServiceType(type)
                        setSelectedServiceCode('')
                      }}
                    >
                      {type}
                    </ChipButton>
                  ))}
                </ChipRow>
                <Select
                  value={resolvedServiceCode}
                  onChange={event => setSelectedServiceCode(event.target.value)}
                >
                  <option value="">업종을 선택해 주세요</option>
                  {filteredServices.map(service => (
                    <option
                      key={service.serviceCode}
                      value={service.serviceCode}
                    >
                      {service.serviceCodeName}
                    </option>
                  ))}
                </Select>
                <Helper>
                  레거시와 동일하게 상권별로 제공되는 업종 목록만 노출합니다.
                </Helper>
              </>
            ) : null}
          </Section>
        </Panel>

        <Panel>
          <PanelHeader>
            <PanelTitle>현재 선택 요약</PanelTitle>
            <PanelDescription>
              선택이 완료되면 분석 결과 또는 시뮬레이션으로 바로 이어집니다.
            </PanelDescription>
          </PanelHeader>

          <SummaryGrid>
            <SummaryCard>
              <SummaryLabel>자치구</SummaryLabel>
              <SummaryValue>{selectedDistrict.name}</SummaryValue>
            </SummaryCard>
            <SummaryCard>
              <SummaryLabel>행정동</SummaryLabel>
              <SummaryValue>{selectedAdministration.name}</SummaryValue>
            </SummaryCard>
            <SummaryCard>
              <SummaryLabel>상권</SummaryLabel>
              <SummaryValue>{selectedCommercial.name}</SummaryValue>
            </SummaryCard>
            <SummaryCard>
              <SummaryLabel>업종</SummaryLabel>
              <SummaryValue>
                {selectedService?.serviceCodeName ?? '업종을 선택해 주세요'}
              </SummaryValue>
            </SummaryCard>
          </SummaryGrid>

          <ActionRow>
            <PrimaryLink
              href={isReady ? `/analysis/result?${resultParams}` : '#'}
              $disabled={!isReady}
            >
              상권분석 결과 보기
            </PrimaryLink>
            <SecondaryLink href={`/analysis/simulation?${simulationParams}`}>
              시뮬레이션 이어가기
            </SecondaryLink>
          </ActionRow>

          <Helper>
            결과 화면에서는 분기 변경, 북마크 저장, 시뮬레이션 진입까지 이어서
            진행할 수 있습니다.
          </Helper>
        </Panel>
      </Layout>
    </Page>
  )
}
