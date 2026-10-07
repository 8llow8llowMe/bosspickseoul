import type {
  CommunityPostCategoryCode,
  CommunityPostImage,
} from '@/types/community'

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
  /**
   * 말머리(#529). `null` 은 말머리 없음이다(선택 사항). 수정 화면은 상세 응답의 말머리로 시작하고
   * 저장 때 **그대로 다시 보낸다** — 수정 API 가 전체 교체라 빼면 지워진다(`createCommunityEditorPayload`).
   */
  category: CommunityPostCategoryCode | null
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
  category: CommunityPostCategoryCode | null = null,
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
      category,
    },
  }
}

/** 한도의 90% 를 **넘으면** 글자 수를 `--color-negative-text` 로 강조한다. */
export const isCommunityCountNearLimit = (length: number, max: number) =>
  length > max * 0.9

/**
 * 작성 도움 칩(CM-033). 빈 칸을 덜어 주는 본문 틀이다 — 넣는 것은 그냥 본문이다. 말머리는 따로
 * 말머리 칩 행이 고른다(#529). 작성 도움 칩은 본문이 비었을 때만 보여 말머리 선택 수단이 될 수 없다.
 *
 * 다만 칩마다 대응하는 말머리가 있다(계약의 칩 → code 매핑표, `category`). 말머리가 **비어 있을 때만**
 * 그 말머리를 같이 골라 준다 — 이미 고른 말머리는 덮지 않는다(`getCommunityPromptCategory`).
 * 「동네 소식」(`NEWS`)에는 대응하는 칩이 없다. 각 줄 끝의 공백은 커서를 놓을 자리다.
 */
export const COMMUNITY_WRITING_PROMPTS = [
  {
    id: 'question',
    label: '질문해요',
    template: '상황: \n궁금한 점: ',
    category: 'QUESTION',
  },
  {
    id: 'experience',
    label: '경험 나눠요',
    template: '해 본 것: \n결과: \n느낀 점: ',
    category: 'EXPERIENCE',
  },
  {
    id: 'together',
    label: '같이 해요',
    template: '함께 하고 싶은 것: \n일정·조건: \n연락 방법: ',
    category: 'TOGETHER',
  },
] as const satisfies ReadonlyArray<{
  id: string
  label: string
  template: string
  category: CommunityPostCategoryCode
}>

export type CommunityWritingPrompt = (typeof COMMUNITY_WRITING_PROMPTS)[number]

/** 작성 도움 칩을 누른 뒤의 말머리 — 비어 있으면 칩의 말머리, 이미 골랐으면 그대로다. */
export const getCommunityPromptCategory = (
  current: CommunityPostCategoryCode | null,
  prompt: Pick<CommunityWritingPrompt, 'category'>,
): CommunityPostCategoryCode => current ?? prompt.category

export const shouldShowCommunityWritingPrompts = (content: string) =>
  content.trim().length === 0

/** 틀을 넣은 뒤 커서 자리 — 첫 줄 끝. 줄바꿈이 없으면 끝이다. */
export const getCommunityWritingPromptCaret = (template: string) => {
  const lineEnd = template.indexOf('\n')
  return lineEnd < 0 ? template.length : lineEnd
}

/** 작성 체크 한 칸(community.md §S4 「다듬기」 작성 체크). 지역 → 제목 → 본문 → 사진, 화면 순서다. */
export type CommunityEditorCheckId = CommunityEditorField | 'images'

export type CommunityEditorCheckItem = {
  id: CommunityEditorCheckId
  label: string
  /** 사진만 선택이다 — 화면은 `선택` 을 붙여 적는다. */
  required: boolean
  done: boolean
}

/**
 * 작성 체크(`≥1080` 오른쪽 카드). 채워졌는지는 **등록 검증과 같은 잣대**로 본다 — 지역은 대상(종류 +
 * 코드)이 있어야, 제목·본문은 앞뒤 공백을 지우고 비어 있지 않아야, 사진은 한 장 이상이어야 켜진다.
 * 길이 한도는 입력칸의 `maxLength` 가 막으므로 여기서 다시 세지 않는다.
 */
export const getCommunityEditorChecklist = (
  value: Pick<
    CommunityEditorValue,
    'title' | 'content' | 'location' | 'images'
  >,
): CommunityEditorCheckItem[] => [
  {
    id: 'location',
    label: '지역',
    required: true,
    done: hasCommunityLocationTarget(value.location),
  },
  {
    id: 'title',
    label: '제목',
    required: true,
    done: value.title.trim().length > 0,
  },
  {
    id: 'content',
    label: '본문',
    required: true,
    done: value.content.trim().length > 0,
  },
  {
    id: 'images',
    label: '사진',
    required: false,
    done: value.images.length > 0,
  },
]

/** 필수 칸(지역 · 제목 · 본문)이 다 찼다 — 카드가 `등록할 준비가 됐어요` 라고 말한다. */
export const isCommunityEditorChecklistReady = (
  items: CommunityEditorCheckItem[],
) => items.every(item => !item.required || item.done)

export const COMMUNITY_EDITOR_READY_MESSAGE = '등록할 준비가 됐어요'
