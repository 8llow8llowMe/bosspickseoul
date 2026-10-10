'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import styled from 'styled-components'

import { SIMULATION_MEDIA } from '@/components/simulation/simulation-media'

/**
 * 시뮬레이션 하단 고정 바의 **틀**(위치·바탕·테두리·그림자). 입력 화면 요약 바와 리포트 바가 같이 쓴다.
 *
 * ≤1023 에서만 보인다 — 데스크톱은 sticky 열(입력 화면은 오른쪽 결과 패널, 리포트는 왼쪽 요약 열)이
 * 같은 역할을 한다. 안쪽 배치는 바마다 다르므로 여기서 정하지 않는다.
 * 바가 문서 끝(푸터)을 가리지 않도록 바마다 `SimulationBottomBarSpacer` 를 함께 그린다(#605).
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
    그대로 떴다).
  */
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

/* 데스크톱은 바가 숨으므로 자리도 두지 않는다. 높이는 잰 값을 인라인으로 받는다. */
const Spacer = styled.div`
  @media ${SIMULATION_MEDIA.desktop} {
    display: none;
  }
`

/**
 * 고정 바 높이만큼 **문서 끝(푸터 뒤)**에 자리를 둔다(#605).
 *
 * 바는 `position: fixed` 라 문서 흐름에 자리가 없다. 본문(`main`)에 하단 여백을 줘도 그 뒤에 오는 푸터는
 * 맨 아래까지 내렸을 때 바 뒤에 깔려, 375 에서 푸터 로고가 바 위로 비쳐 보였다(dev 2026-10-09).
 * 커뮤니티 상세 하단 바와 같은 방식으로 `body` 끝에 같은 높이의 빈 칸을 붙여 푸터를 바 위로 올린다.
 *
 * 높이는 상수가 아니라 **바를 재서** 쓴다. 리포트 바는 저장 결과 한 줄·오류 두 줄에 따라 71~119px 이고,
 * 하단 safe-area(최대 34px)만큼 더 커진다. 재는 것은 ResizeObserver 다 — 처음 관찰할 때 한 번, 크기가
 * 바뀔 때마다 알린다. 바가 숨는 폭(≥1024)에서는 0 이 된다. 서버 렌더와 첫 렌더에는 바가 없어 그리지 않는다.
 */
export function SimulationBottomBarSpacer({
  bar,
}: {
  /** 잴 바 요소. 바의 콜백 ref 로 받은 값을 넘긴다. */
  bar: HTMLElement | null
}) {
  const [height, setHeight] = useState(0)

  useEffect(() => {
    if (!bar || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => setHeight(bar.offsetHeight))
    observer.observe(bar)
    return () => observer.disconnect()
  }, [bar])

  if (!bar) return null

  return createPortal(
    <Spacer
      aria-hidden="true"
      data-simulation-bottom-bar-spacer="true"
      style={{ height }}
    />,
    document.body,
  )
}
