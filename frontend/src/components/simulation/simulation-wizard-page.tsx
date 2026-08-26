'use client'

import { useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Calculator } from 'lucide-react'
import styled from 'styled-components'

import SimulationAnalysisContextCard from '@/components/simulation/simulation-analysis-context-card'
import SimulationBrandSearch from '@/components/simulation/simulation-brand-search'
import SimulationChoiceGrid from '@/components/simulation/simulation-choice-grid'
import SimulationErrorNotice from '@/components/simulation/simulation-error-notice'
import SimulationResultPreview from '@/components/simulation/simulation-result-preview'
import SimulationStoreSizeStep from '@/components/simulation/simulation-store-size-step'
import { Button } from '@/components/ui/button'
import { SIMULATION_SERVICE_TYPES } from '@/data/simulation-service-types'
import { resolveApiError } from '@/lib/api/api-error'
import { createSimulationReport } from '@/lib/api/simulation'
import { getResponseBody } from '@/lib/api/response'
import { parseSimulationAnalysisContext } from '@/lib/simulation/analysis-context'
import { useSimulationWizard } from '@/lib/simulation/use-simulation-wizard'
import {
  SIMULATION_DISTRICT_OPTIONS,
  SIMULATION_WIZARD_STEPS,
  SIMULATION_WIZARD_STEP_LABELS,
  getAdjacentSimulationStep,
  isSameSimulationReportRequest,
} from '@/lib/simulation/wizard'
import type { SimulationReportRequest } from '@/types/simulation'

export type SimulationWizardPageProps = {
  /** `analysis`면 상단에 분석 컨텍스트 카드를 sticky로 얹는다. 그 외 동작은 완전히 같다. */
  variant?: 'standalone' | 'analysis'
}

const FRANCHISE_CHOICES = [
  { code: 'true', name: '프랜차이즈', hint: '브랜드 가맹 창업' },
  { code: 'false', name: '개인 창업', hint: '독립 매장' },
] as const

const Page = styled.main`
  min-height: calc(100vh - 160px);
  padding: 48px 20px 64px;
  background: var(--color-background-muted);

  @media (max-width: 640px) {
    padding: 24px 16px 48px;
  }
`

const Container = styled.div`
  width: min(760px, 100%);
  margin: 0 auto;
  display: grid;
  gap: 16px;
`

const Wizard = styled.section`
  display: grid;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  overflow: hidden;
`

const Header = styled.header`
  display: grid;
  gap: 8px;
  border-bottom: 1px solid var(--color-border-200);
  padding: 24px 24px 20px;

  @media (max-width: 640px) {
    padding: 20px 16px 16px;
  }
`

const Eyebrow = styled.p`
  color: var(--color-primary-700);
  font-size: 13px;
  font-weight: 700;
  line-height: 20px;
`

const Title = styled.h1`
  color: var(--color-text-900);
  font-size: 24px;
  font-weight: 750;
  line-height: 34px;
  word-break: keep-all;

  @media (max-width: 640px) {
    font-size: 20px;
    line-height: 30px;
  }
`

const Description = styled.p`
  color: var(--color-text-600);
  font-size: 14px;
  line-height: 22px;
  word-break: keep-all;
`

const StepList = styled.ol`
  display: grid;
  /* 내용과 무관하게 4등분한다. 기본 1fr은 긴 라벨이 트랙을 밀어 폭이 들쭉날쭉해진다. */
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  border-bottom: 1px solid var(--color-border-200);
  padding: 16px 20px;

  @media (max-width: 640px) {
    padding: 12px 16px;
  }
`

const StepButton = styled.button<{ $active: boolean; $completed: boolean }>`
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 60px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  border: 1px solid
    ${props =>
      props.$active ? 'var(--color-primary-600)' : 'var(--color-border-200)'};
  border-radius: var(--radius-control);
  background: ${props =>
    props.$active ? 'var(--color-primary-100)' : 'var(--color-surface)'};
  color: ${props =>
    props.$active
      ? 'var(--color-primary-700)'
      : props.$completed
        ? 'var(--color-text-800)'
        : 'var(--color-text-caption)'};
  padding: 10px 8px;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.35;
  text-align: center;
  word-break: keep-all;
  cursor: pointer;
  transition:
    border-color var(--motion-fast) var(--ease-standard),
    background-color var(--motion-fast) var(--ease-standard),
    color var(--motion-fast) var(--ease-standard);

  &:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }
`

