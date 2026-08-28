'use client'

import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent,
} from 'react'
import styled from 'styled-components'

export type CommunityReportDialogProps = {
  open: boolean
  targetKind: 'POST' | 'COMMENT'
  targetId: number
  pending: boolean
  errorMessage: string | null
  onClose: () => void
  onSubmit: (reason: string) => void
}

export const validateCommunityReportReason = (
  reason: string,
): string | null => {
  const trimmedReason = reason.trim()

  if (!trimmedReason) {
    return '신고 사유를 입력해 주세요.'
  }

  if (trimmedReason.length > 500) {
    return '신고 사유는 500자 이하로 입력해 주세요.'
  }

  return null
}

export const getDialogFocusTargetIndex = (
  focusableCount: number,
  currentIndex: number,
  direction: 'forward' | 'backward',
): number | null => {
  if (focusableCount <= 0) {
    return null
  }

  if (currentIndex < 0 || currentIndex >= focusableCount) {
    return direction === 'forward' ? 0 : focusableCount - 1
  }

  const offset = direction === 'forward' ? 1 : -1
  return (currentIndex + offset + focusableCount) % focusableCount
}

const getFocusableElements = (root: HTMLElement) =>
  Array.from(
    root.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter(element => !element.hasAttribute('aria-hidden'))

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  place-items: center;
  padding: 24px;
  background: var(--color-overlay);

  @media (max-width: 640px) {
    align-items: end;
    padding: 0;
  }
`

const Dialog = styled.div`
  width: min(100%, 520px);
  display: grid;
  gap: 20px;
  padding: 28px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  box-shadow: var(--shadow-level-3);

  &:focus {
    outline: none;
  }

  @media (max-width: 640px) {
    width: 100%;
    padding: 24px 20px;
    border-radius: var(--radius-card) var(--radius-card) 0 0;
  }
`

const Header = styled.header`
  display: grid;
  gap: 8px;
`

const Title = styled.h2`
  color: var(--color-text-900);
  font-size: 22px;
  line-height: 1.35;
`

const Description = styled.p`
  color: var(--color-text-500);
  font-size: 14px;
  line-height: 1.65;
`

const Form = styled.form`
  display: grid;
  gap: 16px;
`

const Field = styled.div`
  display: grid;
  gap: 8px;
`

const Label = styled.label`
  color: var(--color-text-900);
  font-size: 14px;
  font-weight: 700;
`

const TextArea = styled.textarea`
  width: 100%;
  min-height: 160px;
  padding: 14px 16px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-field);
  resize: vertical;
  background: var(--color-surface);
  color: var(--color-text-900);
  font: inherit;
  font-size: 14px;
  line-height: 1.65;
  outline: none;

  &:focus-visible {
    border-color: var(--color-primary-600);
    box-shadow: var(--shadow-focus-primary-strong);
  }

  &:disabled {
    cursor: not-allowed;
    background: var(--color-surface-muted);
    opacity: var(--button-disabled-opacity-color);
  }
`

const FieldMeta = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
`

const Message = styled.p<{ $error?: boolean }>`
  color: ${props =>
    props.$error ? 'var(--color-danger)' : 'var(--color-text-500)'};
  font-size: 12px;
  line-height: 1.5;
`

const CharacterCount = styled.span`
  margin-left: auto;
  color: var(--color-text-caption);
  font-size: 12px;
  white-space: nowrap;
`

