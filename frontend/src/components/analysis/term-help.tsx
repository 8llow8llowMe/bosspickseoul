'use client'

import { CircleHelp } from 'lucide-react'
import {
  useId,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import styled from 'styled-components'

/*
  지표 용어 한 줄 정의(#564). 추천 비교 표의 `HelpButton` 관용구를 그대로 따른다 — 물음표 버튼이
  **바로 아래 정의 줄**을 펼치고 접는 토글팁이다(`aria-expanded` · `aria-controls`).

  - 떠 있는 팝오버로 두지 않는다. 카드가 2열로 놓인 375px 에서 오른쪽 카드의 팝오버는 화면 밖으로
    나가고, 바텀시트는 한 줄짜리 정의를 읽으려고 화면 전체를 가린다. 제자리에서 펼치면 터치·키보드
    모두 같은 동작이고 hover 가 필요 없다.
  - 정의는 닫혀 있어도 `aria-describedby` 로 버튼에 이어 둔다. 숨긴 요소도 `aria-describedby` 로
    직접 가리키면 설명으로 계산된다 — 스크린리더는 버튼에 닿을 때 라벨과 정의를 함께 읽는다.
    카드처럼 라벨 묶음 전체에 정의를 잇고 싶으면 `definitionId` 를 넘겨 같은 id 를 쓰고, 두 번 읽히지
    않게 `describe={false}` 로 버튼 쪽 연결을 끈다.
  - 보이는 크기는 24px, 가상 요소로 히트 영역을 44px 까지 넓힌다(DESIGN.md 터치 44px).
  - Esc 는 펼친 정의를 접는다. 포커스는 버튼에 남는다.

  부모는 `flex-wrap: wrap` 인 한 줄이어야 한다. 정의 줄이 `flex-basis: 100%` 로 다음 줄을 쓴다.
*/

const HelpButton = styled.button`
  && {
    position: relative;
    flex: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    margin: -4px 0;
    padding: 0;
    border: 0;
    border-radius: var(--radius-pill);
    background: transparent;
    color: var(--color-text-caption);
    cursor: pointer;
  }

  &&::before {
    content: '';
    position: absolute;
    inset: -10px;
  }

  &&:hover {
    color: var(--color-text-700);
  }

  &&[aria-expanded='true'] {
    color: var(--color-primary-600);
  }

  &&:focus-visible {
    outline: none;
    box-shadow: var(--shadow-focus-primary-strong);
  }

  && svg {
    width: 16px;
    height: 16px;
    stroke: currentColor;
  }
`

const Definition = styled.span`
  && {
    display: block;
    flex-basis: 100%;
    margin-top: 4px;
    color: var(--color-text-700);
    font-size: 13px;
    font-weight: 400;
    line-height: 20px;
    text-align: left;
    word-break: keep-all;
  }

  &&[hidden] {
    display: none;
  }
`

export type TermHelpProps = {
  /** 용어(「상주인구」). 버튼 이름 「상주인구 뜻」에 쓴다. */
  label: string
  /** 한 줄 정의. 문구 정본은 `lib/analysis/presentation` 의 `ANALYSIS_TERM_DEFINITIONS`. */
  definition: string
  /** 정의 줄의 id. 바깥 묶음(카드)이 같은 정의를 `aria-describedby` 로 이으려면 넘긴다. */
  definitionId?: string
  /**
   * 버튼에도 정의를 `aria-describedby` 로 이을지(기본 true). 바깥 묶음이 이미 정의를 설명으로
   * 읽히면 false 로 둔다 — 묶음에 들어갈 때 한 번, 버튼에 닿을 때 또 한 번 같은 정의를 읽는다.
   */
  describe?: boolean
}

export default function TermHelp({
  label,
  definition,
  definitionId,
  describe = true,
}: TermHelpProps) {
  const fallbackId = useId()
  const id = definitionId ?? `${fallbackId}-definition`
  const [open, setOpen] = useState(false)

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Escape' && open) {
      event.preventDefault()
      event.stopPropagation()
      setOpen(false)
    }
  }

  return (
    <>
      <HelpButton
        type="button"
        aria-label={`${label} 뜻`}
        aria-expanded={open}
        aria-controls={id}
        aria-describedby={describe ? id : undefined}
        onClick={() => setOpen(current => !current)}
        onKeyDown={handleKeyDown}
      >
        <CircleHelp aria-hidden="true" />
      </HelpButton>
      <Definition id={id} hidden={!open}>
        {definition}
      </Definition>
    </>
  )
}
