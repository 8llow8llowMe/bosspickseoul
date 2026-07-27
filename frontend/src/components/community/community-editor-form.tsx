'use client'

import { useId, useState, type FormEvent } from 'react'
import styled from 'styled-components'
import CommunityLocationPicker, {
  type CommunityLocationValue,
} from '@/components/community/community-location-picker'
import { validateCommunityDraft } from '@/lib/community/community-state'

export type CommunityEditorMode = 'create' | 'edit'

export type CommunityEditorValue = {
  title: string
  content: string
  location: CommunityLocationValue
}

export type CommunityEditorFormProps = {
  mode: CommunityEditorMode
  initialValue: CommunityEditorValue
  mockEnabled: boolean
  pending: boolean
  errorMessage: string | null
  onCancel: () => void
  onSubmit: (value: CommunityEditorValue) => void
}

export const resolveCommunityEditorSubmission = (
  title: string,
  content: string,
  location: CommunityLocationValue,
): { error: string | null; value: CommunityEditorValue | null } => {
  const error = validateCommunityDraft(title, content)

  if (error) {
    return { error, value: null }
  }

  return {
    error: null,
    value: {
      title: title.trim(),
      content: content.trim(),
      location,
    },
  }
}

const Form = styled.form`
  display: grid;
  gap: 26px;
  padding: 28px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  box-shadow: var(--shadow-level-1);

  @media (max-width: 640px) {
    gap: 22px;
    padding: 22px 18px;
  }
`

const Field = styled.div`
  display: grid;
  gap: 10px;
`

const LabelRow = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
`

const Label = styled.label`
  color: var(--color-text-900);
  font-size: 15px;
  font-weight: 700;
`

const Counter = styled.span`
  color: var(--color-text-500);
  font-size: 13px;
  font-variant-numeric: tabular-nums;
`

const Input = styled.input`
  width: 100%;
  min-height: 52px;
  padding: 0 16px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-control);
  background: var(--color-surface);
  color: var(--color-text-900);
  font: inherit;
  outline: none;

  &:focus-visible {
    border-color: var(--color-primary-600);
    box-shadow: var(--shadow-focus-primary-strong);
  }
`

const TextArea = styled.textarea`
  width: 100%;
  min-height: 320px;
  padding: 16px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-control);
  resize: vertical;
  background: var(--color-surface);
  color: var(--color-text-900);
  font: inherit;
  line-height: 1.75;
  outline: none;

  &:focus-visible {
    border-color: var(--color-primary-600);
    box-shadow: var(--shadow-focus-primary-strong);
  }

  @media (max-width: 640px) {
    min-height: 280px;
  }
`

const Helper = styled.p`
  color: var(--color-text-500);
  font-size: 13px;
  line-height: 1.65;
`

const DisabledUpload = styled.button`
  width: fit-content;
  min-height: 48px;
  padding: 0 16px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-control);
  background: var(--color-surface-muted);
  color: var(--color-text-500);
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  cursor: not-allowed;
`

const Message = styled.p`
  padding: 14px 16px;
  border-radius: var(--radius-control);
  background: color-mix(in srgb, var(--color-danger) 10%, transparent);
  color: var(--color-danger);
  font-size: 14px;
  line-height: 1.6;
`

const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;

  @media (max-width: 640px) {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
`

const ActionButton = styled.button<{ $primary?: boolean }>`
  min-height: 50px;
  padding: 0 20px;
  border: 1px solid
    ${props =>
      props.$primary ? 'var(--color-primary-700)' : 'var(--color-border-200)'};
  border-radius: var(--radius-control);
  background: ${props =>
    props.$primary ? 'var(--color-primary-700)' : 'var(--color-surface)'};
  color: ${props =>
    props.$primary ? 'var(--color-surface)' : 'var(--color-text-700)'};
  font: inherit;
  font-size: 15px;
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

export default function CommunityEditorForm({
  mode,
  initialValue,
  mockEnabled,
  pending,
  errorMessage,
  onCancel,
  onSubmit,
}: CommunityEditorFormProps) {
  const id = useId()
  const [title, setTitle] = useState(initialValue.title)
  const [content, setContent] = useState(initialValue.content)
  const [location, setLocation] = useState(initialValue.location)
  const [validationMessage, setValidationMessage] = useState<string | null>(
    null,
  )

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (pending) {
      return
    }

    const result = resolveCommunityEditorSubmission(title, content, location)

    if (result.error || !result.value) {
      setValidationMessage(result.error)
      return
    }

    setValidationMessage(null)
    onSubmit(result.value)
  }

  const visibleMessage = validationMessage ?? errorMessage

  return (
    <Form
      aria-busy={pending}
      data-community-editor-form="true"
      noValidate
      onSubmit={handleSubmit}
    >
      <Field>
        <Label as="p">지역·상권 (선택)</Label>
        <CommunityLocationPicker
          value={location}
          mockEnabled={mockEnabled}
          disabled={mode === 'edit'}
          onChange={setLocation}
        />
        {mode === 'create' ? (
          <Helper>
            지역을 선택하면 같은 상권에 관심 있는 사장님이 글을 찾기 쉬워요.
          </Helper>
        ) : null}
      </Field>

      <Field>
        <LabelRow>
          <Label htmlFor={`${id}-title`}>제목</Label>
          <Counter aria-live="polite">
            {title.length.toLocaleString('ko-KR')} / 120
          </Counter>
        </LabelRow>
        <Input
          id={`${id}-title`}
          maxLength={120}
          value={title}
          disabled={pending}
          placeholder="함께 나누고 싶은 이야기를 적어 주세요"
          onChange={event => setTitle(event.target.value)}
        />
      </Field>

      <Field>
        <LabelRow>
          <Label htmlFor={`${id}-content`}>내용</Label>
          <Counter aria-live="polite">
            {content.length.toLocaleString('ko-KR')} / 5,000
          </Counter>
        </LabelRow>
        <TextArea
          id={`${id}-content`}
          maxLength={5000}
          value={content}
          disabled={pending}
          placeholder="운영 경험이나 궁금한 점을 구체적으로 들려주세요."
          onChange={event => setContent(event.target.value)}
        />
      </Field>

      <Field>
        <Label as="p">이미지 첨부</Label>
        <DisabledUpload type="button" disabled>
          이미지 첨부 · 준비 중
        </DisabledUpload>
        <Helper>이미지 첨부 기능은 준비 중이에요.</Helper>
      </Field>

      {visibleMessage ? <Message role="alert">{visibleMessage}</Message> : null}

      <Actions>
        <ActionButton type="button" disabled={pending} onClick={onCancel}>
          취소
        </ActionButton>
        <ActionButton $primary type="submit" disabled={pending}>
          {pending ? '저장 중' : mode === 'edit' ? '수정하기' : '게시하기'}
        </ActionButton>
      </Actions>
    </Form>
  )
}
