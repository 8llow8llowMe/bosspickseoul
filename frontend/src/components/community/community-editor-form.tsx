'use client'

import { useId, useRef, useState, type FormEvent } from 'react'
import styled from 'styled-components'
import CommunityLocationPicker, {
  type CommunityLocationValue,
} from '@/components/community/community-location-picker'
import { validateCommunityDraft } from '@/lib/community/community-state'
import {
  MAX_POST_IMAGES,
  POST_IMAGE_RULE_TEXT,
  selectPostImages,
} from '@/lib/community/post-images'
import { IMAGE_ACCEPT_ATTRIBUTE } from '@/lib/upload/image-rules'
import type { CommunityPostImage } from '@/types/community'

export type CommunityEditorMode = 'create' | 'edit'

export type CommunityEditorValue = {
  title: string
  content: string
  location: CommunityLocationValue
  /**
   * 저장 시점에 게시글에 **남길** 이미지 전부. 「이번에 추가한 것」이 아니다.
   *
   * 수정 화면은 기존 이미지를 여기에 그대로 담은 채 시작한다 — 백엔드가 이 목록에
   * 없는 기존 이미지를 파일까지 지우기 때문이다(`lib/community/post-images.ts`).
   */
  images: CommunityPostImage[]
}

export type CommunityEditorFormProps = {
  mode: CommunityEditorMode
  initialValue: CommunityEditorValue
  mockEnabled: boolean
  pending: boolean
  errorMessage: string | null
  onCancel: () => void
  onSubmit: (value: CommunityEditorValue) => void
  /**
   * 고른 파일을 올리고 **연결 가능한 키**로 바꿔 준다. 업로드는 게시글 저장과 별개
   * 단계라 폼이 직접 API 를 부르지 않고 호출부에서 받는다(mock 소스도 같은 자리를 쓴다).
   */
  onUploadImages: (files: File[]) => Promise<CommunityPostImage[]>
}

