'use client'

import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { Circle, CircleCheck, ImagePlus, Loader2, Plus, X } from 'lucide-react'
import styled, { css, keyframes } from 'styled-components'
import CommunityRegionSheet, {
  type CommunityRegionSheetHandle,
} from '@/components/community/community-region-sheet'
import { useBeforeUnloadGuard } from '@/hooks/use-before-unload-guard'
import { useCommunityDraftAutosave } from '@/hooks/use-community-draft-autosave'
import type { CommunityLocationValue } from '@/lib/community/community-location'
import {
  COMMUNITY_CONTENT_MAX_LENGTH,
  COMMUNITY_EDITOR_READY_MESSAGE,
  COMMUNITY_TITLE_MAX_LENGTH,
  COMMUNITY_WRITING_PROMPTS,
  getCommunityEditorChecklist,
  getCommunityWritingPromptCaret,
  isCommunityCountNearLimit,
  isCommunityEditorChecklistReady,
  resolveCommunityEditorSubmission,
  shouldShowCommunityWritingPrompts,
  type CommunityEditorCheckId,
  type CommunityEditorField,
  type CommunityEditorMode,
  type CommunityEditorValue,
} from '@/lib/community/editor-compose'
import { isCommunityEditorDirty } from '@/lib/community/editor-draft'
import {
  communityOutlinedField,
  communityUnderlineField,
} from '@/lib/community/field-styles'
import {
  MAX_POST_IMAGES,
  POST_IMAGE_RULE_TEXT,
  selectPostImages,
} from '@/lib/community/post-images'
import { IMAGE_ACCEPT_ATTRIBUTE } from '@/lib/upload/image-rules'
import type { CommunityPostImage } from '@/types/community'

export {
  resolveCommunityEditorSubmission,
  type CommunityEditorMode,
  type CommunityEditorValue,
}

/** ✕ · 취소 확인(CM-035). 임시 저장이 켜져 있을 때만 「저장돼요」라고 말한다. */
export const COMMUNITY_EDITOR_LEAVE_CONFIRM =
  '작성 중인 글은 임시 저장돼요. 나갈까요?'
/** 비교 초안으로 들어온 글은 임시 저장하지 않는다 — 그 말을 하면 거짓이 된다. */
export const COMMUNITY_EDITOR_LEAVE_CONFIRM_UNSAVED =
  '작성 중인 글이 저장되지 않아요. 나갈까요?'
/**
 * 사진 업로드 중 등록 — 막되 비활성 대신 누르면 말한다(§S4 「등록 버튼」 원칙). 그대로 보내면 올리던
 * 사진이 `imageKeys` 에 빠진 채 글이 저장된다.
 */
export const COMMUNITY_EDITOR_UPLOADING_NOTICE =
  '사진을 올리는 중이에요. 끝나면 다시 눌러 주세요.'

/**
 * 제목 칸의 Enter 를 본문으로 넘길까. 한 줄 입력의 Enter 는 폼을 제출하는데, 제목만 쓰고 Enter 로
 * 글이 올라가면 안 된다. **한글 조합 중 Enter(`isComposing` · keyCode 229)는 건드리지 않는다** —
 * 조합을 확정하는 키라 가로채면 마지막 글자가 깨지거나 두 번 들어간다.
 */
export const shouldMoveFromTitleOnEnter = (event: {
  key: string
  keyCode?: number
  isComposing?: boolean
  shiftKey?: boolean
  altKey?: boolean
  ctrlKey?: boolean
  metaKey?: boolean
}) =>
  event.key === 'Enter' &&
  !event.isComposing &&
  event.keyCode !== 229 &&
  !event.shiftKey &&
  !event.altKey &&
  !event.ctrlKey &&
  !event.metaKey

export type CommunityEditorFormProps = {
  mode: CommunityEditorMode
  initialValue: CommunityEditorValue
  /**
   * 이탈 확인·임시 저장이 「바뀌었다」를 재는 기준. 없으면 `initialValue` 다.
   * 이어 쓰기는 저장본으로 시작하지만 기준은 원래 값(빈 글·수정 원본)이라 처음부터 dirty 다.
   */
  pristineValue?: CommunityEditorValue
  mockEnabled: boolean
  pending: boolean
  errorMessage: string | null
  /** 임시 저장 키. `null` 이면 저장하지 않는다(비교 초안 진입). */
  draftStorageKey?: string | null
  /** 등록·수정이 성공해 이동하는 중. 등록 버튼·임시 저장·이탈 확인을 멈춘다(중복 글 방지). */
  submitted?: boolean
  /** 「이어 쓰기」로 시작했다 — 이 키에 저장본이 이미 있다(원래 값으로 되돌리면 지운다). */
  restoredFromDraft?: boolean
  /** 머리 아래 안내(비교 초안 실패 Notice). */
  notice?: ReactNode
  onCancel: () => void
  onSubmit: (value: CommunityEditorValue) => void
  /**
   * 고른 파일을 올리고 **연결 가능한 키**로 바꿔 준다. 업로드는 게시글 저장과 별개
   * 단계라 폼이 직접 API 를 부르지 않고 호출부에서 받는다(mock 소스도 같은 자리를 쓴다).
   */
  onUploadImages: (files: File[]) => Promise<CommunityPostImage[]>
}

const MOBILE = '@media (max-width: 479px)'
const TABLET_UP = '@media (min-width: 480px)'
const DESKTOP_WIDE = '@media (min-width: 1080px)'

