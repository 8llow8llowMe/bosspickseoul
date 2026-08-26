'use client'

import Link from 'next/link'
import { ArrowLeft, MapPin } from 'lucide-react'
import styled from 'styled-components'

import { Badge } from '@/components/ui/badge'
import type { SimulationAnalysisContext } from '@/lib/simulation/analysis-context'

export type SimulationAnalysisContextCardProps = {
  context: SimulationAnalysisContext
}

/* top: 64px는 sticky 사이트 헤더(65px) 아래에 붙기 위한 값이다. spacing 스케일의 64를 쓴다. */
const Root = styled.aside`
  position: sticky;
  top: 64px;
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  padding: 16px 20px;
  box-shadow: var(--shadow-level-2);

  @media (max-width: 640px) {
    padding: 12px 16px;
  }
`

/* 아이콘+문구 한 덩어리. 좁아지면 태그·링크 줄과 분리돼 세로로 쌓인다. */
const Main = styled.div`
  min-width: 0;
  flex: 1 1 220px;
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
  width: 36px;
  height: 36px;
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  border-radius: var(--radius-control);
  background: var(--color-primary-100);
  color: var(--color-primary-700);

  svg {
    width: 20px;
    height: 20px;
    stroke: currentColor;
  }
`

const Copy = styled.div`
  min-width: 0;
  display: grid;
  gap: 4px;

  p {
    color: var(--color-text-caption);
    font-size: 12px;
    font-weight: 600;
    line-height: 18px;
  }

  strong {
    color: var(--color-text-900);
    font-size: 15px;
    font-weight: 700;
    line-height: 22px;
    word-break: keep-all;
  }
`

const Tags = styled.div`
  display: flex;
  flex-wrap: wrap;
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
 * `/analysis/simulation` 상단 sticky 카드 — 분석 화면에서 들고 온 조건을 보여준다.
 *
 * 상권 **이름**은 쿼리로 넘어오지 않아 표기하지 않는다. 코드만으로 이름을 지어내면
 * 사용자가 다른 상권을 보고 있다고 오인할 수 있어서, 확실히 아는 자치구·업종만 노출한다.
 */
export default function SimulationAnalysisContextCard({
  context,
}: SimulationAnalysisContextCardProps) {
  return (
    <Root aria-label="분석에서 가져온 조건">
      <Main>
        <Icon aria-hidden="true">
          <MapPin />
        </Icon>
        <Copy>
          <p>상권 분석에서 가져온 조건</p>
          <strong>조건을 그대로 채워 뒀어요</strong>
        </Copy>
      </Main>
      <Side>
        <Tags>
          {context.districtName ? (
            <Badge $tone="blue">{context.districtName}</Badge>
          ) : null}
          {context.serviceName ? (
            <Badge $tone="grey">{context.serviceName}</Badge>
          ) : null}
        </Tags>
        <BackLink href="/analysis">
          <ArrowLeft aria-hidden="true" />
          분석으로
        </BackLink>
      </Side>
    </Root>
  )
}
