'use client'

import { ArrowRight } from 'lucide-react'
import styled from 'styled-components'

import { districts } from '@/data/districts'
import { findDistrictOption, findIndustryOption } from '@/data/home-demo'
import type { DemoSelection } from '@/data/home-demo'
import type { RecommendPreviewState } from '@/hooks/use-recommend-preview'

export type FunnelCounterProps = {
  /** 02·03단계와 같은 선택. 02 노드가 그대로 보여준다. */
  selection: DemoSelection
  /** 03단계 데이터 — `RecommendPreview`가 부르는 것과 같은 훅 호출 결과라 캐시를 공유한다. */
  recommend: RecommendPreviewState
  /**
   * 스티키 모드에서만 준다(0~3, 활성 스텝 인덱스). 스택 모드는 "지금 보는 단계"라는
   * 개념 자체가 없으므로 생략한다 — 강조 없이 1회만 그린다.
   */
  active?: number
}

const List = styled.ol`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  /* row-gap 은 그대로 8px, column-gap 만 넓혀 화살표가 놓일 자리를 만든다. */
  gap: 8px 20px;
  margin: 0;
  padding: 0;
  list-style: none;

  @media (max-width: 640px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    /* 2열에서는 화살표를 숨기므로 넓힌 열 간격도 원래대로 되돌린다. */
    gap: 8px;
  }
`

const Node = styled.li<{ $active: boolean }>`
  position: relative;
  display: grid;
  gap: 2px;
  min-width: 0;
  padding: 10px 12px;
  border: 1px solid
    ${p => (p.$active ? 'var(--color-primary-700)' : 'var(--color-border-200)')};
  border-radius: var(--radius-control);
  background: ${p =>
    p.$active ? 'var(--color-primary-100)' : 'var(--color-surface)'};
  transition:
    background-color var(--motion-fast) var(--ease-standard),
    border-color var(--motion-fast) var(--ease-standard);

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

/**
 * 노드 사이 방향 화살표. `<ol>` 의 자식은 `<li>` 여야 유효하므로 별도 리스트 항목이
 * 아니라 **각 노드(마지막 제외) 안에 절대 위치로** 넣는다.
 *
 * 순수 장식이다 — 순서의 의미는 `<ol>` 과 `aria-current="step"` 이 이미 나른다.
 * 색을 쓰지 않는 이유: 네 노드는 같은 흐름의 국면이지 서로 다른 범주가 아니라,
 * 색을 다르게 칠하면 없는 의미 차이를 암시한다.
 */
const Connector = styled.span`
  position: absolute;
  top: 50%;
  right: -20px;
  transform: translate(50%, -50%);
  display: flex;
  color: var(--color-border-300);

  /* 2열에서는 가로 화살표의 방향이 깨진다(2->3 이 아래-왼쪽이 된다). */
  @media (max-width: 640px) {
    display: none;
  }
`

const NodeLabel = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-caption);
`

const NodeValue = styled.span`
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text-900);
  font-variant-numeric: tabular-nums;
  word-break: keep-all;
`

const NodeNote = styled.span`
  font-size: 11px;
  color: var(--color-text-caption);
`

/** 03 노드 값. 로딩/폴백/실데이터 세 갈래를 여기서만 문장으로 만든다. */
function step03Value(recommend: RecommendPreviewState): string {
  if (recommend.isLoading) return '—'
  if (recommend.view.isSample) return `추천 ${recommend.view.rows.length}곳`
  return `상권 ${recommend.commercialsCount}곳 중 추천 ${recommend.view.rows.length}곳`
}

export default function FunnelCounter({
  selection,
  recommend,
  active,
}: FunnelCounterProps) {
  const districtName = findDistrictOption(selection.districtId)?.name ?? '—'
  const industryName = findIndustryOption(selection.industryId)?.name ?? '—'
  const showSampleNote = recommend.view.isSample && !recommend.isLoading

  return (
    <List aria-label="현황 확인부터 창업 시뮬레이션까지 좁혀지는 선택 수">
      <Node
        $active={active === 0}
        aria-current={active === 0 ? 'step' : undefined}
      >
        <NodeLabel>01 현황 확인</NodeLabel>
        {/* 하드코딩 금지 — 서울 자치구 목록(src/data/districts.ts) 길이를 그대로 읽는다. */}
        <NodeValue>{districts.length}개 자치구</NodeValue>
        <Connector aria-hidden="true">
          <ArrowRight size={16} />
        </Connector>
      </Node>

      <Node
        $active={active === 1}
        aria-current={active === 1 ? 'step' : undefined}
      >
        <NodeLabel>02 상권 분석</NodeLabel>
        <NodeValue>
          {districtName} · {industryName}
        </NodeValue>
        <Connector aria-hidden="true">
          <ArrowRight size={16} />
        </Connector>
      </Node>

      <Node
        $active={active === 2}
        aria-current={active === 2 ? 'step' : undefined}
      >
        <NodeLabel>03 후보 추천</NodeLabel>
        <NodeValue>{step03Value(recommend)}</NodeValue>
        {showSampleNote ? <NodeNote>예시</NodeNote> : null}
        <Connector aria-hidden="true">
          <ArrowRight size={16} />
        </Connector>
      </Node>

      <Node
        $active={active === 3}
        aria-current={active === 3 ? 'step' : undefined}
      >
        <NodeLabel>04 창업 시뮬레이션</NodeLabel>
        <NodeValue>1개 예시</NodeValue>
        {/*
          04는 POST /simulations/reports가 필요해 앞 세 단계처럼 선택을 이어받을 수
          없다(랜딩 방문자마다 쓰기 요청을 보내지 않기로 한 결정) — 앞 노드는 선택을
          따라 움직이는데 04만 고정이라는 사실을 감추지 않고 그대로 적는다.
        */}
        <NodeNote>선택과 무관한 고정 예시</NodeNote>
      </Node>
    </List>
  )
}