/* 사이트 헤더(site-header.tsx)는 sticky top:0, 높이 64 다 — 편집 바를 그 아래에 붙인다. */
const SITE_HEADER_HEIGHT = 64

/* 폼 열은 `--w-form` 상한, ≥1080 은 오른쪽에 작성 체크 280. 전체는 페이지가 `--w-wide` 로 묶는다. */
const Shell = styled.div`
  display: grid;
  grid-template-columns: minmax(0, var(--w-form));
  justify-content: center;
  align-items: start;
  gap: 24px;

  ${DESKTOP_WIDE} {
    grid-template-columns: minmax(0, var(--w-form)) 280px;
  }
`

const Form = styled.form`
  min-width: 0;
  display: grid;
  gap: 24px;

  ${MOBILE} {
    gap: 20px;
  }
`

/* `<480` 머리 — 사이트 헤더 아래에 붙는 편집 바 `[✕] 새 글 [등록]`. 셸 거터까지 꽉 채운다. */
const MobileBar = styled.div`
  display: none;

  ${MOBILE} {
    position: sticky;
    z-index: 10;
    top: ${SITE_HEADER_HEIGHT}px;
    min-height: 56px;
    display: grid;
    grid-template-columns: 44px minmax(0, 1fr) auto;
    align-items: center;
    gap: 8px;
    margin: 0 calc(var(--shell-gutter) * -1);
    padding: 0 calc(var(--shell-gutter) - 8px) 0 4px;
    border-bottom: 1px solid var(--color-border-200);
    background: var(--color-surface);
  }
`

const IconButton = styled.button`
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: var(--radius-control);
  background: transparent;
  color: var(--color-text-900);
  cursor: pointer;

  &:disabled {
    cursor: not-allowed;
    opacity: var(--button-disabled-opacity-color);
  }
`

const BarTitle = styled.h1`
  min-width: 0;
  overflow: hidden;
  color: var(--color-text-900);
  font-size: 16px;
  font-weight: 700;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const PrimaryButton = styled.button`
  min-height: 48px;
  padding: 0 20px;
  border: 0;
  border-radius: var(--radius-control);
  background: var(--color-fill-primary-text);
  color: var(--color-surface);
  font: inherit;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;

  &:disabled {
    cursor: not-allowed;
    opacity: var(--button-disabled-opacity-color);
  }
`

const BarSubmit = styled(PrimaryButton)`
  min-height: 44px;
  padding: 0 16px;
`

const SecondaryButton = styled.button`
  min-height: 48px;
  padding: 0 20px;
  border: 0;
  border-radius: var(--radius-control);
  background: var(--color-grey-100);
  color: var(--color-text-900);
  font: inherit;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;

  &:disabled {
    cursor: not-allowed;
    opacity: var(--button-disabled-opacity-color);
  }
`

/* `≥480` 머리 — 제목 한 줄. `<480` 은 편집 바가 대신한다(둘 중 하나만 보여 h1 이 겹치지 않는다). */
const Heading = styled.h1`
  color: var(--color-text-900);
  font-size: 26px;
  font-weight: 700;
  line-height: 1.3;

  ${MOBILE} {
    display: none;
  }
`

const Field = styled.div`
  min-width: 0;
  display: grid;
  gap: 8px;
`

/* 제목·본문은 placeholder 가 말하지만 placeholder 는 이름이 아니다 — 숨긴 label 을 둔다. */
const HiddenLabel = styled.label`
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

const MetaRow = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
`

const SectionLabel = styled.p`
  color: var(--color-text-900);
  font-size: 14px;
  font-weight: 600;
`

const Counter = styled.span<{ $near: boolean }>`
  margin-left: auto;
  color: ${props =>
    props.$near ? 'var(--color-negative-text)' : 'var(--color-text-caption)'};
  font-size: 13px;
  font-variant-numeric: tabular-nums;
`

const FieldError = styled.p`
  color: var(--color-negative-text);
  font-size: 13px;
  line-height: 1.5;
`

const Caption = styled.p`
  color: var(--color-text-caption);
  font-size: 13px;
  line-height: 1.5;
`

/*
  제목 — 테두리 없는 큰 입력(20/600). 아래 한 줄이 칸을 나누고, 포커스·오류 때 그 한 줄만
  색이 바뀐다(DESIGN.md §4 「Focus is one line」). 2px 로 보이게 안쪽 1px 를 덧대 자리 이동은 없다.
*/
const TitleInput = styled.input`
  width: 100%;
  min-height: 56px;
  padding: 12px 0;
  border: 0;
  border-bottom: 1px solid var(--color-border-200);
  border-radius: 0;
  background: transparent;
  color: var(--color-text-900);
  font: inherit;
  font-size: 20px;
  font-weight: 600;
  line-height: 1.4;

  &::placeholder {
    color: var(--color-placeholder);
  }

  ${communityUnderlineField}
`

/*
  본문 — 내용에 맞춰 늘어나는 입력칸(최소 8줄). `field-sizing: content` 가 되는 브라우저는
  CSS 만으로, 아니면 scrollHeight 로 높이를 맞춘다. 스크롤 없이 페이지가 같이 늘어난다.
*/
const BODY_MIN_LINES = 8

const ContentTextArea = styled.textarea`
  width: 100%;
  min-height: calc(${BODY_MIN_LINES} * 1.75em + 32px);
  padding: 16px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-field);
  overflow: hidden;
  field-sizing: content;
  background: var(--color-surface);
  color: var(--color-text-900);
  font: inherit;
  font-size: 16px;
  line-height: 1.75;

  &::placeholder {
    color: var(--color-placeholder);
  }

  /* 포커스·오류·크기 — 커뮤니티 입력칸 공통 조각(안쪽 한 줄, 글로우 없음, resize none). */
  ${communityOutlinedField}
