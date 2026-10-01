'use client'

import { AlertCircle, RotateCcw, SlidersHorizontal } from 'lucide-react'
import styled from 'styled-components'

import { Button } from '@/components/ui/button'
import { isRetryable, type NormalizedApiError } from '@/lib/api/api-error'
import {
  SIMULATION_CONDITION_SECTION_LABELS,
  resolveSimulationFieldSection,
  resolveSimulationRecoverySection,
  type SimulationConditionSection,
} from '@/lib/simulation/conditions'

export type SimulationErrorNoticeProps = {
  error: NormalizedApiError
  /** 재시도 실행. 버튼 노출 자체는 `isRetryable(kind)`만 결정한다. */
  onRetry?: () => void
  /** 조건 재선택 — 되돌릴 섹션을 받아 그 조건 섹션으로 데려간다. */
  onReselect?: (section: SimulationConditionSection) => void
  /**
   * 조건이 둘인 화면(비교)에서 **어느 쪽**이 문제인지. 주면 「조건 B를 확인해 주세요」를
   * 덧붙이고 버튼 이름에 쪽을 붙인다(「조건 A·B」는 모음으로 끝나 「를」이다). 되돌릴 섹션을 모르는 비재시도 오류(404 등)에도 `onEdit`
   * 버튼을 둬서 막다른 화면을 만들지 않는다(C5).
   */
  scope?: { label: string; onEdit: () => void }
}

const TITLE_BY_KIND: Record<NormalizedApiError['kind'], string> = {
  network: '연결이 원활하지 않아요',
  server: '잠시 문제가 생겼어요',
  'not-found': '이 조건으로는 계산할 수 없어요',
  unauthorized: '로그인이 필요해요',
  client: '입력한 조건을 다시 확인해 주세요',
}

const Root = styled.div`
  display: grid;
  gap: 12px;
  border: 1px solid var(--color-border-200);
  border-left: 3px solid var(--color-danger);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  padding: 20px;
`

const Head = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 8px;

  svg {
    width: 20px;
    height: 20px;
    flex: 0 0 auto;
    margin-top: 2px;
    color: var(--color-danger);
    stroke: currentColor;
  }
`

const Title = styled.h3`
  color: var(--color-text-900);
  font-size: 16px;
  font-weight: 700;
  line-height: 24px;
  word-break: keep-all;
`

const Message = styled.p`
  color: var(--color-text-700);
  font-size: 14px;
  line-height: 22px;
  white-space: pre-line;
  word-break: keep-all;
`

const FieldList = styled.ul`
  display: grid;
  gap: 4px;
  border-radius: var(--radius-control);
  background: var(--color-surface-muted);
  padding: 12px;

  li {
    color: var(--color-text-700);
    font-size: 13px;
    line-height: 20px;
    word-break: keep-all;
  }

  strong {
    margin-right: 4px;
    color: var(--color-text-900);
    font-weight: 700;
  }
`

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`

/**
 * 시뮬레이션 오류 배너.
 *
 * **재시도 버튼 노출은 `isRetryable(kind)`만으로 결정한다.** 상태 코드를 직접 비교하지 않는다.
 * 404(`not-found`)에는 재시도 버튼이 붙지 않고 서버 `resultMessage`를 그대로 보여준 뒤
 * 조건을 다시 고르게 한다 — 같은 조건으로 다시 눌러도 결과가 같기 때문이다.
 *
 * `resultCode`는 "어느 조건으로 되돌릴지"를 고를 때만 참고한다(임대료 없는 자치구 vs 사라진 브랜드).
 */
export default function SimulationErrorNotice({
  error,
  onRetry,
  onReselect,
  scope,
}: SimulationErrorNoticeProps) {
  const retryable = isRetryable(error.kind)
  const fieldSection = error.fieldErrors
    .map(item => resolveSimulationFieldSection(item.field))
    .find((section): section is SimulationConditionSection => section !== null)
  const recoverySection =
    resolveSimulationRecoverySection(error.code) ?? fieldSection

  return (
    <Root role="alert">
      <Head>
        <AlertCircle aria-hidden="true" />
        <Title>{TITLE_BY_KIND[error.kind]}</Title>
      </Head>
      <Message>{error.message}</Message>
      {scope ? <Message>{`${scope.label}를 확인해 주세요.`}</Message> : null}

      {error.fieldErrors.length > 0 ? (
        <FieldList>
          {error.fieldErrors.map(item => (
            <li key={`${item.field}-${item.message}`}>
              <strong>{item.field}</strong>
              {item.message}
            </li>
          ))}
        </FieldList>
      ) : null}

      <Actions>
        {retryable && onRetry ? (
          <Button
            size="medium"
            variant="secondary"
            leftIcon={<RotateCcw />}
            onClick={onRetry}
          >
            다시 시도
          </Button>
        ) : null}
        {!retryable && recoverySection && onReselect ? (
          <Button
            size="medium"
            variant="secondary"
            leftIcon={<SlidersHorizontal />}
            onClick={() => onReselect(recoverySection)}
          >
            {scope ? `${scope.label} ` : ''}
            {SIMULATION_CONDITION_SECTION_LABELS[recoverySection]} 다시 선택
          </Button>
        ) : null}
        {!retryable && !recoverySection && scope ? (
          <Button
            size="medium"
            variant="secondary"
            leftIcon={<SlidersHorizontal />}
            onClick={scope.onEdit}
          >
            {`${scope.label} 고치기`}
          </Button>
        ) : null}
      </Actions>
    </Root>
  )
}
