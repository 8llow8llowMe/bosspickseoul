'use client'

import { Calculator, Check } from 'lucide-react'
import styled from 'styled-components'

import SimulationErrorNotice from '@/components/simulation/simulation-error-notice'
import SimulationResultPreview from '@/components/simulation/simulation-result-preview'
import { Button } from '@/components/ui/button'
import type { NormalizedApiError } from '@/lib/api/api-error'
import {
  SIMULATION_CONDITION_SECTION_LABELS,
  describeSimulationSectionValue,
  isSimulationSectionComplete,
  listSimulationConditionSections,
  type SimulationConditionSection,
  type SimulationConditionState,
} from '@/lib/simulation/conditions'
import type { SimulationReport } from '@/types/simulation'
import { SIMULATION_MEDIA } from '@/components/simulation/simulation-media'

export type SimulationResultPanelProps = {
  state: SimulationConditionState
  /** 완료되지 않았을 때 "무엇이 남았는지" 한 줄. 완료면 null. */
  gap: string | null
  /** 진행도. total 은 지금 화면에 놓인 섹션 수(개인 4 · 프랜차이즈 5). */
  progress: { done: number; total: number }
  report: SimulationReport | null
  /** 상세 리포트 경로. `report`가 있어도 조건이 URL로 못 옮겨지면 null일 수 있다. */
  reportHref: string | null
  error: NormalizedApiError | null
  isPending: boolean
  onCalculate: () => void
  /** 오류가 지목한 조건 섹션으로 데려간다. */
  onReselect: (section: SimulationConditionSection) => void
}

const Root = styled.section`
  display: grid;
  gap: 16px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  padding: 24px;
  box-shadow: var(--shadow-level-2);

  @media ${SIMULATION_MEDIA.mobile} {
    padding: 20px;
  }
`

const Intro = styled.div`
  display: grid;
  gap: 4px;

  h2 {
    color: var(--color-text-900);
    font-size: 17px;
    font-weight: 700;
    line-height: 26px;
    word-break: keep-all;
  }

  p {
    color: var(--color-text-600);
    font-size: 13px;
    line-height: 20px;
    word-break: keep-all;
  }
`

const Checklist = styled.ul`
  display: grid;
  gap: 4px;
`

const ChecklistRow = styled.li<{ $complete: boolean }>`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  border-radius: var(--radius-control);
  background: ${props =>
    props.$complete ? 'var(--color-surface-muted)' : 'transparent'};
  padding: 8px 12px;
`

const RowLabel = styled.span`
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--color-text-600);
  font-size: 13px;
  line-height: 20px;

  svg {
    width: 14px;
    height: 14px;
    flex: 0 0 auto;
    color: var(--color-primary-700);
    stroke: currentColor;
  }
`

const RowValue = styled.span<{ $complete: boolean }>`
  min-width: 0;
  color: ${props =>
    props.$complete ? 'var(--color-text-900)' : 'var(--color-text-caption)'};
  font-size: 13px;
  font-weight: ${props => (props.$complete ? 600 : 400)};
  line-height: 20px;
  text-align: right;
  word-break: keep-all;
`

/*
  「3/5」는 화면에서는 짧고 분명하지만 낭독기가 날짜(3월 5일)나 분수로 읽을 수 있다.
  보이는 숫자는 aria-hidden 으로 두고 낭독용 문장을 따로 준다.
*/
const VisuallyHidden = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
`

const Cta = styled.div`
  display: grid;
  gap: 8px;

  button {
    width: 100%;
  }
`

const Helper = styled.p`
  color: var(--color-text-caption);
  font-size: 12px;
  line-height: 18px;
  text-align: center;
  word-break: keep-all;
