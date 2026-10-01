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
import {
  getDialogFocusableElements,
  getDialogFocusTargetIndex,
} from '@/lib/community/dialog-focus'
import {
  COMMUNITY_REPORT_REASON_MAX_LENGTH,
  COMMUNITY_REPORT_REASON_REQUIRING_DETAIL,
  COMMUNITY_REPORT_REASONS,
  composeCommunityReportReason,
  getCommunityReportDetailMaxLength,
  isCommunityReportReason,
  validateCommunityReportInput,
  validateCommunityReportReason,
  type CommunityReportInputError,
  type CommunityReportReason,
} from '@/lib/community/report-reason'
import type { CommunityId } from '@/types/community'

// 기존 import 경로(community-shared-ui.test.ts 등)를 지킨다. 정본은 dialog-focus.ts · report-reason.ts.
export { getDialogFocusTargetIndex, validateCommunityReportReason }

export type CommunityReportDialogProps = {
  open: boolean
  targetKind: 'POST' | 'COMMENT'
  targetId: CommunityId
  pending: boolean
  errorMessage: string | null
  onClose: () => void
  /** 고른 사유와 상세를 합친 문자열 하나(`[사유] 상세` 또는 `[사유]`). BE 계약 그대로다. */
  onSubmit: (reason: string) => void
}

/*
  커뮤니티 구간(DESIGN.md §8 피드형 화면 메모): <480 바텀시트, 그 이상 가운데 다이얼로그.
  레거시 640 은 쓰지 않는다. 포커스는 전역 :focus-visible 링 하나로 보인다 — 링을 끄는 곳은
  테두리가 파래지는 입력칸(textarea)뿐이다(§4 「Focus is one line」).
*/
const MOBILE = '@media (max-width: 479px)'

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  place-items: center;
  padding: 24px;
  background: var(--color-overlay);

  ${MOBILE} {
    align-items: end;
    padding: 0;
  }
`

const Dialog = styled.div`
  width: min(100%, 520px);
  max-height: calc(100dvh - 48px);
  display: grid;
  gap: 20px;
  padding: 24px;
  overflow-y: auto;
  overscroll-behavior: contain;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  box-shadow: var(--shadow-level-3);

  &:focus {
    outline: none;
  }

  ${MOBILE} {
    width: 100%;
    max-height: 85vh;
    max-height: 85dvh;
    padding: 24px 20px calc(24px + env(safe-area-inset-bottom, 0px));
    border-radius: var(--radius-sheet) var(--radius-sheet) 0 0;
  }
`

const Header = styled.header`
  display: grid;
  gap: 8px;
`

const Title = styled.h2`
  color: var(--color-text-900);
  font-size: 22px;
  font-weight: 700;
  line-height: 1.36;
`

const Description = styled.p`
  color: var(--color-text-500);
  font-size: 14px;
  line-height: 1.57;
`

const Form = styled.form`
  display: grid;
  gap: 20px;
`

const ReasonGroup = styled.fieldset`
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
`

const Legend = styled.legend`
  margin-bottom: 12px;
  padding: 0;
  color: var(--color-text-900);
  font-size: 16px;
  font-weight: 600;
  line-height: 1.5;
`

const ReasonList = styled.div`
  display: grid;
  gap: 8px;
`

/*
  선택은 색만으로 말하지 않는다: 네이티브 라디오의 점(모양) + 굵기 600 + 테두리가 함께 바뀐다.
  네이티브 라디오를 그대로 보여 줘서 ↑↓ 이동과 전역 포커스 링을 브라우저가 맡는다.
*/
const ReasonOption = styled.label<{ $selected: boolean; $disabled: boolean }>`
  min-height: 48px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border: 1px solid
    ${props =>
      props.$selected ? 'var(--color-primary-700)' : 'var(--color-border-200)'};
  border-radius: var(--radius-field);
  background: ${props =>
    props.$selected ? 'var(--color-primary-100)' : 'var(--color-surface)'};
  color: var(--color-text-900);
  font-size: 16px;
  font-weight: ${props => (props.$selected ? 600 : 400)};
  line-height: 1.5;
  cursor: ${props => (props.$disabled ? 'not-allowed' : 'pointer')};
  opacity: ${props =>
    props.$disabled ? 'var(--button-disabled-opacity-color)' : 1};

  input {
    width: 20px;
    height: 20px;
    flex: 0 0 auto;
    margin: 0;
    accent-color: var(--color-primary-700);
    cursor: inherit;
  }

  span {
    min-width: 0;
    overflow-wrap: anywhere;
  }
`

const Field = styled.div`
  display: grid;
  gap: 8px;
`

const Label = styled.label`
  color: var(--color-text-900);
  font-size: 14px;
  font-weight: 600;
  line-height: 1.57;
