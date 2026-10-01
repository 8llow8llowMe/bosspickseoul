import type { CommunityPostImage } from '@/types/community'

import {
  hasCommunityLocationTarget,
  type CommunityLocationValue,
} from './community-location'
import { validateCommunityDraft } from './community-state'

/**
 * 글쓰기 · 수정 폼의 순수 규칙(docs/features/community/community.md §S4 「글쓰기 · 수정」).
 * 검증 순서, 글자 수 강조, 작성 도움 칩의 틀을 화면 없이 확인하려고 뺐다.
 */

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

export type CommunityEditorField = 'location' | 'title' | 'content'

export const COMMUNITY_TITLE_MAX_LENGTH = 120
export const COMMUNITY_CONTENT_MAX_LENGTH = 5000

/** 칩 아래 한 줄(CM-008·032). 지역은 고르는 것이라 「입력」이 아니라 「골라」다. */
export const COMMUNITY_LOCATION_REQUIRED_MESSAGE = '지역을 골라 주세요.'

export type CommunityEditorSubmission =
  | { error: string; field: CommunityEditorField; value: null }
  | { error: null; field: null; value: CommunityEditorValue }

/**
 * 등록을 눌렀을 때. **화면 순서대로 비어 있는 첫 필수값**(지역 → 제목 → 본문)을 짚는다 —
 * 등록 버튼을 비활성으로 두지 않는 대신 무엇이 비었는지 알려 주기 위해서다. 제목·본문
 * 문구와 길이 규칙은 `validateCommunityDraft` 하나를 쓴다.
 */
export const resolveCommunityEditorSubmission = (
  mode: CommunityEditorMode,
  title: string,
  content: string,
  location: CommunityLocationValue,
  images: CommunityPostImage[] = [],
): CommunityEditorSubmission => {
  if (mode === 'create' && !hasCommunityLocationTarget(location)) {
    return {
      error: COMMUNITY_LOCATION_REQUIRED_MESSAGE,
      field: 'location',
      value: null,
    }
  }

  const error = validateCommunityDraft(title, content)

  if (error) {
    // validateCommunityDraft 는 제목을 먼저 본다 — 제목이 통과하면 남은 오류는 본문이다.
    const trimmedTitle = title.trim()
    const titleValid =
      trimmedTitle.length > 0 &&
      trimmedTitle.length <= COMMUNITY_TITLE_MAX_LENGTH

    return { error, field: titleValid ? 'content' : 'title', value: null }
  }

  return {
    error: null,
    field: null,
    value: {
      title: title.trim(),
      content: content.trim(),
      location,
      images,
    },
  }
}

/** 한도의 90% 를 **넘으면** 글자 수를 `--color-negative-text` 로 강조한다. */
export const isCommunityCountNearLimit = (length: number, max: number) =>
  length > max * 0.9

/**
 * 작성 도움 칩(CM-033). 말머리가 아니라 빈 칸을 덜어 주는 틀이다 — 저장되는 것은 그냥 본문이고
 * BE 변경이 없다. 각 줄 끝의 공백은 커서를 놓을 자리다.
 */
export const COMMUNITY_WRITING_PROMPTS = [
  { id: 'question', label: '질문해요', template: '상황: \n궁금한 점: ' },
  {
    id: 'experience',
    label: '경험 나눠요',
    template: '해 본 것: \n결과: \n느낀 점: ',
  },
  {
    id: 'together',
    label: '같이 해요',
    template: '함께 하고 싶은 것: \n일정·조건: \n연락 방법: ',
  },
] as const

export const shouldShowCommunityWritingPrompts = (content: string) =>
  content.trim().length === 0

/** 틀을 넣은 뒤 커서 자리 — 첫 줄 끝. 줄바꿈이 없으면 끝이다. */
export const getCommunityWritingPromptCaret = (template: string) => {
  const lineEnd = template.indexOf('\n')
  return lineEnd < 0 ? template.length : lineEnd
}