`

/**
 * 무엇을 더해 계산하는지 한 줄. 개인 창업에 「가맹 부담금」을 적으면 자기와 상관없는 비용이
 * 들어가는 것처럼 읽힌다. 창업 형태를 고르기 전에는 둘 다 걸치는 문구를 쓴다.
 */
const describeCostScope = (franchisee: boolean | null): string => {
  if (franchisee === true) {
    return '임대료·보증금·인테리어·가맹 부담금을 합한 초기 비용을 계산해요.'
  }
  if (franchisee === false) {
    return '임대료·보증금·인테리어를 합한 초기 비용을 계산해요.'
  }
  return '임대료·보증금·인테리어(프랜차이즈면 가맹 부담금까지)를 합한 초기 비용을 계산해요.'
}

/**
 * 결과 패널 — 데스크탑에서는 오른쪽 컬럼에 sticky로 붙는다. 1023px 이하에서는 계산 전에는
 * 숨고(하단 고정 바가 맡는다) 결과·오류가 생기면 입력 아래에 나온다.
 *
 * **계산 전에도 비워 두지 않는다.** 계산 전에는 "무엇을 계산하는지"와 놓인 조건(개인 4 · 프랜차이즈 5)의 현재 값·남은 값을
 * 보여준다. 그래야 넓은 화면에서 오른쪽 절반이 항상 의미를 갖고, 사용자가 입력 섹션을
 * 거슬러 올라가지 않고도 자기가 무엇을 골랐는지 확인할 수 있다.
 *
 * 네트워크를 모르는 **순수 표시 컴포넌트**다 — 계산 실행·오류 분류는 호출부가 넘긴다.
 * (그래서 renderToStaticMarkup으로 상태별 문구를 그대로 검증할 수 있다.)
 */
export default function SimulationResultPanel({
  state,
  gap,
  progress,
  report,
  reportHref,
  error,
  isPending,
  onCalculate,
  onReselect,
}: SimulationResultPanelProps) {
  // 결과가 있으면 결과만 보여준다. 조건을 고치면 호출부가 결과를 내리고 다시 이 패널로 돌아온다.
  // reportHref 가 없으면(조건이 URL로 못 옮겨진 경우) 결과 자체가 없는 것으로 취급한다 —
  // "상세 리포트 보기" 링크 없이 결과만 보여주면 사용자가 다음 화면으로 갈 수 없다.
  if (report && reportHref) {
    return (
      <Root aria-label="시뮬레이션 계산 결과">
        <SimulationResultPreview report={report} reportHref={reportHref} />
      </Root>
    )
  }

  return (
    <Root aria-label="시뮬레이션 계산 준비">
      <Intro>
        <h2>예상 총 창업 비용</h2>
        <p>{describeCostScope(state.franchisee)}</p>
      </Intro>

      <Checklist
        aria-label={`선택한 조건, ${progress.total}단계 중 ${progress.done}단계 완료`}
      >
        {listSimulationConditionSections(state).map(section => {
          const complete = isSimulationSectionComplete(state, section)
          const value = describeSimulationSectionValue(state, section)
          return (
            <ChecklistRow key={section} $complete={complete}>
              <RowLabel>
                {complete ? <Check aria-hidden="true" /> : null}
                {SIMULATION_CONDITION_SECTION_LABELS[section]}
              </RowLabel>
              <RowValue $complete={complete}>{value ?? '선택 전'}</RowValue>
            </ChecklistRow>
          )
        })}
      </Checklist>

      {error ? (
        <SimulationErrorNotice
          error={error}
          onRetry={onCalculate}
          onReselect={onReselect}
        />
      ) : (
        <Cta>
          <Button
            size="large"
            leftIcon={<Calculator />}
            disabled={gap !== null}
            isLoading={isPending}
            loadingLabel="계산 중"
            onClick={onCalculate}
          >
            계산하기
          </Button>
          <Helper>
            {gap ? (
              <>
                <span aria-hidden="true">{`${progress.done}/${progress.total} 완료 · `}</span>
                <VisuallyHidden>{`${progress.total}단계 중 ${progress.done}단계 완료.`}</VisuallyHidden>
                {gap}
              </>
            ) : (
              '지금 조건으로 계산할 수 있어요'
            )}
          </Helper>
        </Cta>
      )}
    </Root>
  )
}
