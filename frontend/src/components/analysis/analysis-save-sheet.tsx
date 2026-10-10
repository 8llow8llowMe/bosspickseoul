'use client'

import { Archive, Bookmark, Check, Lock, X } from 'lucide-react'
import {
  useEffect,
  useId,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent,
} from 'react'
import { createPortal } from 'react-dom'
import styled from 'styled-components'

import type {
  AnalysisSaveOption,
  AnalysisSaveOptionKey,
} from '@/lib/analysis/save-options'
import {
  getDialogFocusableElements,
  getDialogFocusTargetIndex,
} from '@/lib/ui/dialog-focus'

/*
  상권분석 결과 「저장」 시트(#563, 결정 D-2).

  화면에는 저장이 두 가지 있다 — **이 분석 화면**(업종·분기·보던 항목까지, 분석 북마크)과
  **관심 상권**(상권만, 회원 북마크). 예전에는 「화면 보관」·「상권 저장」 두 버튼이었고 차이가
  `title` 툴팁에만 있어 터치 화면에서는 알 수 없었다. 버튼은 「저장」 하나로 두고, 누르면 이 시트가
  두 가지를 **설명과 함께** 보여 준다.

  - 항목마다 지금 저장돼 있는지를 글자로 보이고(`aria-pressed`), 누르면 그 자리에서 저장·해제한다.
    시트는 닫히지 않는다 — 두 가지를 다 저장하려는 사람이 다시 열지 않게.
  - 요청 중에도 버튼을 잠그지 않는다. 잠근 버튼에 포커스가 있으면 브라우저가 body 로 떨어뜨려
    Esc·Tab 을 시트가 받지 못한다(confirm-sheet 와 같은 이유). 연타는 호출부가 pending 으로 막는다.
  - `role="dialog"` · 제목 연결 · 포커스 가두기(`lib/ui/dialog-focus`) · Esc · 바깥 누름은 닫기다.
    닫히면 열기 직전에 포커스가 있던 요소(「저장」 버튼)로 돌려준다.
  - 모양은 확인 시트와 같다: `<480` 바텀시트, `≥480` 가운데 420.
*/

export type {
  AnalysisSaveOption,
  AnalysisSaveOptionKey,
} from '@/lib/analysis/save-options'

export type AnalysisSaveSheetProps = {
  open: boolean
  options: readonly AnalysisSaveOption[]
  /** 비로그인. 항목마다 「로그인 필요」를 보이고, 누르면 호출부가 로그인으로 보낸다. */
  requiresLogin: boolean
  onToggle: (key: AnalysisSaveOptionKey) => void
  onClose: () => void
}

const MOBILE = '@media (max-width: 479px)'

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: var(--color-overlay);

  ${MOBILE} {
    align-items: flex-end;
    padding: 0;
  }
`

const Panel = styled.div`
  width: min(100%, 420px);
  display: grid;
  gap: 12px;
  padding: 20px;
  border-radius: var(--radius-card);
  background: var(--color-surface);
  box-shadow: var(--shadow-level-4);

  &:focus {
    outline: none;
  }

  ${MOBILE} {
    width: 100%;
    padding-bottom: calc(20px + env(safe-area-inset-bottom));
    border-radius: var(--radius-sheet) var(--radius-sheet) 0 0;
  }
`

const Head = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
`

const Title = styled.h2`
  color: var(--color-text-900);
  font-size: 20px;
  font-weight: 700;
  line-height: 28px;
  word-break: keep-all;
`

const Description = styled.p`
  color: var(--color-text-600);
  font-size: 14px;
  line-height: 22px;
  word-break: keep-all;
`

const CloseButton = styled.button`
  flex: none;
  width: 44px;
  height: 44px;
  margin: -10px -10px 0 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: var(--radius-control);
  background: transparent;
  color: var(--color-text-caption);
  cursor: pointer;

  &:hover {
    background: var(--color-surface-muted);
    color: var(--color-text-900);
  }

  &:focus-visible {
    outline: none;
    box-shadow: var(--shadow-focus-primary-strong);
  }

  svg {
    width: 20px;
    height: 20px;
  }
`

const OptionList = styled.ul`
  display: grid;
  gap: 8px;
`

const OptionButton = styled.button<{ $saved: boolean }>`
  width: 100%;
  min-height: 64px;
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid
    ${props =>
      props.$saved ? 'var(--color-primary-600)' : 'var(--color-border-200)'};
  border-radius: var(--radius-control);
  background: ${props =>
    props.$saved ? 'var(--color-primary-100)' : 'var(--color-surface)'};
  color: var(--color-text-900);
  text-align: left;
  cursor: pointer;

  &:hover:not(:disabled) {
    border-color: var(--color-primary-600);
  }

  &:focus-visible {
    outline: none;
    box-shadow: var(--shadow-focus-primary-strong);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  > svg {
    width: 20px;
    height: 20px;
    color: var(--color-text-600);
  }
`

const OptionText = styled.span`
  display: grid;
  gap: 2px;
  min-width: 0;

  strong {
    font-size: 15px;
    font-weight: 700;
    line-height: 22px;
  }

  span {
    color: var(--color-text-600);
    font-size: 13px;
    line-height: 20px;
    word-break: keep-all;
  }
`

