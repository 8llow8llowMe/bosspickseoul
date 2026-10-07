import type { CommunityId, CommunityPostCategoryCode } from '@/types/community'

import {
  hasCommunityLocationTarget,
  type CommunityLocationValue,
} from './community-location'
import { parseCommunityTargetType } from './community-state'
import { parseCommunityPostCategory } from './post-category'
import type {
  CommunityEditorMode,
  CommunityEditorValue,
} from './editor-compose'

/**
 * 글쓰기 임시 저장(docs/features/community/community.md §S4 「잃지 않게 — 임시 저장 · 이탈 확인」).
 *
 * 입력이 멈추고 1초 뒤 `localStorage` 에 제목·본문·지역·말머리를 둔다. **사진은 저장하지 않는다** —
 * 올린 사진 키는 저장 전까지 어떤 글에도 연결되지 않아 백엔드 회수 배치가 지울 수 있다. 되살린
 * 초안에 깨진 사진이 남는 것보다 다시 고르게 하는 편이 낫다.
 *
 * storage 는 늘 **함수로** 받는다(`getStorage`). `window.localStorage` 를 읽는 것 자체가
 * 사생활 모드·차단된 사이트 데이터에서 던지므로, 접근 전체를 try 안에 둬야 한다.
 */

export const COMMUNITY_DRAFT_AUTOSAVE_DELAY_MS = 1000

export type CommunityStoredDraft = {
  title: string
  content: string
  location: CommunityLocationValue
  /**
   * 말머리(#529). 쓸 때는 늘 적는다(없으면 `null`). **필드가 없으면 말머리 이전의 옛 저장본**이라
   * 「모름」이다 — 「말머리 없음」과 가른다. 수정 이어 쓰기에서 옛 저장본을 null 로 읽으면 원본
   * 말머리가 풀린 채 저장돼 서버가 지운다(`applyCommunityStoredDraft`).
   */
  category?: CommunityPostCategoryCode | null
  savedAt: number
}

export type CommunityStorageGetter = () => Storage | null | undefined

/** 브라우저 localStorage. 호출하는 순간 던질 수 있다 — 아래 read/write/remove 안에서만 부른다. */
export const getBrowserLocalStorage: CommunityStorageGetter = () =>
  typeof window === 'undefined' ? null : window.localStorage

/** 모든 저장본 키의 머리. 로그아웃이 이 머리로 한꺼번에 지운다(`clearCommunityStoredDrafts`). */
export const COMMUNITY_DRAFT_KEY_PREFIX = 'community-draft:'

/**
 * 저장본 키. **회원 id 를 넣는다** — 공용 기기에서 다음 계정이 앞 사람의 쓰던 글을 「이어 쓰기」로
 * 보면 안 된다. 회원 id 를 모르면(로그인 판정 전·비로그인) `null` 이라 저장도 복원도 하지 않는다.
 * 목 모드는 목 회원 id(`MOCK_COMMUNITY_MEMBER_ID`)를 넘긴다.
 */
export const getCommunityDraftStorageKey = (
  mode: CommunityEditorMode,
  postId: CommunityId | null,
  memberId: string | null,
): string | null => {
  if (!memberId) {
    return null
  }

  const scope = `${COMMUNITY_DRAFT_KEY_PREFIX}${memberId}:`
  return mode === 'edit' && postId ? `${scope}edit:${postId}` : `${scope}new`
}

/** 폼 값을 통째로 받아도 된다 — 사진(`images`)은 여기서 버린다. */
export const createCommunityStoredDraft = (
  value: Pick<CommunityEditorValue, 'title' | 'content' | 'location'> &
    Partial<Pick<CommunityEditorValue, 'images' | 'category'>>,
  savedAt: number,
): CommunityStoredDraft => ({
  title: value.title,
  content: value.content,
  location: value.location,
  category: value.category ?? null,
  savedAt,
})

export const hasCommunityStoredDraftContent = (
  draft: Pick<CommunityStoredDraft, 'title' | 'content'>,
) => draft.title.trim().length > 0 || draft.content.trim().length > 0

const readLocation = (value: unknown): CommunityLocationValue => {
  if (!value || typeof value !== 'object') {
    return {}
  }

  const record = value as Record<string, unknown>
  const targetType = parseCommunityTargetType(
    typeof record.targetType === 'string' ? record.targetType : null,
  )
  const targetCode =
    typeof record.targetCode === 'string' ? record.targetCode.trim() : ''

  if (!targetType || !targetCode) {
    return {}
  }

  const targetName =
    typeof record.targetName === 'string' ? record.targetName.trim() : ''

  return targetName
    ? { targetType, targetCode, targetName }
    : { targetType, targetCode }
}

