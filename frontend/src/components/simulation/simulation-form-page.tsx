'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import styled from 'styled-components'
import { districts } from '@/data/districts'
import {
  findSimulationCategoryByCode,
  floorOptions,
  simulationCatalog,
  simulationCategories,
} from '@/data/simulation-catalog'
import {
  fetchFranchiseList,
  fetchStoreSize,
} from '@/lib/api/simulation-v1-legacy'
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

const Layout = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
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

const Section = styled.section`
  display: grid;
  gap: 14px;

  & + & {
    margin-top: 24px;
  }
`

const SectionHeader = styled.div`
  display: grid;
  gap: 6px;
`

const StepBadge = styled.span`
  width: fit-content;
  min-height: 28px;
  display: inline-flex;
  align-items: center;
  padding: 0 12px;
  border-radius: 999px;
  background: var(--color-primary-100);
  color: var(--color-primary-700);
  font-size: 12px;
  font-weight: 700;
`

const SectionTitle = styled.h2`
  color: var(--color-text-900);
  font-size: 22px;
  line-height: 1.3;
  letter-spacing: 0;
`

const SectionBody = styled.p`
  color: var(--color-text-500);
  line-height: 1.75;
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

const Input = styled.input`
  width: 100%;
  min-height: 50px;
  padding: 0 16px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-control);
  background: white;
  color: var(--color-text-900);
  font-size: 15px;
`

const ChoiceGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
`

const ChoiceButton = styled.button<{ $selected: boolean; $wide?: boolean }>`
  min-height: 42px;
  padding: 0 16px;
  border: 1px solid
    ${props =>
      props.$selected ? 'var(--color-primary-700)' : 'var(--color-border-200)'};
  border-radius: var(--radius-control);
  background: ${props =>
    props.$selected ? 'var(--color-primary-100)' : 'white'};
  color: ${props =>
    props.$selected ? 'var(--color-primary-700)' : 'var(--color-text-500)'};
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  flex: ${props => (props.$wide ? '1 1 180px' : '0 0 auto')};
`

const SizeGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`

const SizeButton = styled.button<{ $selected: boolean }>`
  display: grid;
  gap: 8px;
  padding: 18px;
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

const SizeLabel = styled.p`
  color: var(--color-text-500);
  font-size: 13px;
`

const SizeValue = styled.p`
  color: var(--color-text-900);
  font-size: 24px;
  font-weight: 700;
  line-height: 1.2;
`

const SizeHelper = styled.p`
  color: var(--color-text-500);
  font-size: 13px;
  line-height: 1.6;
`

const SuggestionList = styled.div`
  display: grid;
  gap: 10px;
`

const SuggestionButton = styled.button`
  width: 100%;
  padding: 14px 16px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-control);
  background: var(--color-surface-muted);
  color: var(--color-text-900);
  text-align: left;
  cursor: pointer;
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

const Helper = styled.p`
  color: var(--color-text-500);
  font-size: 13px;
  line-height: 1.75;
`

const SummaryStack = styled.div`
  display: grid;
  gap: 12px;
`

const SummaryCard = styled.div`
  padding: 18px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
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

const ActionLink = styled(Link)<{ $disabled?: boolean }>`
  min-height: 50px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 18px;
  border-radius: var(--radius-control);
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
  border-radius: var(--radius-control);
  color: var(--color-primary-700);
  font-size: 15px;
  font-weight: 700;
`

type SimulationFormPageProps = {
  reportBasePath: '/analysis/simulation' | '/simulation'
}