`

const TextArea = styled.textarea`
  width: 100%;
  min-height: 96px;
  padding: 12px 16px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-field);
  resize: vertical;
  background: var(--color-surface);
  color: var(--color-text-900);
  font: inherit;
  font-size: 14px;
  line-height: 1.57;
  /* 포커스 신호는 테두리 하나다 — 전역 :focus-visible 링을 끈다(DESIGN.md §Inputs & Forms). */
  &,
  &:focus,
  &:focus-visible {
    outline: none;
  }

  &:focus-visible {
    border-color: var(--color-primary-700);
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

const ReasonMessage = styled(Message)`
  margin-top: 8px;
`

const CharacterCount = styled.span<{ $over: boolean }>`
  margin-left: auto;
  color: ${props =>
    props.$over ? 'var(--color-negative-text)' : 'var(--color-text-caption)'};
  font-size: 12px;
  line-height: 1.5;
  white-space: nowrap;
`

const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;

  ${MOBILE} {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`

const Button = styled.button<{ $primary?: boolean }>`
  min-height: 48px;
  padding: 0 20px;
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

  // 닫으면 언마운트돼 고른 사유·상세·안내가 모두 초기화된다. 대상이 바뀌어도 key 로 새로 시작한다.
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
  const firstReasonRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [reason, setReason] = useState<CommunityReportReason | null>(null)
  const [detail, setDetail] = useState('')
  const [validationError, setValidationError] =
    useState<CommunityReportInputError | null>(null)

  useEffect(() => {
    const previousActiveElement =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    // 첫 포커스는 첫 사유 라디오다 — 입력칸으로 보내면 모바일 키보드가 사유 목록을 가린다.
    const frame = requestAnimationFrame(() => {
      const firstReason = firstReasonRef.current
      if (firstReason && !firstReason.disabled) {
        firstReason.focus()
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

    const focusable = getDialogFocusableElements(dialogRef.current)
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

    const nextError = validateCommunityReportInput({ reason, detail })
    setValidationError(nextError)
    if (nextError) {
      // 안내가 붙은 곳으로 포커스를 옮긴다. 사유 미선택이면 아무것도 골라져 있지 않으니 첫 라디오다.
      if (nextError.field === 'reason') {
        firstReasonRef.current?.focus()
      } else {
        textareaRef.current?.focus()
      }
      return
    }

    onSubmit(composeCommunityReportReason(reason, detail))
  }

  const detailRequired = reason === COMMUNITY_REPORT_REASON_REQUIRING_DETAIL
  const reasonError =
    validationError?.field === 'reason' ? validationError.message : null
  const detailError =
    validationError?.field === 'detail' ? validationError.message : null
  /*
    카운터는 실제로 보낼 합친 문자열의 길이다. 500자 한도와 CM-012 안내 문구가 「합친 값」 기준이라
    같은 수로 보여 줘야 「492자 썼는데 500자를 넘었다」 같은 어긋남이 없다.
  */
  const composedLength = composeCommunityReportReason(reason, detail).length

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

        <Form noValidate onSubmit={handleSubmit}>
          {/* aria-invalid 를 쓰려면 group 이 아니라 radiogroup 이어야 한다. 이름은 legend 그대로. */}
          <ReasonGroup
            aria-describedby={reasonError ? `${id}-reason-message` : undefined}
            aria-invalid={reasonError ? true : undefined}
            aria-labelledby={`${id}-reason-legend`}
            disabled={pending}
            role="radiogroup"
          >
            <Legend id={`${id}-reason-legend`}>신고 사유</Legend>
            <ReasonList>
              {COMMUNITY_REPORT_REASONS.map((label, index) => (
                <ReasonOption
                  key={label}
                  $disabled={pending}
                  $selected={reason === label}
                >
                  <input
                    ref={index === 0 ? firstReasonRef : undefined}
                    checked={reason === label}
                    name={`${id}-reason`}
                    type="radio"
                    value={label}
                    onChange={event => {
                      if (isCommunityReportReason(event.target.value)) {
                        setReason(event.target.value)
                        setValidationError(null)
                      }
                    }}
                  />
                  <span>{label}</span>
                </ReasonOption>
              ))}
            </ReasonList>
            {reasonError ? (
              <ReasonMessage $error id={`${id}-reason-message`} role="alert">
                {reasonError}
              </ReasonMessage>
            ) : null}
          </ReasonGroup>

          <Field>
            <Label htmlFor={`${id}-detail`}>
              {detailRequired ? '자세한 내용' : '자세한 내용(선택)'}
            </Label>
            <TextArea
              ref={textareaRef}
              id={`${id}-detail`}
              aria-invalid={Boolean(detailError)}
              aria-required={detailRequired ? true : undefined}
              aria-describedby={
                detailError ? `${id}-detail-message` : `${id}-count`
              }
              disabled={pending}
              maxLength={getCommunityReportDetailMaxLength(reason)}
              value={detail}
              onChange={event => {
                setDetail(event.target.value)
                if (validationError) {
                  setValidationError(null)
                }
              }}
            />
            <FieldMeta>
              {detailError ? (
                <Message $error id={`${id}-detail-message`} role="alert">
                  {detailError}
                </Message>
              ) : (
                <span />
              )}
              <CharacterCount
                $over={composedLength > COMMUNITY_REPORT_REASON_MAX_LENGTH}
                id={`${id}-count`}
                aria-live="polite"
              >{`${composedLength} / ${COMMUNITY_REPORT_REASON_MAX_LENGTH}`}</CharacterCount>
            </FieldMeta>
          </Field>

          {errorMessage ? (
            <Message $error role="alert">
              {errorMessage}
            </Message>
          ) : null}

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
