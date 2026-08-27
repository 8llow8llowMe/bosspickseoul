'use client'

import { useCallback, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Lock, Search } from 'lucide-react'
import styled from 'styled-components'

import SimulationAnalysisContextCard from '@/components/simulation/simulation-analysis-context-card'
import SimulationBrandSearch from '@/components/simulation/simulation-brand-search'
import SimulationChoiceGrid from '@/components/simulation/simulation-choice-grid'
import SimulationConditionSectionCard from '@/components/simulation/simulation-condition-section'
import SimulationResultPanel from '@/components/simulation/simulation-result-panel'
import SimulationStoreConditionFields from '@/components/simulation/simulation-store-condition-fields'
import SimulationSummaryBar from '@/components/simulation/simulation-summary-bar'
import { TextField } from '@/components/ui/text-field'
import { SIMULATION_SERVICE_TYPES } from '@/data/simulation-service-types'
import { resolveApiError } from '@/lib/api/api-error'
import { createSimulationReport } from '@/lib/api/simulation'
import { getResponseBody } from '@/lib/api/response'
import {
  isSimulationContextApplied,
  parseSimulationAnalysisContext,
} from '@/lib/simulation/analysis-context'
import { useSimulationConditions } from '@/lib/simulation/use-simulation-conditions'
import {
  SIMULATION_CONDITION_SECTION_LABELS,
  SIMULATION_DISTRICT_OPTIONS,
  isSameSimulationReportRequest,
  simulationSectionDomId,
  type SimulationConditionSection,
} from '@/lib/simulation/conditions'
import { simulationReportQueryKey } from '@/lib/simulation/report-query'
import {
  buildSimulationReportHref,
  parseSimulationConditionState,
} from '@/lib/simulation/report-route'
import type { SimulationReportRequest } from '@/types/simulation'

export type SimulationBuilderPageProps = {
  /** `analysis`면 상단에 분석 컨텍스트 카드를 얹는다. 그 외 동작은 완전히 같다. */
  variant?: 'standalone' | 'analysis'
}

const FRANCHISE_CHOICES = [
  { code: 'true', name: '프랜차이즈', hint: '브랜드 가맹 창업' },
  { code: 'false', name: '개인 창업', hint: '독립 매장' },
] as const

const Page = styled.main`
  min-height: calc(100vh - 160px);
  padding: 32px 0 64px;
  background: var(--color-background-muted);

  /* 모바일·태블릿은 하단 고정 요약 바에 가리지 않게 여백을 더 준다. */
  @media (max-width: 1023px) {
    padding: 24px 0 96px;
  }
`

const Container = styled.div`
  width: min(1320px, calc(100% - 40px));
  margin: 0 auto;
  display: grid;
  gap: 16px;

  @media (max-width: 640px) {
    width: calc(100% - 32px);
  }
`

/* 3층 문구(eyebrow+H1+설명)를 한 줄로 눌렀다. 매 화면 같은 문구가 상단을 다 먹지 않게. */
const Head = styled.header`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 12px;

  h1 {
    color: var(--color-text-900);
    font-size: 22px;
    font-weight: 700;
    line-height: 32px;
    word-break: keep-all;
  }

  p {
    color: var(--color-text-600);
    font-size: 14px;
    line-height: 22px;
    word-break: keep-all;
  }
`

/**
 * 입력 · 결과 2단.
 *
 * 단일 화면이라 세로로 쌓을 이유가 없다 — 오른쪽 컬럼이 sticky로 붙어 있으면 조건을 고치는
 * 동안에도 남은 조건과 금액이 항상 보인다. 1023px 이하에서는 1단으로 접고 하단 요약 바가
 * 그 역할을 대신한다.
 */
const Layout = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 380px;
  align-items: start;
  gap: 20px;

  @media (max-width: 1279px) {
    grid-template-columns: minmax(0, 1fr) 340px;
  }

  @media (max-width: 1023px) {
    grid-template-columns: minmax(0, 1fr);
    gap: 16px;
  }