const StepNumber = styled.span`
  font-size: 10px;
  font-weight: 600;
  line-height: 14px;
  opacity: 0.8;
`

const StepName = styled.span`
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const Body = styled.div`
  display: grid;
  gap: 24px;
  padding: 20px 24px 24px;

  @media (max-width: 640px) {
    padding: 16px;
  }
`

const BodyTitle = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;

  h2 {
    color: var(--color-text-900);
    font-size: 17px;
    font-weight: 700;
    line-height: 26px;
  }

  span {
    color: var(--color-text-caption);
    font-size: 12px;
    line-height: 18px;
  }
`

const Section = styled.section`
  display: grid;
  gap: 12px;
`

const Footer = styled.footer`
  display: grid;
  gap: 8px;
  border-top: 1px solid var(--color-border-200);
  padding: 16px 20px max(16px, env(safe-area-inset-bottom));

  @media (max-width: 640px) {
    padding: 12px 16px max(16px, env(safe-area-inset-bottom));
  }
`

const FooterRow = styled.div`
  display: flex;
  gap: 8px;

  button {
    flex: 1;
  }
`

const Helper = styled.p`
  color: var(--color-text-caption);
  font-size: 12px;
  line-height: 18px;
  text-align: center;
`

/**
 * 창업 시뮬레이션 입력 마법사 + 동기 계산.
 *
 * `/simulation`과 `/analysis/simulation`이 같은 컴포넌트를 쓰고, 분석 컨텍스트 카드만 다르다.
 *
 * 계산은 `POST /simulations/reports` **한 번**으로 끝난다 — 폴링·SSE가 없으므로 로딩 표시도 한 번이다.
 * 계산 결과는 캐시할 서버 상태가 아니라 사용자의 조건에 대한 응답이므로 `useMutation`을 쓰고,
 * 무효화(invalidate)할 쿼리도 없다. (이력 저장은 다음 슬라이스이며 그때 이력 목록 무효화가 붙는다.)
 */
