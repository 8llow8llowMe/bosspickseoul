'use client'

import styled from 'styled-components'

import { SIMULATION_MEDIA } from '@/components/simulation/simulation-media'

/**
 * 시뮬레이션 하단 고정 바의 **틀**(위치·바탕·테두리·그림자). 입력 화면 요약 바와 리포트 바가 같이 쓴다.
 *
 * ≤1023 에서만 보인다 — 데스크톱은 sticky 열(입력 화면은 오른쪽 결과 패널, 리포트는 왼쪽 요약 열)이
 * 같은 역할을 한다. 안쪽 배치는 바마다 다르므로 여기서 정하지 않는다.
 * 바가 본문을 가리지 않도록 페이지는 ≤1023 에서 하단 여백을 바 높이 이상으로 둔다.
 */
export const SimulationBottomBarFrame = styled.div`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 20;
  border-top: 1px solid var(--color-border-200);
  background: var(--color-surface);
  padding: 12px 16px max(12px, env(safe-area-inset-bottom));
  box-shadow: var(--shadow-level-3);

  /*
    && 로 명시도를 올린다. 바마다 styled(SimulationBottomBarFrame) 로 display: flex | grid 를
    주는데, 그 규칙이 이 틀보다 뒤에 주입돼 명시도가 같으면 데스크톱 숨김을 덮어쓴다(바가 1440 에
    그대로 떴다). 고정 바라 셸 묶음 상한(> * 의 max-width)도 받지 않는다.
  */
  && {
    max-width: none;
  }

  @media ${SIMULATION_MEDIA.desktop} {
    && {
      display: none;
    }
  }
`

/** 바 왼쪽 금액 묶음 — 캡션 한 줄 + 총액. 좁으면 말줄임으로 버튼 자리를 지킨다. */
export const SimulationBottomBarAmount = styled.div`
  min-width: 0;
  display: grid;
  gap: 2px;

  span {
    overflow: hidden;
    color: var(--color-text-caption);
    font-size: 12px;
    line-height: 18px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  strong {
    overflow: hidden;
    color: var(--color-text-900);
    font-size: 18px;
    font-weight: 700;
    line-height: 26px;
    font-variant-numeric: tabular-nums;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`