`

const Form = styled.div`
  min-width: 0;
  display: grid;
  gap: 16px;
`

/* top: 96px는 sticky 사이트 헤더(65px) 아래 여백까지 확보한 값이다 — 분석 결과 화면과 같은 값. */
const ResultColumn = styled.div`
  min-width: 0;
  display: grid;
  gap: 16px;

  @media (min-width: 1024px) {
    position: sticky;
    top: 96px;
  }
`

const ServiceBlock = styled.div`
  display: grid;
  gap: 24px;
`

const LockedBlock = styled.div`
  display: grid;
  gap: 12px;

  h3 {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--color-text-800);
    font-size: 16px;
    font-weight: 700;
    line-height: 24px;
  }

  svg {
    width: 16px;
    height: 16px;
    flex: 0 0 auto;
    color: var(--color-text-caption);
    stroke: currentColor;
  }

  p {
    color: var(--color-text-600);
    font-size: 13px;
    line-height: 20px;
    word-break: keep-all;
  }
`

/**
 * 창업 시뮬레이션 조건 입력 + 동기 계산 — **단일 화면 2단**.
 *
 * `/simulation`과 `/analysis/simulation`이 같은 컴포넌트를 쓰고, 분석 컨텍스트 카드만 다르다.
 *
 * 마법사(4단계)를 걷어낸 이유: 조건 사이의 의존성이 **업종 → 브랜드 하나뿐**이라 단계로 쪼갤
 * 값이 없었고, 대신 "뒤 단계에서 앞 단계로 되돌아가기"라는 비용만 남았다. 그 하나뿐인 순서는
 * **업종을 고르기 전 브랜드 검색을 비활성화**해서 지킨다(`franchisees`가 `serviceCode` 필수).
 *
 * 계산은 `POST /simulations/reports` **한 번**으로 끝난다 — 폴링·SSE가 없으므로 로딩 표시도 한 번이다.
 * 계산 결과는 캐시할 서버 상태가 아니라 사용자의 조건에 대한 응답이므로 `useMutation`을 쓰고,
 * 무효화(invalidate)할 쿼리도 없다. (이력 저장은 다음 슬라이스이며 그때 이력 목록 무효화가 붙는다.)
 */
export default function SimulationBuilderPage({
  variant = 'standalone',
}: SimulationBuilderPageProps) {
  const searchParams = useSearchParams()
  const context =
    variant === 'analysis' ? parseSimulationAnalysisContext(searchParams) : null

  // 리포트에서 되돌아왔다면 쿼리스트링에 조건이 실려 있다. 그걸 초기값으로 삼고,
  // 분석 컨텍스트는 **비어 있는 칸만** 메운다 — 조건이 실려 있는데 컨텍스트가 덮으면
  // 사용자가 방금 바꾼 값이 되돌아온 자리에서 다시 뒤집힌다.
  // (컨텍스트의 레거시 `gugun`(구 이름)은 조건 코덱이 모르므로 이 합성이 여전히 필요하다.)
  const restored = parseSimulationConditionState(searchParams)

  const conditions = useSimulationConditions({
    ...restored,
    districtCode: restored.districtCode ?? context?.districtCode ?? null,
    serviceCode: restored.serviceCode ?? context?.serviceCode ?? null,
  })

  const queryClient = useQueryClient()

  const reportMutation = useMutation({
    mutationFn: (payload: SimulationReportRequest) =>
      createSimulationReport(payload),
    // 리포트 화면이 같은 조건으로 다시 POST 하지 않게 캐시를 미리 채운다.
    onSuccess: (data, payload) => {
      queryClient.setQueryData(simulationReportQueryKey(payload), data)
    },
  })

  const error = resolveApiError({
    error: reportMutation.error,
    data: reportMutation.data,
  })
  // 조건을 고치면 앞 결과·오류를 내린다. 남겨두면 바뀐 조건의 결과로 오독된다.
  const isCurrent = isSameSimulationReportRequest(
    reportMutation.variables ?? null,
    conditions.reportRequest,
  )
  const report = getResponseBody(reportMutation.data)
  const currentError = isCurrent ? error : null
  const currentReport = isCurrent && !error ? report : null
  const reportHref =
    currentReport && reportMutation.variables
      ? buildSimulationReportHref(
          reportMutation.variables,
          variant,
          // 브랜드명은 요청 본문에 없다. 리포트에서 되돌아올 때 복원하려면 URL 이 들고 있어야 한다.
          conditions.state.brandName,
        )
      : null

  const resultRef = useRef<HTMLDivElement | null>(null)

  const calculate = useCallback(() => {
    const request = conditions.reportRequest
    if (!request) return
    reportMutation.mutate(request)
  }, [conditions.reportRequest, reportMutation])

  const scrollToResult = useCallback(() => {
    resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  /** 오류가 지목한 조건 섹션으로 데려간다. 앞 오류를 내리고 나서 이동한다. */
  const reselectSection = useCallback(
    (section: SimulationConditionSection) => {
      reportMutation.reset()
      document
        .getElementById(simulationSectionDomId(section))
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    },
    [reportMutation],
  )

  // 계산이 끝나면(성공이든 실패든) 결과가 화면 밖에 있는 좁은 화면에서만 결과로 데려간다.
  // 데스크탑은 결과 패널이 sticky로 이미 보이므로 스크롤을 건드리면 오히려 시야가 튄다.
  // 의존성은 React Query가 들고 있는 안정된 참조(data/error)여야 한다 — `error`(resolveApiError
  // 결과)는 매 렌더 새 객체라 넣으면 루프가 된다.
  const { data: mutationData, error: mutationError } = reportMutation
  useEffect(() => {
    if (!mutationData && !mutationError) return
    if (!window.matchMedia('(max-width: 1023px)').matches) return
    resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [mutationData, mutationError])

  const { state } = conditions
  const contextApplied = context
    ? isSimulationContextApplied(context, state)
    : true

  const restoreContext = useCallback(() => {
    if (!context) return
    conditions.restoreDistrictAndService({
      districtCode: context.districtCode,
      serviceCode: context.serviceCode,
    })
  }, [context, conditions])

  return (
    <Page>
      <Container>
        <Head>
          <h1>창업 시뮬레이션</h1>
          <p>조건 4개를 고르면 예상 창업 비용을 계산해 드려요</p>
        </Head>

        {context ? (
          <SimulationAnalysisContextCard
            context={context}
            applied={contextApplied}
            onRestore={restoreContext}
          />
        ) : null}

        <Layout>
          <Form>
            <SimulationConditionSectionCard
              id={simulationSectionDomId('franchise')}
              index={1}
              title={SIMULATION_CONDITION_SECTION_LABELS.franchise}
              description="프랜차이즈면 브랜드 가맹 부담금까지 반영해요."
              complete={conditions.isSectionComplete('franchise')}
            >
              <SimulationChoiceGrid
                label="창업 형태"
                choices={FRANCHISE_CHOICES}
                selectedCode={
                  state.franchisee === null ? null : String(state.franchisee)
                }
                onSelect={code => conditions.setFranchisee(code === 'true')}
                minColumnWidth={200}
              />
            </SimulationConditionSectionCard>

            <SimulationConditionSectionCard
              id={simulationSectionDomId('district')}
              index={2}
              title={SIMULATION_CONDITION_SECTION_LABELS.district}
              description="자치구별 임대료 기준으로 계산해요."
              meta={`서울 ${SIMULATION_DISTRICT_OPTIONS.length}개 구`}
              complete={conditions.isSectionComplete('district')}
            >
              <SimulationChoiceGrid
                label="자치구"
                choices={SIMULATION_DISTRICT_OPTIONS}
                selectedCode={state.districtCode}
                onSelect={conditions.setDistrict}
                /* 96px는 375px에서 3열을 유지하는 상한이다(카드 내부 폭 311px).
                   104로 올리면 모바일이 2열로 떨어져 25칩이 13줄이 된다. */
                minColumnWidth={96}
              />
            </SimulationConditionSectionCard>

            <SimulationConditionSectionCard
              id={simulationSectionDomId('service')}
              index={3}
              title={SIMULATION_CONDITION_SECTION_LABELS.service}
              description="업종을 고르면 매장 크기 기준과 브랜드 검색이 열려요."
              meta={`지원 업종 ${SIMULATION_SERVICE_TYPES.length}종`}
              complete={conditions.isSectionComplete('service')}
            >
              <ServiceBlock>
                <SimulationChoiceGrid
                  label="업종"
                  choices={SIMULATION_SERVICE_TYPES}
                  selectedCode={state.serviceCode}
                  onSelect={conditions.setService}
                  minColumnWidth={132}
                />

                {/* 브랜드 검색은 serviceCode가 확정된 뒤에만 연다 — 없이 호출하면 400이다.
                    감추지 않고 **비활성 상태로 보여주는** 이유: 단계 인디케이터가 없어졌으니
                    "업종이 먼저"라는 순서를 이 자리에서 드러내야 한다. */}
                {state.franchisee === true ? (
                  state.serviceCode ? (
                    // key로 업종별 검색 상태(검색어·누적 페이지)를 갈아끼운다.
                    <SimulationBrandSearch
                      key={state.serviceCode}
                      serviceCode={state.serviceCode}
                      selectedFranchiseeId={state.franchiseeId}
                      onSelect={conditions.setBrand}
                    />
                  ) : (
                    <LockedBlock>
                      <h3>
                        <Lock aria-hidden="true" />
                        브랜드 선택
                      </h3>
                      <p>
                        업종을 먼저 고르면 그 업종의 브랜드를 검색할 수 있어요.
                      </p>
                      <TextField
                        fullWidth
                        emphasized
                        disabled
                        readOnly
                        label="브랜드 검색"
                        placeholder="업종을 먼저 선택해 주세요"
                        value=""
                        leftSlot={<Search aria-hidden="true" />}
                      />
                    </LockedBlock>
                  )
                ) : null}
              </ServiceBlock>
            </SimulationConditionSectionCard>

            <SimulationConditionSectionCard
              id={simulationSectionDomId('store')}
              index={4}
              title={SIMULATION_CONDITION_SECTION_LABELS.store}
              description="매장 크기와 층 구분에 따라 임대료·인테리어 기준이 달라져요."
              complete={conditions.isSectionComplete('store')}
            >
              {state.serviceCode ? (
                <SimulationStoreConditionFields
                  serviceCode={state.serviceCode}
                  storeSize={state.storeSize}
                  floorType={state.floorType}
                  onStoreSizeChange={conditions.setStoreSize}
                  onFloorTypeChange={conditions.setFloorType}
                />
              ) : (
                <LockedBlock>
                  <p>
                    업종을 먼저 고르면 그 업종의 평균 면적을 기준으로 크기를
                    추천해 드려요.
                  </p>
                </LockedBlock>
              )}
            </SimulationConditionSectionCard>
          </Form>

          <ResultColumn ref={resultRef}>
            <SimulationResultPanel
              state={state}
              gap={conditions.gap}
              report={currentReport}
              reportHref={reportHref}
              error={currentError}
              isPending={reportMutation.isPending}
              onCalculate={calculate}
              onReselect={reselectSection}
            />
          </ResultColumn>
        </Layout>
      </Container>

      <SimulationSummaryBar
        totalPrice={currentReport?.totalPrice ?? null}
        reportHref={reportHref}
        gap={conditions.gap}
        isPending={reportMutation.isPending}
        onCalculate={calculate}
        onViewResult={scrollToResult}
      />
    </Page>
  )
}