export default function SimulationWizardPage({
  variant = 'standalone',
}: SimulationWizardPageProps) {
  const searchParams = useSearchParams()
  const context =
    variant === 'analysis' ? parseSimulationAnalysisContext(searchParams) : null

  const wizard = useSimulationWizard({
    districtCode: context?.districtCode ?? null,
    serviceCode: context?.serviceCode ?? null,
  })

  const reportMutation = useMutation({
    mutationFn: (payload: SimulationReportRequest) =>
      createSimulationReport(payload),
  })

  const error = resolveApiError({
    error: reportMutation.error,
    data: reportMutation.data,
  })
  // 조건을 고치면 앞 결과·오류를 내린다. 남겨두면 바뀐 조건의 결과로 오독된다.
  const isCurrent = isSameSimulationReportRequest(
    reportMutation.variables ?? null,
    wizard.reportRequest,
  )
  const report = getResponseBody(reportMutation.data)

  const resultRef = useRef<HTMLDivElement | null>(null)

  // 계산이 끝나면(성공이든 실패든) 결과 영역으로 데려간다. 의존성은 React Query가 들고 있는
  // 안정된 참조(data/error)여야 한다 — `error`(resolveApiError 결과)는 매 렌더 새 객체라 넣으면 루프가 된다.
  const { data: mutationData, error: mutationError } = reportMutation
  useEffect(() => {
    if (!mutationData && !mutationError) return
    resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [mutationData, mutationError])

  const { state, step } = wizard
  const previousStep = getAdjacentSimulationStep(step, -1)
  const isLastStep = step === 'store'
  const canGoNext = wizard.isStepComplete(step)

  const calculate = () => {
    const request = wizard.reportRequest
    if (!request) return
    reportMutation.mutate(request)
  }

  return (
    <Page>
      <Container>
        {context ? <SimulationAnalysisContextCard context={context} /> : null}

        <Wizard aria-label="창업 시뮬레이션 조건 입력">
          <Header>
            <Eyebrow>창업 시뮬레이션</Eyebrow>
            <Title>창업 조건을 고르면 예상 비용을 계산해 드려요</Title>
            <Description>
              프랜차이즈 여부, 자치구, 업종, 매장 조건 네 가지만 고르면 돼요.
            </Description>
          </Header>

          <StepList aria-label="입력 단계">
            {SIMULATION_WIZARD_STEPS.map((item, index) => {
              const completed = wizard.isStepComplete(item)
              const label = SIMULATION_WIZARD_STEP_LABELS[item]
              return (
                <li key={item}>
                  <StepButton
                    type="button"
                    $active={step === item}
                    $completed={completed}
                    aria-current={step === item ? 'step' : undefined}
                    disabled={!wizard.canOpenStep(item)}
                    title={label}
                    onClick={() => wizard.goToStep(item)}
                  >
                    <StepNumber>{index + 1}단계</StepNumber>
                    <StepName>{label}</StepName>
                  </StepButton>
                </li>
              )
            })}
          </StepList>

          <Body>
            <BodyTitle>
              <h2>{SIMULATION_WIZARD_STEP_LABELS[step]} 선택</h2>
              <span>
                {step === 'district'
                  ? `서울 ${SIMULATION_DISTRICT_OPTIONS.length}개 구`
                  : null}
                {step === 'service'
                  ? `지원 업종 ${SIMULATION_SERVICE_TYPES.length}종`
                  : null}
              </span>
            </BodyTitle>

            {step === 'franchise' ? (
              <SimulationChoiceGrid
                label="창업 형태"
                choices={FRANCHISE_CHOICES}
                selectedCode={
                  state.franchisee === null ? null : String(state.franchisee)
                }
                onSelect={code => wizard.setFranchisee(code === 'true')}
                minColumnWidth={140}
              />
            ) : null}

            {step === 'district' ? (
              <SimulationChoiceGrid
                label="자치구"
                choices={SIMULATION_DISTRICT_OPTIONS}
                selectedCode={state.districtCode}
                onSelect={wizard.setDistrict}
              />
            ) : null}

            {step === 'service' ? (
              <>
                <Section>
                  <SimulationChoiceGrid
                    label="업종"
                    choices={SIMULATION_SERVICE_TYPES}
                    selectedCode={state.serviceCode}
                    onSelect={wizard.setService}
                    minColumnWidth={120}
                  />
                </Section>
                {/* 브랜드 검색은 serviceCode가 확정된 뒤에만 연다 — 없이 호출하면 400이다. */}
                {state.franchisee === true && state.serviceCode ? (
                  // key로 업종별 검색 상태(검색어·누적 페이지)를 갈아끼운다.
                  <SimulationBrandSearch
                    key={state.serviceCode}
                    serviceCode={state.serviceCode}
                    selectedFranchiseeId={state.franchiseeId}
                    onSelect={wizard.setBrand}
                  />
                ) : null}
              </>
            ) : null}

            {step === 'store' && state.serviceCode ? (
              <SimulationStoreSizeStep
                serviceCode={state.serviceCode}
                storeSize={state.storeSize}
                floorType={state.floorType}
                onStoreSizeChange={wizard.setStoreSize}
                onFloorTypeChange={wizard.setFloorType}
              />
            ) : null}
          </Body>

          <Footer>
            <FooterRow>
              {previousStep ? (
                <Button
                  size="large"
                  variant="secondary"
                  leftIcon={<ChevronLeft />}
                  onClick={wizard.goPrevious}
                >
                  이전
                </Button>
              ) : null}
              {isLastStep ? (
                <Button
                  size="large"
                  leftIcon={<Calculator />}
                  disabled={!wizard.isComplete}
                  isLoading={reportMutation.isPending}
                  loadingLabel="계산 중"
                  onClick={calculate}
                >
                  계산하기
                </Button>
              ) : (
                <Button
                  size="large"
                  rightIcon={<ChevronRight />}
                  disabled={!canGoNext}
                  onClick={wizard.goNext}
                >
                  다음
                </Button>
              )}
            </FooterRow>
            <Helper>
              {wizard.gap ?? '선택한 조건으로 예상 창업 비용을 계산해요'}
            </Helper>
          </Footer>
        </Wizard>

        <div ref={resultRef}>
          {isCurrent && error ? (
            <SimulationErrorNotice
              error={error}
              onRetry={calculate}
              onReselect={target => {
                reportMutation.reset()
                wizard.goToStep(target)
              }}
            />
          ) : null}
          {isCurrent && !error && report ? (
            <SimulationResultPreview report={report} />
          ) : null}
        </div>
      </Container>
    </Page>
  )
}