export default function SimulationFormPage({
  reportBasePath,
}: SimulationFormPageProps) {
  const searchParams = useSearchParams()
  const selectedDistrict = useSelectPlaceStore(state => state.selectedDistrict)
  const prefilledServiceCode = searchParams.get('serviceCode') ?? ''
  const prefilledServiceName = searchParams.get('serviceCodeName') ?? ''
  const matchedPrefill = findSimulationCategoryByCode(prefilledServiceCode)
  const [districtName, setDistrictName] = useState(
    searchParams.get('gugun') ||
      (selectedDistrict.name !== '자치구' ? selectedDistrict.name : ''),
  )
  const [category, setCategory] = useState(matchedPrefill?.category ?? '')
  const [serviceCode, setServiceCode] = useState(prefilledServiceCode)
  const [serviceCodeName, setServiceCodeName] = useState(
    matchedPrefill?.item.name ?? prefilledServiceName,
  )
  const [isFranchisee, setIsFranchisee] = useState<boolean | null>(null)
  const [brandKeyword, setBrandKeyword] = useState('')
  const [brandName, setBrandName] = useState<string | null>(null)
  const [storeSize, setStoreSize] = useState(0)
  const [floor, setFloor] = useState('')

  const subcategories = category ? simulationCatalog[category] : []

  const storeSizeQuery = useQuery({
    queryKey: ['simulationStoreSize', serviceCode],
    queryFn: () => fetchStoreSize(serviceCode),
    enabled: serviceCode.length > 0,
  })

  const franchiseQuery = useQuery({
    queryKey: ['simulationFranchise', brandKeyword, serviceCode],
    queryFn: () => fetchFranchiseList(brandKeyword, 0, serviceCode),
    enabled:
      isFranchisee === true &&
      brandKeyword.trim().length > 0 &&
      serviceCode.length > 0,
  })

  const storeSizeData =
    storeSizeQuery.data && isApiSuccess(storeSizeQuery.data)
      ? storeSizeQuery.data.dataBody
      : null
  const franchiseList =
    franchiseQuery.data && isApiSuccess(franchiseQuery.data)
      ? franchiseQuery.data.dataBody
      : []

  const isReady =
    Boolean(districtName) &&
    Boolean(category) &&
    Boolean(serviceCode) &&
    Boolean(serviceCodeName) &&
    storeSize > 0 &&
    Boolean(floor) &&
    isFranchisee !== null &&
    (isFranchisee === false || Boolean(brandName || brandKeyword.trim()))

  const reportParams = new URLSearchParams({
    gugun: districtName,
    serviceCode,
    serviceCodeName,
    isFranchisee: isFranchisee === null ? '' : isFranchisee ? 'true' : 'false',
    brandName: isFranchisee ? (brandName ?? brandKeyword.trim()) : '',
    storeSize: String(storeSize),
    floor,
  }).toString()

  return (
    <Page>
      <Hero>
        <Eyebrow>Simulation</Eyebrow>
        <HeroTitle>
          창업 조건을 입력하고 예상 창업 비용 리포트를 받아봅니다.
        </HeroTitle>
        <HeroBody>
          레거시 5단계 입력 흐름을 Next 구조로 다시 구성했습니다. 위치, 업종,
          프랜차이즈 여부, 매장 크기와 층수를 선택하면 리포트 생성 API로 바로
          이어집니다.
        </HeroBody>
      </Hero>

      <Layout>
        <Panel>
          <Section>
            <SectionHeader>
              <StepBadge>Step 1</StepBadge>
              <SectionTitle>창업 위치 선택</SectionTitle>
              <SectionBody>
                시뮬레이션에는 자치구 정보만 필요합니다. 최근 분석에서 고른
                자치구가 있으면 자동으로 채워집니다.
              </SectionBody>
            </SectionHeader>
            <Select
              value={districtName}
              onChange={event => setDistrictName(event.target.value)}
            >
              <option value="">자치구를 선택해 주세요</option>
              {districts.map(district => (
                <option key={district.gooCode} value={district.gooName}>
                  {district.gooName}
                </option>
              ))}
            </Select>
          </Section>

          <Section>
            <SectionHeader>
              <StepBadge>Step 2</StepBadge>
              <SectionTitle>업종 선택</SectionTitle>
              <SectionBody>
                대분류와 세부 업종을 차례로 고릅니다. 분석 결과에서 넘어오면
                세부 업종이 자동으로 맞춰집니다.
              </SectionBody>
            </SectionHeader>
            <ChoiceGrid>
              {simulationCategories.map(item => (
                <ChoiceButton
                  key={item}
                  type="button"
                  $selected={category === item}
                  onClick={() => {
                    setCategory(item)

                    if (
                      serviceCode &&
                      !simulationCatalog[item].some(
                        subcategory => subcategory.code === serviceCode,
                      )
                    ) {
                      setServiceCode('')
                      setServiceCodeName('')
                      setStoreSize(0)
                    }
                  }}
                >
                  {item}
                </ChoiceButton>
              ))}
            </ChoiceGrid>
            {category ? (
              <ChoiceGrid>
                {subcategories.map(item => (
                  <ChoiceButton
                    key={item.code}
                    type="button"
                    $selected={serviceCode === item.code}
                    $wide
                    onClick={() => {
                      setServiceCode(item.code)
                      setServiceCodeName(item.name)
                      setStoreSize(0)
                    }}
                  >
                    {item.name}
                  </ChoiceButton>
                ))}
              </ChoiceGrid>
            ) : null}
          </Section>

          <Section>
            <SectionHeader>
              <StepBadge>Step 3</StepBadge>
              <SectionTitle>프랜차이즈 여부</SectionTitle>
              <SectionBody>
                프랜차이즈 창업이면 브랜드명을 검색해 선택할 수 있습니다.
              </SectionBody>
            </SectionHeader>
            <ChoiceGrid>
              <ChoiceButton
                type="button"
                $selected={isFranchisee === true}
                onClick={() => setIsFranchisee(true)}
              >
                프랜차이즈
              </ChoiceButton>
              <ChoiceButton
                type="button"
                $selected={isFranchisee === false}
                onClick={() => {
                  setIsFranchisee(false)
                  setBrandKeyword('')
                  setBrandName(null)
                }}
              >
                개인 창업
              </ChoiceButton>
            </ChoiceGrid>
            {isFranchisee === true ? (
              <>
                <Input
                  placeholder="브랜드명을 입력해 주세요"
                  value={brandName ?? brandKeyword}
                  onChange={event => {
                    setBrandName(null)
                    setBrandKeyword(event.target.value)
                  }}
                />
                {franchiseQuery.isPending ? (
                  <Notice>프랜차이즈 목록을 불러오는 중입니다.</Notice>
                ) : null}
                {franchiseQuery.data && !isApiSuccess(franchiseQuery.data) ? (
                  <Notice $tone="error">
                    {getApiMessage(
                      franchiseQuery.data,
                      '프랜차이즈 목록을 불러오지 못했습니다.',
                    )}
                  </Notice>
                ) : null}
                {franchiseList.length > 0 ? (
                  <SuggestionList>
                    {franchiseList.map(item => (
                      <SuggestionButton
                        key={item.franchiseeId}
                        type="button"
                        onClick={() => {
                          setBrandName(item.brandName)
                          setBrandKeyword(item.brandName)
                        }}
                      >
                        {item.brandName}
                      </SuggestionButton>
                    ))}
                  </SuggestionList>
                ) : null}
              </>
            ) : null}
          </Section>

          <Section>
            <SectionHeader>
              <StepBadge>Step 4</StepBadge>
              <SectionTitle>매장 크기와 층수</SectionTitle>
              <SectionBody>
                업종별 매장 크기 추천값을 API에서 불러오고, 층수 선택을 함께
                받습니다.
              </SectionBody>
            </SectionHeader>
            {!serviceCode ? (
              <Notice>먼저 세부 업종을 선택해 주세요.</Notice>
            ) : null}
            {storeSizeQuery.isPending ? (
              <Notice>추천 매장 크기를 계산하는 중입니다.</Notice>
            ) : null}
            {storeSizeQuery.data && !isApiSuccess(storeSizeQuery.data) ? (
              <Notice $tone="error">
                {getApiMessage(
                  storeSizeQuery.data,
                  '추천 매장 크기를 불러오지 못했습니다.',
                )}
              </Notice>
            ) : null}
            {storeSizeData ? (
              <SizeGrid>
                {Object.entries(storeSizeData).map(([key, value]) => (
                  <SizeButton
                    key={key}
                    type="button"
                    $selected={storeSize === value.squareMeter}
                    onClick={() => setStoreSize(value.squareMeter)}
                  >
                    <SizeLabel>
                      {key === 'small'
                        ? '소형'
                        : key === 'medium'
                          ? '중형'
                          : '대형'}
                    </SizeLabel>
                    <SizeValue>{value.squareMeter}㎡</SizeValue>
                    <SizeHelper>{value.pyeong}평 기준 추천 면적</SizeHelper>
                  </SizeButton>
                ))}
              </SizeGrid>
            ) : null}
            <ChoiceGrid>
              {floorOptions.map(option => (
                <ChoiceButton
                  key={option}
                  type="button"
                  $selected={floor === option}
                  onClick={() => setFloor(option)}
                >
                  {option}
                </ChoiceButton>
              ))}
            </ChoiceGrid>
          </Section>
        </Panel>

        <Panel>
          <SectionHeader>
            <SectionTitle>입력 요약</SectionTitle>
            <SectionBody>
              조건이 모두 채워지면 바로 리포트 생성으로 이동합니다.
            </SectionBody>
          </SectionHeader>

          <SummaryStack>
            <SummaryCard>
              <SummaryLabel>자치구</SummaryLabel>
              <SummaryValue>{districtName || '선택해 주세요'}</SummaryValue>
            </SummaryCard>
            <SummaryCard>
              <SummaryLabel>업종</SummaryLabel>
              <SummaryValue>{serviceCodeName || '선택해 주세요'}</SummaryValue>
            </SummaryCard>
            <SummaryCard>
              <SummaryLabel>창업 형태</SummaryLabel>
              <SummaryValue>
                {isFranchisee === null
                  ? '선택해 주세요'
                  : isFranchisee
                    ? brandName || brandKeyword || '프랜차이즈'
                    : '개인 창업'}
              </SummaryValue>
            </SummaryCard>
            <SummaryCard>
              <SummaryLabel>매장 조건</SummaryLabel>
              <SummaryValue>
                {storeSize > 0 ? `${storeSize}㎡` : '면적 미선택'}
                {floor ? ` · ${floor}` : ''}
              </SummaryValue>
            </SummaryCard>
          </SummaryStack>

          <ActionLink
            href={isReady ? `${reportBasePath}/report?${reportParams}` : '#'}
            $disabled={!isReady}
          >
            시뮬레이션 리포트 만들기
          </ActionLink>
          <SecondaryLink href="/analysis">상권분석으로 돌아가기</SecondaryLink>

          <Helper>
            리포트 페이지에서는 저장, 비교, 공유를 이어서 진행할 수 있습니다.
          </Helper>
        </Panel>
      </Layout>
    </Page>
  )
}
