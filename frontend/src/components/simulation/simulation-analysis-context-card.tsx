'use client'

import Link from 'next/link'
import { ArrowLeft, MapPin, RotateCcw } from 'lucide-react'
import styled from 'styled-components'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { SimulationAnalysisContext } from '@/lib/simulation/analysis-context'

export type SimulationAnalysisContextCardProps = {
  context: SimulationAnalysisContext
  /**
   * 현재 선택이 아직 컨텍스트 그대로인가 (`isSimulationContextApplied`).
   * false면 문구를 바꾸고 되돌리기 CTA를 띄운다 — "그대로 채워 뒀어요"를 남기면 거짓말이 된다.
   */
  applied: boolean
  /** 분석 조건으로 되돌리기. `applied`가 false일 때만 노출된다. */
  onRestore: () => void
}

const Root = styled.aside`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  padding: 12px 16px;

  @media (max-width: 640px) {
    padding: 12px;
  }
`

/* 아이콘+문구 한 덩어리. 좁아지면 태그·링크 줄과 분리돼 세로로 쌓인다. */
const Main = styled.div`
  min-width: 0;
  flex: 1 1 260px;
  display: flex;
  align-items: center;
  gap: 12px;
`

const Side = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
`

const Icon = styled.span`
  width: 32px;
  height: 32px;
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  border-radius: var(--radius-control);
  background: var(--color-primary-100);
  color: var(--color-primary-700);

  svg {
    width: 18px;
    height: 18px;
    stroke: currentColor;
  }
`

const Copy = styled.div`
  min-width: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 8px;

  strong {
    color: var(--color-text-900);
    font-size: 14px;
    font-weight: 700;
    line-height: 22px;
    word-break: keep-all;
  }

  span {
    color: var(--color-text-600);
    font-size: 13px;
    line-height: 20px;
    word-break: keep-all;
  }
`

const Tags = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
`

const BackLink = styled(Link)`
  min-height: 36px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border-radius: var(--radius-control);
  padding: 0 12px;
  color: var(--color-text-700);
  font-size: 13px;
  font-weight: 600;

  &:hover {
    background: var(--color-surface-muted);
    color: var(--color-primary-700);
  }

  &:focus-visible {
    outline: 2px solid var(--color-primary-700);
    outline-offset: 2px;
  }

  svg {
    width: 16px;
    height: 16px;
    stroke: currentColor;
  }
`

/**
 * `/analysis/simulation` 상단 카드 — 분석 화면에서 들고 온 조건을 보여준다.
 *
 * 상권 **이름**은 쿼리로 넘어오지 않아 표기하지 않는다. 코드만으로 이름을 지어내면
 * 사용자가 다른 상권을 보고 있다고 오인할 수 있어서, 확실히 아는 자치구·업종만 노출한다.
 *
 * **카드는 낡지 않는다.** 사용자가 조건을 바꾸면(`applied === false`) "그대로 채워 뒀어요"가
 * 거짓이 되므로 문구를 "직접 바꿨어요"로 바꾸고, 배지에 `분석` 접두사를 붙여 이 값이
 * *지금 선택*이 아니라 *분석에서 가져온 원래 조건*임을 드러낸 뒤 되돌리기 CTA를 준다.
 */
export default function SimulationAnalysisContextCard({
  context,
  applied,
  onRestore,
}: SimulationAnalysisContextCardProps) {
  // 배지 문구를 문자열로 미리 만든다. JSX에서 `{applied ? '' : '분석 '}{name}`처럼 쪼개면
  // 텍스트 노드가 갈라져 화면은 같아 보여도 "분석 강동구" 한 덩어리로 읽히지 않는다.
  const tagLabel = (name: string) => (applied ? name : `분석 조건 · ${name}`)

  return (
    <Root aria-label="분석에서 가져온 조건">
      <Main>
        <Icon aria-hidden="true">
          <MapPin />
        </Icon>
        <Copy>
          {applied ? (
            <>
              <strong>분석 조건을 그대로 채워 뒀어요</strong>
              <span>필요하면 아래에서 바꿀 수 있어요</span>
            </>
          ) : (
            <>
              <strong>조건을 직접 바꿨어요</strong>
              <span>아래 선택이 계산에 쓰여요</span>
            </>
          )}
        </Copy>
      </Main>
      <Side>
        <Tags>
          {context.districtName ? (
            <Badge $tone={applied ? 'blue' : 'grey'}>
              {tagLabel(context.districtName)}
            </Badge>
          ) : null}
          {context.serviceName ? (
            <Badge $tone="grey">{tagLabel(context.serviceName)}</Badge>
          ) : null}
        </Tags>
        {applied ? null : (
          <Button
            size="tiny"
            variant="secondary"
            leftIcon={<RotateCcw />}
            onClick={onRestore}
          >
            분석 조건으로 되돌리기
          </Button>
        )}
        <BackLink href="/analysis">
          <ArrowLeft aria-hidden="true" />
          분석으로
        </BackLink>
      </Side>
    </Root>
  )
}