const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;

  @media (max-width: 640px) {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`

const Button = styled.button<{ $primary?: boolean }>`
  min-height: 48px;
  padding: 0 18px;
  border: 1px solid
    ${props =>
      props.$primary ? 'var(--color-primary-700)' : 'var(--color-border-300)'};
  border-radius: var(--radius-control);
  background: ${props =>
    props.$primary ? 'var(--color-primary-700)' : 'var(--color-surface)'};
  color: ${props =>
    props.$primary ? 'var(--color-surface)' : 'var(--color-text-700)'};
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;

  &:focus-visible {
    outline: none;
    box-shadow: var(--shadow-focus-primary-strong);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: var(--button-disabled-opacity-color);
  }
`

export default function CommunityReportDialog({
  open,
  targetKind,
  targetId,
  pending,
  errorMessage,
  onClose,
  onSubmit,
}: CommunityReportDialogProps) {
  if (!open) {
    return null
  }

  return (
    <CommunityReportDialogContent
      key={`${targetKind}-${targetId}`}
      targetKind={targetKind}
      pending={pending}
      errorMessage={errorMessage}
      onClose={onClose}
      onSubmit={onSubmit}
    />
  )
}

type CommunityReportDialogContentProps = Omit<
  CommunityReportDialogProps,
  'open' | 'targetId'
>

function CommunityReportDialogContent({
  targetKind,
  pending,
  errorMessage,
  onClose,
  onSubmit,
}: CommunityReportDialogContentProps) {
  const id = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [reason, setReason] = useState('')
  const [validationMessage, setValidationMessage] = useState<string | null>(
    null,
  )

  useEffect(() => {
    const previousActiveElement =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const frame = requestAnimationFrame(() => {
      const textarea = textareaRef.current
      if (textarea && !textarea.disabled) {
        textarea.focus()
      } else {
        dialogRef.current?.focus()
      }
    })

    return () => {
      cancelAnimationFrame(frame)
      document.body.style.overflow = previousOverflow
      previousActiveElement?.focus()
    }
  }, [])

  useEffect(() => {
    if (pending) {
      dialogRef.current?.focus()
    }
  }, [pending])

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      if (!pending) {
        onClose()
      }
      return
    }

    if (event.key !== 'Tab' || !dialogRef.current) {
      return
    }

    const focusable = getFocusableElements(dialogRef.current)
    const currentIndex = focusable.indexOf(
      document.activeElement as HTMLElement,
    )
    const targetIndex = getDialogFocusTargetIndex(
      focusable.length,
      currentIndex,
      event.shiftKey ? 'backward' : 'forward',
    )

    event.preventDefault()
    if (targetIndex === null) {
      dialogRef.current.focus()
      return
    }

    focusable[targetIndex]?.focus()
  }

  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget && !pending) {
      onClose()
    }
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (pending) {
      return
    }

    const nextValidationMessage = validateCommunityReportReason(reason)
    setValidationMessage(nextValidationMessage)
    if (nextValidationMessage) {
      return
    }

    onSubmit(reason.trim())
  }

  const displayedMessage = validationMessage ?? errorMessage

  return (
    <Overlay onMouseDown={handleBackdropClick}>
      <Dialog
        ref={dialogRef}
        aria-describedby={`${id}-description`}
        aria-labelledby={`${id}-title`}
        aria-modal="true"
        role="dialog"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        onMouseDown={event => event.stopPropagation()}
      >
        <Header>
          <Title id={`${id}-title`}>
            {targetKind === 'POST' ? '게시글 신고' : '댓글 신고'}
          </Title>
          <Description id={`${id}-description`}>
            커뮤니티 운영 정책에 맞지 않는 이유를 알려 주세요.
          </Description>
        </Header>

        <Form onSubmit={handleSubmit}>
          <Field>
            <Label htmlFor={`${id}-reason`}>신고 사유</Label>
            <TextArea
              ref={textareaRef}
              id={`${id}-reason`}
              aria-invalid={Boolean(displayedMessage)}
              aria-describedby={
                displayedMessage ? `${id}-message` : `${id}-count`
              }
              disabled={pending}
              maxLength={500}
              value={reason}
              onChange={event => {
                setReason(event.target.value)
                if (validationMessage) {
                  setValidationMessage(null)
                }
              }}
            />
            <FieldMeta>
              {displayedMessage ? (
                <Message $error id={`${id}-message`} role="alert">
                  {displayedMessage}
                </Message>
              ) : (
                <span />
              )}
              <CharacterCount
                id={`${id}-count`}
                aria-live="polite"
              >{`${reason.length} / 500`}</CharacterCount>
            </FieldMeta>
          </Field>

          <Actions>
            <Button
              type="button"
              disabled={pending}
              onClick={() => {
                if (!pending) {
                  onClose()
                }
              }}
            >
              취소
            </Button>
            <Button $primary type="submit" disabled={pending}>
              {pending ? '신고 중' : '신고하기'}
            </Button>
          </Actions>
        </Form>
      </Dialog>
    </Overlay>
  )
}
