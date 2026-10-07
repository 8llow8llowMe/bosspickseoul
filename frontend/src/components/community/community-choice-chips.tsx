'use client'

import { useEffect, useRef, useState } from 'react'
import styled, { css } from 'styled-components'

/*
  커뮤니티 선택 칩 묶음 — 인기 기간(#531)·말머리 필터·글쓰기 말머리(#529)가 같은 모양을 쓴다.
  `role="group"` + `aria-pressed` 버튼 묶음이다(라디오가 아니다 — 글쓰기 말머리는 다시 누르면 풀린다).

  모양은 작성 도움 칩(community-editor-form PromptChip — 알약·테두리·44 높이)을, 눌림은 선택 칩
  관용구(option-picker — primary-600 테두리 · primary-100 바탕 · primary-700 글자)를 그대로 쓴다.
  새 토큰을 만들지 않는다.
*/

export type CommunityChoiceChipOption<Value> = {
  value: Value
  label: string
}

export type CommunityChoiceChipsProps<Value> = {
  /** 묶음 이름(`aria-label`). 화면에 따로 제목이 없어 스크린리더가 이것으로 묶음을 읽는다. */
  label: string
  options: readonly CommunityChoiceChipOption<Value>[]
  /** 눌린 값. 어느 칩과도 같지 않으면(예: 말머리 없음) 아무것도 눌려 있지 않다. */
  selected: Value | null
  onSelect: (value: Value) => void
  /**
   * `wrap` 은 넘치면 줄을 바꾼다(칩이 적은 묶음). `scroll` 은 한 줄을 지키고 가로로 민다 — 칩이 많아
   * 좁은 폭에서 두 줄이 되면 피드가 그만큼 밀린다. 스크롤바를 숨기므로 가려진 쪽 끝을 흐린다
   * (DESIGN.md 「스크롤바를 숨긴 가로 스크롤 탭은 가려진 쪽 끝을 흐린다」).
   */
  layout?: 'wrap' | 'scroll'
  disabled?: boolean
}

/* 가려진 쪽 끝 흐림 폭. 분석 결과 가로 탭(analysis-result-view MobileTabList)과 같다. */
const FADE_WIDTH = 28

const Group = styled.div<{
  $scroll: boolean
  $fadeStart: boolean
  $fadeEnd: boolean
}>`
  display: flex;
  flex-wrap: ${props => (props.$scroll ? 'nowrap' : 'wrap')};
  gap: 8px;

  ${props =>
    props.$scroll
      ? css`
          /*
            포커스 링(2px + 간격 2px)이 스크롤 상자에 잘리지 않게 4px 를 안쪽에 두고 바깥으로 되돌린다 —
            칩 열의 시작선은 피드와 그대로 맞는다.
          */
          /* 눌린 칩 맞추기가 offsetLeft 를 이 묶음 기준으로 읽는다. */
          position: relative;
          margin: -4px;
          padding: 4px;
          overflow-x: auto;
          overscroll-behavior-x: contain;
          scrollbar-width: none;

          &::-webkit-scrollbar {
            display: none;
          }
        `
      : null}

  ${props => {
    if (!props.$fadeStart && !props.$fadeEnd) {
      return null
    }

    const mask = `linear-gradient(to right, transparent 0, #000 ${props.$fadeStart ? FADE_WIDTH : 0}px, #000 calc(100% - ${props.$fadeEnd ? FADE_WIDTH : 0}px), transparent 100%)`
    return css`
      -webkit-mask-image: ${mask};
      mask-image: ${mask};
    `
  }}
`

const Chip = styled.button<{ $selected: boolean }>`
  min-height: 44px;
  flex: 0 0 auto;
  padding: 0 16px;
  border: 1px solid
    ${props =>
      props.$selected ? 'var(--color-primary-600)' : 'var(--color-border-200)'};
  border-radius: var(--radius-pill);
  background: ${props =>
    props.$selected ? 'var(--color-primary-100)' : 'var(--color-surface)'};
  color: ${props =>
    props.$selected ? 'var(--color-primary-700)' : 'var(--color-text-700)'};
  font: inherit;
  font-size: 14px;
  font-weight: ${props => (props.$selected ? 700 : 600)};
  white-space: nowrap;
  cursor: pointer;
  transition:
    border-color var(--motion-fast) var(--ease-standard),
    background-color var(--motion-fast) var(--ease-standard),
    color var(--motion-fast) var(--ease-standard);

  &:hover {
    border-color: var(--color-primary-600);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: var(--button-disabled-opacity-color);
  }
`

export default function CommunityChoiceChips<Value>({
  label,
  options,
  selected,
  onSelect,
  layout = 'wrap',
  disabled = false,
}: CommunityChoiceChipsProps<Value>) {
  const scroll = layout === 'scroll'
  const groupRef = useRef<HTMLDivElement>(null)
  const [fade, setFade] = useState({ start: false, end: false })
  const selectedIndex = options.findIndex(option => option.value === selected)

  /*
    가로 스크롤 묶음만: 가려진 쪽을 재서 흐림을 켠다. jsdom·옛 브라우저처럼 ResizeObserver 가 없으면
    스크롤 이벤트만 듣는다(흐림은 보조 신호라 없어도 조작은 된다).
  */
  useEffect(() => {
    const group = groupRef.current
    if (!scroll || !group) return

    const update = () => {
      const max = group.scrollWidth - group.clientWidth
      const start = group.scrollLeft > 1
      const end = max > 1 && group.scrollLeft < max - 1
      setFade(prev =>
        prev.start === start && prev.end === end ? prev : { start, end },
      )
    }

    update()
    group.addEventListener('scroll', update, { passive: true })
    const observer =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update)
    observer?.observe(group)

    return () => {
      group.removeEventListener('scroll', update)
      observer?.disconnect()
    }
  }, [scroll])

  /*
    눌린 칩이 가려져 있으면(예: 390 에서 `동네 소식` 으로 연 주소) 가로로만 밀어 가운데로 맞춘다.
    `scrollIntoView` 는 세로 스크롤까지 움직일 수 있어 쓰지 않는다.
  */
  useEffect(() => {
    const group = groupRef.current
    if (!scroll || !group || selectedIndex < 0) return
    if (typeof group.scrollTo !== 'function' || group.clientWidth === 0) return

    const chip = group.children.item(selectedIndex)
    if (!(chip instanceof HTMLElement)) return

    const left = chip.offsetLeft - (group.clientWidth - chip.offsetWidth) / 2
    group.scrollTo({ left: Math.max(0, left) })
  }, [scroll, selectedIndex])

  return (
    <Group
      ref={groupRef}
      $fadeEnd={fade.end}
      $fadeStart={fade.start}
      $scroll={scroll}
      aria-label={label}
      role="group"
    >
      {options.map(option => {
        const pressed = option.value === selected

        return (
          <Chip
            aria-pressed={pressed}
            $selected={pressed}
            disabled={disabled}
            key={option.label}
            onClick={() => {
              onSelect(option.value)
            }}
            type="button"
          >
            {option.label}
          </Chip>
        )
      })}
    </Group>
  )
}