/** 저장본을 읽는다. 모양이 틀리거나 제목·본문이 모두 비었으면 「없음」이다 — 물어볼 것이 없다. */
export const parseCommunityStoredDraft = (
  raw: string | null,
): CommunityStoredDraft | null => {
  if (!raw) {
    return null
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }

  if (!parsed || typeof parsed !== 'object') {
    return null
  }

  const record = parsed as Record<string, unknown>
  if (typeof record.title !== 'string' || typeof record.content !== 'string') {
    return null
  }

  const draft: CommunityStoredDraft = {
    title: record.title,
    content: record.content,
    location: readLocation(record.location),
    // 필드가 없는 옛 저장본은 키째 비워 「모름」으로 둔다. 모르는 값은 말머리 없음이다.
    ...('category' in record
      ? { category: parseCommunityPostCategory(record.category) }
      : {}),
    savedAt: typeof record.savedAt === 'number' ? record.savedAt : 0,
  }

  return hasCommunityStoredDraftContent(draft) ? draft : null
}

export const readCommunityStoredDraft = (
  getStorage: CommunityStorageGetter,
  key: string,
): CommunityStoredDraft | null => {
  try {
    return parseCommunityStoredDraft(getStorage()?.getItem(key) ?? null)
  } catch {
    return null
  }
}

/** 실패(용량·사생활 모드)는 조용히 false — 임시 저장은 편의이지 글쓰기의 전제가 아니다. */
export const writeCommunityStoredDraft = (
  getStorage: CommunityStorageGetter,
  key: string,
  draft: CommunityStoredDraft,
): boolean => {
  try {
    const storage = getStorage()
    if (!storage) {
      return false
    }

    storage.setItem(key, JSON.stringify(draft))
    return true
  } catch {
    return false
  }
}

export const removeCommunityStoredDraft = (
  getStorage: CommunityStorageGetter,
  key: string,
) => {
  try {
    getStorage()?.removeItem(key)
  } catch {
    // 지우지 못해도 다음 진입에서 「이어 쓰기」를 한 번 더 묻는 것뿐이다.
  }
}

/**
 * 로그아웃 — 모든 회원의 저장본을 지운다(옛 `community-draft:new` 형식 포함). 키 목록을 먼저
 * 모은 뒤 지운다: 도는 중에 지우면 `storage.key(i)` 의 순번이 밀린다.
 */
export const clearCommunityStoredDrafts = (
  getStorage: CommunityStorageGetter,
) => {
  try {
    const storage = getStorage()
    if (!storage) {
      return
    }

    const keys: string[] = []
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index)
      if (key?.startsWith(COMMUNITY_DRAFT_KEY_PREFIX)) {
        keys.push(key)
      }
    }

    keys.forEach(key => {
      storage.removeItem(key)
    })
  } catch {
    // 지우지 못해도 로그아웃은 막지 않는다. 키에 회원 id 가 있어 다른 계정에는 보이지 않는다.
  }
}

const locationIdentity = (value: CommunityLocationValue) =>
  `${value.targetType ?? ''}:${value.targetCode?.trim() ?? ''}`

/**
 * 처음 값과 달라졌는가 — 이탈 확인과 임시 저장의 기준이다. 지역은 코드가 정체성이라 이름은
 * 보지 않고, 사진은 키 순서까지 본다(순서가 노출 순서다). 말머리도 고르거나 풀면 바뀐 것이다.
 */
export const isCommunityEditorDirty = (
  pristine: CommunityEditorValue,
  current: CommunityEditorValue,
) =>
  pristine.title !== current.title ||
  pristine.content !== current.content ||
  locationIdentity(pristine.location) !== locationIdentity(current.location) ||
  pristine.images.map(image => image.imageKey).join('\n') !==
    current.images.map(image => image.imageKey).join('\n') ||
  pristine.category !== current.category

/**
 * 이어 쓰기. 새 글은 제목·본문·지역·말머리를 되살리고(저장본에 지역이 없으면 들어온 지역을 지킨다)
 * 사진은 비운다. **수정은 제목·본문·말머리만** 저장본이다 — 지역은 읽기 전용이고, 사진은 원본 목록을
 * 들고 있어야 저장 순간 지워지지 않는다(`createCommunityEditorPayload`). 말머리 필드가 없는 옛
 * 저장본은 처음 값(수정이면 원본 말머리)을 지킨다.
 */
export const applyCommunityStoredDraft = (
  mode: CommunityEditorMode,
  base: CommunityEditorValue,
  stored: CommunityStoredDraft,
): CommunityEditorValue => {
  const category =
    stored.category === undefined ? base.category : stored.category

  if (mode === 'edit') {
    return { ...base, title: stored.title, content: stored.content, category }
  }

  return {
    title: stored.title,
    content: stored.content,
    location: hasCommunityLocationTarget(stored.location)
      ? stored.location
      : base.location,
    images: [],
    category,
  }
}