export const resolveCommunityEditorSubmission = (
  mode: CommunityEditorMode,
  title: string,
  content: string,
  location: CommunityLocationValue,
  images: CommunityPostImage[] = [],
): { error: string | null; value: CommunityEditorValue | null } => {
  const error = validateCommunityDraft(title, content)

  if (error) {
    return { error, value: null }
  }

  if (
    mode === 'create' &&
    (!location.targetType || !location.targetCode?.trim())
  ) {
    return { error: '지역을 선택해 주세요.', value: null }
  }

  return {
    error: null,
    value: {
      title: title.trim(),
      content: content.trim(),
      location,
      images,
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
  border-radius: var(--radius-field);
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
  border-radius: var(--radius-field);
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

const UploadButton = styled.button`
  width: fit-content;
  min-height: 48px;
  padding: 0 16px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-control);
  background: var(--color-surface);
  color: var(--color-text-900);
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;

  &:disabled {
    background: var(--color-surface-muted);
    color: var(--color-text-500);
    cursor: not-allowed;
  }
`

/** 파일 입력은 감추되 키보드·스크린리더 접근은 남긴다(`display: none` 이 아닌 이유). */
const HiddenFileInput = styled.input`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
`

const ThumbList = styled.ul`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 12px 0 0;
  padding: 0;
  list-style: none;
`

const Thumb = styled.li`
  position: relative;
  width: 96px;
  height: 96px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-control);
  overflow: hidden;
  background: var(--color-surface-muted);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
`

const ThumbRemove = styled.button`
  position: absolute;
  top: 4px;
  right: 4px;
  width: 24px;
  height: 24px;
  border: 0;
  border-radius: 50%;
  background: rgb(0 0 0 / 60%);
  color: #fff;
  font: inherit;
  font-size: 14px;
  line-height: 1;
  cursor: pointer;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
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
  onUploadImages,
}: CommunityEditorFormProps) {
  const id = useId()
  const [title, setTitle] = useState(initialValue.title)
  const [content, setContent] = useState(initialValue.content)
  const [location, setLocation] = useState(initialValue.location)
  /*
   * 수정 화면은 **기존 이미지를 담은 채** 시작한다. 빈 배열로 시작하면 사용자가 사진을
   * 건드리지 않아도 저장 순간 전부 삭제된다 — 백엔드가 이 목록에 없는 기존 이미지를
   * 파일까지 지우기 때문이다.
   */
  const [images, setImages] = useState<CommunityPostImage[]>(
    initialValue.images,
  )
  const [imageMessage, setImageMessage] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [validationMessage, setValidationMessage] = useState<string | null>(
    null,
  )

  const handleFilesPicked = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const picked = Array.from(event.target.files ?? [])
    // 같은 파일을 다시 골랐을 때도 onChange 가 나도록 값을 비운다.
    event.target.value = ''
    if (picked.length === 0) return

    const { accepted, error } = selectPostImages(picked, images.length)
    // 몇 장이 왜 빠졌는지 반드시 말한다 — 조용히 자르면 올라간 줄 알았던 사진이 없다.
    setImageMessage(error)
    if (accepted.length === 0) return

    setUploading(true)
    try {
      const uploaded = await onUploadImages(accepted)
      setImages(current => [
        ...current,
        ...uploaded.map((image, index) => ({
          ...image,
          sortOrder: current.length + index,
        })),
      ])
    } catch (error) {
      setImageMessage(
        error instanceof Error
          ? error.message
          : '이미지를 올리지 못했어요. 잠시 후 다시 시도해 주세요.',
      )
    } finally {
      setUploading(false)
    }
  }

  /*
   * 목록에서 빼기만 한다. 저장 전에는 **서버에 아무 요청도 보내지 않는다** — 취소하고
   * 나갈 수 있어야 하는데 미리 지우면 되돌릴 수 없다. 저장 시 `imageKeys` 에서 빠지는
   * 것으로 실제 삭제가 일어난다. (연결 안 된 키는 고아로 남지만, 그건 백엔드 회수
   * 배치의 몫이다 — `file-upload-guide.md` "알려진 한계".)
   */
  const handleRemoveImage = (imageKey: string) => {
    setImageMessage(null)
    setImages(current =>
      current
        .filter(image => image.imageKey !== imageKey)
        .map((image, index) => ({ ...image, sortOrder: index })),
    )
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (pending) {
      return
    }

    const result = resolveCommunityEditorSubmission(
      mode,
      title,
      content,
      location,
      images,
    )

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
        <Label as="p">지역·상권 {mode === 'create' ? '(필수)' : null}</Label>
        <CommunityLocationPicker
          value={location}
          mockEnabled={mockEnabled}
          disabled={mode === 'edit'}
          onChange={setLocation}
        />
        {mode === 'create' ? (
          <Helper>게시글을 작성하려면 지역을 선택해 주세요.</Helper>
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
        <LabelRow>
          <Label as="p">이미지 첨부</Label>
          <Counter aria-live="polite">
            {images.length} / {MAX_POST_IMAGES}
          </Counter>
        </LabelRow>

        <HiddenFileInput
          ref={fileInputRef}
          type="file"
          multiple
          accept={IMAGE_ACCEPT_ATTRIBUTE}
          disabled={pending || uploading || images.length >= MAX_POST_IMAGES}
          onChange={handleFilesPicked}
          aria-label="첨부할 이미지 파일 선택"
        />
        <UploadButton
          type="button"
          disabled={pending || uploading || images.length >= MAX_POST_IMAGES}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? '올리는 중' : '이미지 첨부'}
        </UploadButton>

        {images.length > 0 ? (
          <ThumbList>
            {images.map((image, index) => (
              <Thumb key={image.imageKey}>
                {/*
                  MinIO 공개 URL 이라 Next 이미지 최적화 대상이 아니다. 원격 호스트를
                  `next.config` 에 등록하지 않으면 `next/image` 는 런타임에 실패한다.
                */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.imageUrl} alt={`첨부 이미지 ${index + 1}`} />
                <ThumbRemove
                  type="button"
                  disabled={pending || uploading}
                  onClick={() => handleRemoveImage(image.imageKey)}
                  aria-label={`첨부 이미지 ${index + 1} 빼기`}
                >
                  ×
                </ThumbRemove>
              </Thumb>
            ))}
          </ThumbList>
        ) : null}

        <Helper>{POST_IMAGE_RULE_TEXT}</Helper>
        {imageMessage ? <Message role="alert">{imageMessage}</Message> : null}
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