`

const PromptGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`

const PromptChip = styled.button`
  min-height: 44px;
  padding: 0 16px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-pill);
  background: var(--color-surface);
  color: var(--color-text-700);
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    background: var(--color-background-muted);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: var(--button-disabled-opacity-color);
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

/*
  사진 칸 머리의 `n / 5`. `≥480` 은 드롭존이 같은 수를 들고 있어 두 번 적지 않는다.
*/
const PhotoCount = styled(Counter)`
  ${TABLET_UP} {
    display: none;
  }
`

/*
  사진 드롭존(`≥480`, community.md §S4 「다듬기」). `+` 타일 대신 넓은 점선 영역이다 — 눌러서 고르고,
  끌어다 놓아도 된다. 버튼이라 키보드로 누를 수 있고 포커스는 전역 링 그대로다. 안쪽 글자·아이콘은
  포인터를 받지 않는다 — 자식 사이를 지날 때 dragleave 가 나 강조가 깜빡이지 않게.
  가득 찼거나 올리는 중이면 aria-disabled 다(비활성으로 두지 않아 작성 체크가 포커스를 옮길 수 있다).
*/
const Dropzone = styled.button`
  display: none;

  ${TABLET_UP} {
    width: 100%;
    display: grid;
    justify-items: center;
    gap: 4px;
    padding: 24px 16px;
    border: 1px dashed var(--color-border-300);
    border-radius: var(--radius-field);
    background: var(--color-surface);
    color: var(--color-text-700);
    font: inherit;
    text-align: center;
    cursor: pointer;
    transition:
      background-color var(--motion-fast) var(--ease-standard),
      border-color var(--motion-fast) var(--ease-standard);
  }

  > * {
    pointer-events: none;
  }

  svg {
    color: var(--color-text-caption);
  }

  &:hover {
    background: var(--color-background-muted);
  }

  &[data-drag-active='true'] {
    border-color: var(--color-primary-700);
    background: var(--color-primary-100);

    svg {
      color: var(--color-text-primary-on-light);
    }
  }

  &[aria-disabled='true'],
  &:disabled {
    background: var(--color-background-muted);
    cursor: not-allowed;
  }

  &:disabled {
    opacity: var(--button-disabled-opacity-color);
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

const DropzoneTitle = styled.span`
  color: var(--color-text-900);
  font-size: 14px;
  font-weight: 600;
  line-height: 1.5;
  word-break: keep-all;
`

const DropzoneMeta = styled.span`
  color: var(--color-text-caption);
  font-size: 13px;
  line-height: 1.5;
  word-break: keep-all;
`

const DropzoneCount = styled(DropzoneMeta)`
  font-variant-numeric: tabular-nums;
`

/*
  썸네일 가로 줄(72). 넘치면 가로로 민다 — 위아래 4px 는 포커스 링이 잘리지 않을 자리다.
  `≥480` 은 드롭존 아래에 올린 사진만 둔다 — 아직 한 장도 없으면 빈 줄을 그리지 않는다.
*/
const PhotoRow = styled.ul`
  display: flex;
  gap: 8px;
  margin: 0;
  padding: 4px;
  overflow-x: auto;
  list-style: none;

  ${TABLET_UP} {
    &[data-empty='true'] {
      display: none;
    }
  }
`

/* `<480` 의 `+` 타일 자리. `≥480` 은 드롭존이 맡는다. */
const AddPhotoItem = styled.li`
  ${TABLET_UP} {
    display: none;
  }
`

/* 규칙 한 줄. `≥480` 은 드롭존 안에 같은 줄이 있다. */
const PhotoRuleCaption = styled(Caption)`
  ${TABLET_UP} {
    display: none;
  }
`

const PHOTO_SIZE = 72

const PhotoTile = styled.li`
  position: relative;
  width: ${PHOTO_SIZE}px;
  height: ${PHOTO_SIZE}px;
  flex: 0 0 auto;

  img {
    width: 100%;
    height: 100%;
    display: block;
    border: 1px solid var(--color-border-200);
    border-radius: var(--radius-control);
    background: var(--color-surface-muted);
    object-fit: cover;
  }
`

/* 첫 장이 목록 썸네일이 된다는 것을 알린다. */
const CoverBadge = styled.span`
  position: absolute;
  bottom: 4px;
  left: 4px;
  padding: 0 4px;
  border-radius: var(--radius-compact);
  background: var(--color-grey-900);
  color: var(--color-surface);
  font-size: 12px;
  font-weight: 600;
  line-height: 20px;
`

/* 보이는 원은 24 지만 누르는 자리는 44 다(DESIGN.md §8 Touch Targets). */
const PhotoRemove = styled.button`
  position: absolute;
  top: 0;
  right: 0;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  padding: 4px;
  border: 0;
  border-radius: var(--radius-control);
  background: transparent;
  cursor: pointer;

  span {
    width: 24px;
    height: 24px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-pill);
    background: var(--color-grey-900);
    color: var(--color-surface);
  }

  /* 타일 안쪽으로 링을 그린다 — 가로 줄의 스크롤 영역이 바깥 링을 자른다. */
  &:focus-visible {
    outline-offset: -2px;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: var(--button-disabled-opacity-color);
  }
`

const AddPhotoButton = styled.button`
  width: ${PHOTO_SIZE}px;
  height: ${PHOTO_SIZE}px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px dashed var(--color-border-300);
  border-radius: var(--radius-control);
  background: var(--color-surface);
  color: var(--color-text-600);
  cursor: pointer;

  &:disabled {
    cursor: not-allowed;
    opacity: var(--button-disabled-opacity-color);
  }
`

const spin = keyframes`
  to {
    transform: rotate(360deg);
  }
`

const UploadingTile = styled.li`
  width: ${PHOTO_SIZE}px;
  height: ${PHOTO_SIZE}px;
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-control);
  background: var(--color-surface-muted);
  color: var(--color-text-600);

  svg {
    animation: ${spin} 1s linear infinite;
  }

  @media (prefers-reduced-motion: reduce) {
    svg {
      animation: none;
    }
  }
`

const Message = styled.p`
  padding: 12px 16px;
  border-radius: var(--radius-control);
  background: color-mix(in srgb, var(--color-danger) 10%, transparent);
  color: var(--color-negative-text);
  font-size: 14px;
  line-height: 1.6;
`

/* `≥480` 하단에 붙는 액션 바 `[취소] [등록하기]`(DESIGN.md §8 Sticky bottom CTA with safe area). */
const ActionBar = styled.div`
  position: sticky;
  z-index: 10;
  bottom: 0;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 0 calc(12px + env(safe-area-inset-bottom, 0px));
  border-top: 1px solid var(--color-border-200);
  background: var(--color-surface);

  ${MOBILE} {
    display: none;
  }
`

/*
  작성 체크 — ≥1080 에서만(community.md §S4 「다듬기」). 그 아래 폭은 display:none 이라 스크린리더에도
  읽히지 않는다. 사이트 헤더(64) 아래 24 에 붙는다.
*/
const Checklist = styled.aside`
  display: none;

  ${DESKTOP_WIDE} {
    position: sticky;
    top: ${SITE_HEADER_HEIGHT + 24}px;
    display: grid;
    gap: 16px;
    padding: 20px;
    border: 1px solid var(--color-border-200);
    border-radius: var(--radius-card);
    background: var(--color-surface);
  }

  h2 {
    color: var(--color-text-900);
    font-size: 16px;
    font-weight: 700;
  }
`

const CheckItems = styled.ul`
  display: grid;
  margin: 0 -8px;
  padding: 0;
  list-style: none;
`

/*
  한 칸 = 그 입력칸으로 가는 버튼(44). 켜짐은 색만이 아니라 **모양**(빈 원 ↔ 체크 원)과 숨긴 글자
  (`완료` · `남음`)로도 말한다. 빈 원은 caption(grey600, 흰 바탕 4.62)이라 꺼져 있어도 보인다.
*/
const checkRow = css`
  width: 100%;
  min-height: 44px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 8px;
  border: 0;
  border-radius: var(--radius-control);
  background: transparent;
  color: var(--color-text-700);
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  text-align: left;

  svg {
    flex: 0 0 auto;
    color: var(--color-text-caption);
  }

  &[data-done='true'] {
    color: var(--color-text-900);

    svg {
      color: var(--color-text-primary-on-light);
    }
  }
`

const CheckButton = styled.button`
  ${checkRow}
  cursor: pointer;

  &:hover {
    background: var(--color-background-muted);
  }
`

/* 수정 모드의 지역 — 바꿀 수 없어 갈 칸이 없다. 버튼이 아니라 글자다. */
const CheckStatic = styled.div`
  ${checkRow}
`

const CheckOptional = styled.span`
  color: var(--color-text-caption);
  font-size: 12px;
  font-weight: 400;
`

const CheckSummary = styled.p<{ $ready: boolean }>`
  color: ${props =>
    props.$ready
      ? 'var(--color-text-primary-on-light)'
      : 'var(--color-text-caption)'};
  font-size: 14px;
  font-weight: ${props => (props.$ready ? 700 : 400)};
  line-height: 1.5;
`

const TipBlock = styled.div`
  display: grid;
  gap: 8px;
  padding-top: 16px;
  border-top: 1px solid var(--color-border-200);

  h3 {
    color: var(--color-text-900);
    font-size: 14px;
    font-weight: 700;
  }

  ul {
    display: grid;
    gap: 4px;
    margin: 0;
    padding: 0;
  }

  li {
    color: var(--color-text-700);
    font-size: 13px;
    line-height: 1.5;
    word-break: keep-all;
  }
`

const VisuallyHidden = styled.span`
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

/** 작성 팁 — 작성 체크 아래 짧은 3줄(community.md §S4 「다듬기」). 친구에게 말하듯. */
export const COMMUNITY_EDITOR_TIPS = [
  '어느 동네, 어떤 가게인지 먼저 적어 주세요.',
  '월세·손님 수처럼 숫자가 있으면 더 잘 통해요.',
  '궁금한 건 하나로 좁혀 주세요.',
] as const

/** 드롭존이 가득 찼을 때 — 비활성 대신 무엇을 하면 되는지 말한다. */
export const COMMUNITY_EDITOR_DROPZONE_FULL = `사진은 ${MAX_POST_IMAGES}장까지예요. 빼고 나서 다시 추가해 주세요.`
export const COMMUNITY_EDITOR_DROPZONE_LABEL =
  '사진을 끌어다 놓거나 눌러서 추가해 주세요'

/** 끌고 온 것이 파일인가. 글자·링크를 끌 때는 드롭존이 반응하지 않는다. */
const isFileDrag = (event: DragEvent<HTMLElement>) =>
  Array.from(event.dataTransfer?.types ?? []).includes('Files')

/** 머리 한 줄 — 편집 바(`<480`)와 페이지 제목(`≥480`)이 같은 말을 쓴다. */
export const getCommunityEditorHeading = (mode: CommunityEditorMode) =>
  mode === 'edit' ? '글 수정' : '새 글'

export default function CommunityEditorForm({
  mode,
  initialValue,
  pristineValue,
  mockEnabled,
  pending,
  errorMessage,
  draftStorageKey = null,
  submitted = false,
  restoredFromDraft = false,
  notice,
  onCancel,
  onSubmit,
  onUploadImages,
}: CommunityEditorFormProps) {
  const id = useId()
  const [title, setTitle] = useState(initialValue.title)
  const [content, setContent] = useState(initialValue.content)
  const [location, setLocation] = useState<CommunityLocationValue>(
    initialValue.location,
  )
  /*
   * 수정 화면은 **기존 이미지를 담은 채** 시작한다. 빈 배열로 시작하면 사용자가 사진을
   * 건드리지 않아도 저장 순간 전부 삭제된다 — 백엔드가 이 목록에 없는 기존 이미지를
   * 파일까지 지우기 때문이다.
   */
  const [images, setImages] = useState<CommunityPostImage[]>(
    initialValue.images,
  )
  const [imageMessage, setImageMessage] = useState<string | null>(null)
  const [uploadingCount, setUploadingCount] = useState(0)
  /* 업로드 중 등록을 눌렀다. 업로드가 끝나면(uploadingCount 0) 안내도 걷힌다. */
  const [uploadWaitAsked, setUploadWaitAsked] = useState(false)
  const [fieldError, setFieldError] = useState<{
    field: CommunityEditorField
    message: string
  } | null>(null)
  const regionRef = useRef<CommunityRegionSheetHandle>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const contentRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropzoneRef = useRef<HTMLButtonElement>(null)
  const pendingCaretRef = useRef<number | null>(null)
  /* 파일을 끌어 드롭존 위에 올려 둔 동안 — 점선을 파랗게 칠한다. */
  const [dragActive, setDragActive] = useState(false)

  const uploading = uploadingCount > 0
  /* 저장 요청 중이거나 이미 성공해 이동하는 중 — 다시 보내면 같은 글이 또 생긴다. */
  const submitLocked = pending || submitted
  const current: CommunityEditorValue = { title, content, location, images }
  const dirty = isCommunityEditorDirty(pristineValue ?? initialValue, current)

  useCommunityDraftAutosave({
    storageKey: draftStorageKey,
    value: { title, content, location },
    dirty,
    pending,
    submitted,
    startedFromStored: restoredFromDraft,
  })
  useBeforeUnloadGuard(dirty && !submitted)

  /*
   * 본문 높이·커서. 도움 칩으로 틀을 넣으면 그 칩이 사라지므로 포커스를 본문으로 옮기고 커서를
   * 첫 줄 끝에 둔다. `field-sizing` 이 없는 브라우저는 여기서 scrollHeight 로 높이를 맞춘다.
   */
  useLayoutEffect(() => {
    const textarea = contentRef.current
    if (!textarea) {
      return
    }

    const supportsFieldSizing =
      typeof CSS !== 'undefined' &&
      typeof CSS.supports === 'function' &&
      CSS.supports('field-sizing', 'content')

    if (!supportsFieldSizing) {
      textarea.style.height = 'auto'
      textarea.style.height = `${
        textarea.scrollHeight + textarea.offsetHeight - textarea.clientHeight
      }px`
    }

    const caret = pendingCaretRef.current
    if (caret === null) {
      return
    }

    pendingCaretRef.current = null
    textarea.focus()
    textarea.setSelectionRange(caret, caret)
  }, [content])

  const clearFieldError = (field: CommunityEditorField) => {
    setFieldError(error => (error?.field === field ? null : error))
  }

  /*
   * 고르든(파일 창) 끌어다 놓든(드롭존) 같은 길이다 — 장수·형식·용량 규칙(`selectPostImages`)과
   * 업로드·안내가 하나라서 두 입구가 다르게 굴지 않는다.
   */
  const addFiles = async (picked: File[]) => {
    if (picked.length === 0) return

    const { accepted, error } = selectPostImages(picked, images.length)
    // 몇 장이 왜 빠졌는지 반드시 말한다 — 조용히 자르면 올라간 줄 알았던 사진이 없다.
    setImageMessage(error)
    if (accepted.length === 0) return

    setUploadingCount(accepted.length)
    try {
      const uploaded = await onUploadImages(accepted)
      setImages(currentImages => [
        ...currentImages,
        ...uploaded.map((image, index) => ({
          ...image,
          sortOrder: currentImages.length + index,
        })),
      ])
    } catch (uploadError) {
      setImageMessage(
        uploadError instanceof Error
          ? uploadError.message
          : '이미지를 올리지 못했어요. 잠시 후 다시 시도해 주세요.',
      )
    } finally {
      setUploadingCount(0)
      setUploadWaitAsked(false)
    }
  }

  const handleFilesPicked = (event: ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(event.target.files ?? [])
    // 같은 파일을 다시 골랐을 때도 onChange 가 나도록 값을 비운다.
    event.target.value = ''
    return addFiles(picked)
  }

  /*
   * 드롭존. dragover 를 막아야 drop 이 난다 — 막지 않으면 브라우저가 파일을 열어 쓰던 글을 떠난다.
   * 올리는 중·저장 중에는 받지 않는다(dropEffect none). 가득 찼을 때 놓으면 규칙 함수가 「이미 5장」
   * 안내를 낸다 — 조용히 무시하지 않는다.
   */
  const dropBlocked = pending || uploading

  const handleDragEnter = (event: DragEvent<HTMLButtonElement>) => {
    if (!isFileDrag(event)) return
    event.preventDefault()
    if (!dropBlocked) setDragActive(true)
  }

  const handleDragOver = (event: DragEvent<HTMLButtonElement>) => {
    if (!isFileDrag(event)) return
    event.preventDefault()
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = dropBlocked ? 'none' : 'copy'
    }
  }

  const handleDragLeave = () => {
    setDragActive(false)
  }

  const handleDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault()
    setDragActive(false)
    if (dropBlocked) return

    void addFiles(Array.from(event.dataTransfer?.files ?? []))
  }

  /*
   * 목록에서 빼기만 한다. 저장 전에는 **서버에 아무 요청도 보내지 않는다** — 취소하고
   * 나갈 수 있어야 하는데 미리 지우면 되돌릴 수 없다. 저장 시 `imageKeys` 에서 빠지는
   * 것으로 실제 삭제가 일어난다. (연결 안 된 키는 고아로 남지만, 그건 백엔드 회수
   * 배치의 몫이다 — `file-upload-guide.md` "알려진 한계".)
   */
  const handleRemoveImage = (imageKey: string) => {
    setImageMessage(null)
    setImages(currentImages =>
      currentImages
        .filter(image => image.imageKey !== imageKey)
        .map((image, index) => ({ ...image, sortOrder: index })),
    )
  }

  const handleInsertPrompt = (template: string) => {
    pendingCaretRef.current = getCommunityWritingPromptCaret(template)
    setContent(template)
    clearFieldError('content')
  }

  /* 내용이 바뀐 채로 ✕ · 취소 — 묻는다. 앱 안 다른 링크는 막지 않는다(임시 저장이 지킨다). */
  const handleLeave = () => {
    if (
      dirty &&
      !window.confirm(
        draftStorageKey
          ? COMMUNITY_EDITOR_LEAVE_CONFIRM
          : COMMUNITY_EDITOR_LEAVE_CONFIRM_UNSAVED,
      )
    ) {
      return
    }

    onCancel()
  }

  /*
   * 등록 버튼은 비활성으로 두지 않는다(비활성 버튼은 이유를 말하지 않는다). 누르면 비어 있는
   * 첫 필수값으로 포커스를 옮기고 그 아래 한 줄로 알린다. 지역이면 시트까지 연다(CM-032).
   */
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (submitLocked) {
      return
    }

    if (uploading) {
      setUploadWaitAsked(true)
      return
    }

    const result = resolveCommunityEditorSubmission(
      mode,
      title,
      content,
      location,
      images,
    )

    if (result.error !== null) {
      setFieldError({ field: result.field, message: result.error })

      if (result.field === 'location') {
        regionRef.current?.focusAndOpen()
      } else if (result.field === 'title') {
        titleRef.current?.focus()
      } else {
        contentRef.current?.focus()
      }
      return
    }

    setFieldError(null)
    onSubmit(result.value)
  }

  const handleTitleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (
      !shouldMoveFromTitleOnEnter({
        key: event.key,
        keyCode: event.keyCode,
        isComposing: event.nativeEvent.isComposing,
        shiftKey: event.shiftKey,
        altKey: event.altKey,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
      })
    ) {
      return
    }

    event.preventDefault()
    contentRef.current?.focus()
  }

  const heading = getCommunityEditorHeading(mode)
  const errorId = (field: CommunityEditorField) => `${id}-${field}-error`
  const errorFor = (field: CommunityEditorField) =>
    fieldError?.field === field ? fieldError.message : null
  const titleNear = isCommunityCountNearLimit(
    title.length,
    COMMUNITY_TITLE_MAX_LENGTH,
  )
  const contentNear = isCommunityCountNearLimit(
    content.length,
    COMMUNITY_CONTENT_MAX_LENGTH,
  )
  const canAddPhoto = images.length < MAX_POST_IMAGES && !uploading
  const photosFull = images.length >= MAX_POST_IMAGES
  const checklist = getCommunityEditorChecklist(current)
  const checklistReady = isCommunityEditorChecklistReady(checklist)
  const requiredLeft = checklist.filter(
    item => item.required && !item.done,
  ).length

  /* 작성 체크 한 칸을 누르면 그 칸으로 간다. 지역은 칩에 포커스만 두고 시트는 열지 않는다. */
  const focusCheckItem = (checkId: CommunityEditorCheckId) => {
    if (checkId === 'location') {
      regionRef.current?.focus()
    } else if (checkId === 'title') {
      titleRef.current?.focus()
    } else if (checkId === 'content') {
      contentRef.current?.focus()
    } else {
      dropzoneRef.current?.focus()
    }
  }
  const titleError = errorFor('title')
  const contentError = errorFor('content')
  const locationError = errorFor('location')

  return (
    <Shell>
      <Form
        aria-busy={pending}
        aria-labelledby={`${id}-heading`}
        data-community-editor-form="true"
        noValidate
        onSubmit={handleSubmit}
      >
        <MobileBar data-community-editor-bar="true">
          <IconButton
            aria-label="닫기"
            disabled={pending}
            onClick={handleLeave}
            type="button"
          >
            <X aria-hidden="true" size={24} />
          </IconButton>
          <BarTitle>{heading}</BarTitle>
          <BarSubmit disabled={submitLocked} type="submit">
            {pending ? '저장 중' : mode === 'edit' ? '수정' : '등록'}
          </BarSubmit>
        </MobileBar>

        <Heading id={`${id}-heading`}>{heading}</Heading>

        {notice}
        {errorMessage ? <Message role="alert">{errorMessage}</Message> : null}

        <Field>
          <CommunityRegionSheet
            ref={regionRef}
            describedBy={locationError ? errorId('location') : undefined}
            invalid={Boolean(locationError)}
            mockEnabled={mockEnabled}
            onChange={nextLocation => {
              setLocation(nextLocation)
              clearFieldError('location')
            }}
            readOnly={mode === 'edit'}
            value={location}
            variant="compose"
          />
          {locationError ? (
            <FieldError id={errorId('location')} role="alert">
              {locationError}
            </FieldError>
          ) : null}
          {mode === 'edit' ? <Caption>지역은 수정할 수 없어요.</Caption> : null}
        </Field>

        <Field>
          <HiddenLabel htmlFor={`${id}-title`}>제목</HiddenLabel>
          <TitleInput
            ref={titleRef}
            aria-describedby={[
              `${id}-title-count`,
              titleError ? errorId('title') : null,
            ]
              .filter(Boolean)
              .join(' ')}
            aria-invalid={titleError ? true : undefined}
            disabled={pending}
            id={`${id}-title`}
            maxLength={COMMUNITY_TITLE_MAX_LENGTH}
            onChange={event => {
              setTitle(event.target.value)
              clearFieldError('title')
            }}
            onKeyDown={handleTitleKeyDown}
            placeholder="제목을 입력해 주세요"
            value={title}
          />
          <MetaRow>
            {titleError ? (
              <FieldError id={errorId('title')} role="alert">
                {titleError}
              </FieldError>
            ) : null}
            <Counter
              $near={titleNear}
              data-near-limit={titleNear ? 'true' : undefined}
              id={`${id}-title-count`}
            >
              {title.length.toLocaleString('ko-KR')} /{' '}
              {COMMUNITY_TITLE_MAX_LENGTH.toLocaleString('ko-KR')}
            </Counter>
          </MetaRow>
        </Field>

        <Field>
          <HiddenLabel htmlFor={`${id}-content`}>내용</HiddenLabel>
          {shouldShowCommunityWritingPrompts(content) ? (
            <PromptGroup
              aria-label="작성 도움"
              data-community-writing-prompts="true"
              role="group"
            >
              {COMMUNITY_WRITING_PROMPTS.map(prompt => (
                <PromptChip
                  key={prompt.id}
                  disabled={pending}
                  onClick={() => {
                    handleInsertPrompt(prompt.template)
                  }}
                  type="button"
                >
                  {prompt.label}
                </PromptChip>
              ))}
            </PromptGroup>
          ) : null}
          <ContentTextArea
            ref={contentRef}
            aria-describedby={[
              `${id}-content-count`,
              contentError ? errorId('content') : null,
            ]
              .filter(Boolean)
              .join(' ')}
            aria-invalid={contentError ? true : undefined}
            disabled={pending}
            id={`${id}-content`}
            maxLength={COMMUNITY_CONTENT_MAX_LENGTH}
            onChange={event => {
              setContent(event.target.value)
              clearFieldError('content')
            }}
            placeholder="운영하면서 겪은 일, 궁금한 점을 편하게 적어 주세요."
            value={content}
          />
          <MetaRow>
            {contentError ? (
              <FieldError id={errorId('content')} role="alert">
                {contentError}
              </FieldError>
            ) : null}
            <Counter
              $near={contentNear}
              data-near-limit={contentNear ? 'true' : undefined}
              id={`${id}-content-count`}
            >
              {content.length.toLocaleString('ko-KR')} /{' '}
              {COMMUNITY_CONTENT_MAX_LENGTH.toLocaleString('ko-KR')}
            </Counter>
          </MetaRow>
        </Field>

        <Field>
          <MetaRow>
            <SectionLabel>사진</SectionLabel>
            <PhotoCount $near={false}>
              {images.length} / {MAX_POST_IMAGES}
            </PhotoCount>
          </MetaRow>

          <HiddenFileInput
            ref={fileInputRef}
            accept={IMAGE_ACCEPT_ATTRIBUTE}
            aria-label="첨부할 이미지 파일 선택"
            disabled={pending || !canAddPhoto}
            multiple
            onChange={handleFilesPicked}
            type="file"
          />

          <Dropzone
            ref={dropzoneRef}
            aria-describedby={`${id}-dropzone-rule ${id}-dropzone-count`}
            aria-disabled={photosFull || uploading ? true : undefined}
            aria-labelledby={`${id}-dropzone-title`}
            data-community-photo-dropzone="true"
            data-drag-active={dragActive ? 'true' : undefined}
            disabled={pending}
            onClick={() => {
              if (!canAddPhoto) return
              fileInputRef.current?.click()
            }}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            type="button"
          >
            <ImagePlus aria-hidden="true" size={24} />
            <DropzoneTitle id={`${id}-dropzone-title`}>
              {photosFull
                ? COMMUNITY_EDITOR_DROPZONE_FULL
                : COMMUNITY_EDITOR_DROPZONE_LABEL}
            </DropzoneTitle>
            <DropzoneMeta id={`${id}-dropzone-rule`}>
              {POST_IMAGE_RULE_TEXT}
            </DropzoneMeta>
            <DropzoneCount id={`${id}-dropzone-count`}>
              {images.length} / {MAX_POST_IMAGES}
            </DropzoneCount>
          </Dropzone>

          <PhotoRow
            aria-label="첨부한 사진"
            data-community-photo-row="true"
            data-empty={
              images.length === 0 && uploadingCount === 0 ? 'true' : undefined
            }
          >
            {images.map((image, index) => (
              <PhotoTile key={image.imageKey}>
                {/*
                  MinIO 공개 URL 이라 Next 이미지 최적화 대상이 아니다. 원격 호스트를
                  `next.config` 에 등록하지 않으면 `next/image` 는 런타임에 실패한다.
                */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img alt={`첨부 이미지 ${index + 1}`} src={image.imageUrl} />
                {index === 0 ? (
                  <CoverBadge data-community-cover-badge="true">
                    대표
                  </CoverBadge>
                ) : null}
                <PhotoRemove
                  aria-label={`첨부 이미지 ${index + 1} 빼기`}
                  disabled={pending || uploading}
                  onClick={() => {
                    handleRemoveImage(image.imageKey)
                  }}
                  type="button"
                >
                  <span>
                    <X aria-hidden="true" size={16} />
                  </span>
                </PhotoRemove>
              </PhotoTile>
            ))}
            {Array.from({ length: uploadingCount }, (_, index) => (
              <UploadingTile
                key={`uploading-${index}`}
                aria-label="사진을 올리는 중이에요"
                data-community-photo-uploading="true"
                role="status"
              >
                <Loader2 aria-hidden="true" size={24} />
              </UploadingTile>
            ))}
            {canAddPhoto ? (
              <AddPhotoItem>
                <AddPhotoButton
                  aria-label="사진 추가"
                  data-community-photo-add="true"
                  disabled={pending}
                  onClick={() => fileInputRef.current?.click()}
                  type="button"
                >
                  <Plus aria-hidden="true" size={24} />
                </AddPhotoButton>
              </AddPhotoItem>
            ) : null}
          </PhotoRow>

          <PhotoRuleCaption>{POST_IMAGE_RULE_TEXT}</PhotoRuleCaption>
          {imageMessage ? <Message role="alert">{imageMessage}</Message> : null}
          {uploadWaitAsked && uploading ? (
            <Message role="alert">{COMMUNITY_EDITOR_UPLOADING_NOTICE}</Message>
          ) : null}
        </Field>

        <ActionBar>
          <SecondaryButton
            disabled={pending}
            onClick={handleLeave}
            type="button"
          >
            취소
          </SecondaryButton>
          <PrimaryButton disabled={submitLocked} type="submit">
            {pending ? '저장 중' : mode === 'edit' ? '수정하기' : '등록하기'}
          </PrimaryButton>
        </ActionBar>
      </Form>

      <Checklist
        aria-labelledby={`${id}-checklist`}
        data-community-editor-checklist="true"
      >
        <h2 id={`${id}-checklist`}>작성 체크</h2>
        <CheckItems>
          {checklist.map(item => {
            const content = (
              <>
                {item.done ? (
                  <CircleCheck aria-hidden="true" size={20} />
                ) : (
                  <Circle aria-hidden="true" size={20} />
                )}
                <span>{item.label}</span>
                {item.required ? null : <CheckOptional>선택</CheckOptional>}
                <VisuallyHidden>
                  {item.done ? ', 완료' : ', 남음'}
                </VisuallyHidden>
              </>
            )
            const done = item.done ? 'true' : 'false'

            return (
              <li key={item.id}>
                {item.id === 'location' && mode === 'edit' ? (
                  <CheckStatic data-check-id={item.id} data-done={done}>
                    {content}
                  </CheckStatic>
                ) : (
                  <CheckButton
                    data-check-id={item.id}
                    data-done={done}
                    onClick={() => {
                      focusCheckItem(item.id)
                    }}
                    type="button"
                  >
                    {content}
                  </CheckButton>
                )}
              </li>
            )
          })}
        </CheckItems>
        <CheckSummary
          $ready={checklistReady}
          data-community-editor-ready={checklistReady ? 'true' : 'false'}
          role="status"
        >
          {checklistReady
            ? COMMUNITY_EDITOR_READY_MESSAGE
            : `필수 ${requiredLeft}개가 남았어요`}
        </CheckSummary>
        <TipBlock>
          <h3>이렇게 쓰면 답이 잘 달려요</h3>
          <ul>
            {COMMUNITY_EDITOR_TIPS.map(tip => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </TipBlock>
      </Checklist>
    </Shell>
  )
}