/** 지금 상태. 색이 아니라 글자가 말한다 — 저장됨 / 저장하기 / 로그인 필요 / 처리 중. */
const OptionState = styled.span<{ $saved: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: ${props =>
    props.$saved
      ? 'var(--color-text-primary-on-light)'
      : 'var(--color-text-600)'};
  font-size: 13px;
  font-weight: 700;
  line-height: 20px;
  white-space: nowrap;

  svg {
    width: 14px;
    height: 14px;
  }
`

const OPTION_ICON = {
  analysis: Archive,
  commercial: Bookmark,
} as const

const describeOptionState = (
  option: AnalysisSaveOption,
  requiresLogin: boolean,
): string => {
  if (requiresLogin) return '로그인 필요'
  if (option.pending) return '처리 중'
  return option.saved ? '저장됨' : '저장하기'
}

export default function AnalysisSaveSheet({
  open,
  ...props
}: AnalysisSaveSheetProps) {
  if (!open) return null

  return <AnalysisSaveSheetContent {...props} />
}

function AnalysisSaveSheetContent({
  options,
  requiresLogin,
  onToggle,
  onClose,
}: Omit<AnalysisSaveSheetProps, 'open'>) {
  const id = useId()
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const returnTarget =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    // 첫 포커스는 첫 저장 항목이다. 잠겨 있으면 다음 항목, 다 잠겼으면 닫기 버튼이다.
    const frame = requestAnimationFrame(() => {
      const panel = panelRef.current
      if (!panel) return
      const first = panel.querySelector<HTMLElement>(
        '[data-save-option]:not([disabled])',
      )
      ;(first ?? getDialogFocusableElements(panel)[0] ?? panel).focus()
    })

    return () => {
      cancelAnimationFrame(frame)
      document.body.style.overflow = previousOverflow
      if (returnTarget?.isConnected) {
        returnTarget.focus()
      }
    }
  }, [])

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      onClose()
      return
    }

    if (event.key !== 'Tab' || !panelRef.current) return

    const focusable = getDialogFocusableElements(panelRef.current)
    const targetIndex = getDialogFocusTargetIndex(
      focusable.length,
      focusable.indexOf(document.activeElement as HTMLElement),
      event.shiftKey ? 'backward' : 'forward',
    )

    event.preventDefault()
    if (targetIndex === null) {
      panelRef.current.focus()
      return
    }
    focusable[targetIndex]?.focus()
  }

  const handleBackdropMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onClose()
  }

  const sheet = (
    <Overlay onMouseDown={handleBackdropMouseDown}>
      <Panel
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-description`}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        <Head>
          <Title id={`${id}-title`}>무엇을 저장할까요?</Title>
          <CloseButton
            type="button"
            aria-label="저장 창 닫기"
            onClick={onClose}
          >
            <X aria-hidden="true" />
          </CloseButton>
        </Head>
        <Description id={`${id}-description`}>
          {requiresLogin
            ? '저장하려면 로그인이 필요해요. 항목을 누르면 로그인한 뒤 이 화면으로 돌아와요.'
            : '분석 화면과 관심 상권은 따로 저장돼요. 둘 다 저장할 수도 있어요.'}
        </Description>
        <OptionList>
          {options.map(option => {
            const Icon = OPTION_ICON[option.key]
            const saved = !requiresLogin && option.saved
            const state = describeOptionState(option, requiresLogin)
            const descriptionId = `${id}-${option.key}-description`

            return (
              <li key={option.key}>
                <OptionButton
                  type="button"
                  data-save-option={option.key}
                  $saved={saved}
                  aria-pressed={requiresLogin ? undefined : option.saved}
                  aria-busy={option.pending || undefined}
                  aria-describedby={descriptionId}
                  disabled={option.disabled}
                  onClick={() => {
                    if (!option.pending) onToggle(option.key)
                  }}
                >
                  <Icon aria-hidden="true" />
                  <OptionText>
                    <strong>{option.title}</strong>
                    <span id={descriptionId}>{option.description}</span>
                  </OptionText>
                  {/*
                    로그인 상태에서는 상태 글자를 읽히지 않는다 — 저장 여부는 aria-pressed, 처리 중은
                    aria-busy 가 말한다. 글자까지 읽히면 「저장됨, 눌림」처럼 두 번 말한다. 비로그인
                    「로그인 필요」는 aria-pressed 가 없으므로 글자로 읽힌다.
                  */}
                  <OptionState
                    $saved={saved}
                    aria-hidden={requiresLogin ? undefined : true}
                  >
                    {requiresLogin ? (
                      <Lock aria-hidden="true" />
                    ) : saved ? (
                      <Check aria-hidden="true" />
                    ) : null}
                    {state}
                  </OptionState>
                </OptionButton>
              </li>
            )
          })}
        </OptionList>
      </Panel>
    </Overlay>
  )

  return typeof document === 'undefined'
    ? sheet
    : createPortal(sheet, document.body)
}
