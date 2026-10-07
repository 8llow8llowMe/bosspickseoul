/**
 * 게시글 상세 화면의 순수 판정 모음(community.md §S4 「화면 구성 — 개편 1단계」 상세).
 *
 * 화면 없이 검증해야 하는 규칙만 둔다 — 수정됨 표시, 지역 칩 주소, 더보기 항목, 공유 분기.
 * 브라우저 API 는 인자로 받는다(`shareCommunityPost`). module scope 에서 `navigator` 를
 * 읽지 않는다(docs/engineering/client-boundary).
 */

import type { ToastTone } from '@/lib/ui/toast-state'
import type { CommunityMetadata } from '@/types/community'

import {
  parseCommunityTargetType,
  serializeCommunityListState,
} from './community-state'
import { COMMUNITY_DEFAULT_POPULAR_PERIOD } from './popular-period'

/*
  저장 직후 updatedAt 이 createdAt 보다 몇 ms~몇 초 늦게 찍히는 경우가 있다. 그걸 「수정됨」으로
  보이면 안 되므로 1분을 문턱으로 둔다(community.md §S4 — 1분 넘게 다르면 `· 수정됨`).
*/
const COMMUNITY_EDITED_THRESHOLD_MS = 60_000

const toTime = (value: string | null | undefined) => {
  if (!value) {
    return null
  }

  const time = new Date(value).getTime()
  return Number.isNaN(time) ? null : time
}

/** 작성·수정 시각이 1분 넘게 다른가. 어느 쪽이든 해석할 수 없으면 false 다. */
export const isCommunityPostEdited = (
  createdAt: string | null | undefined,
  updatedAt: string | null | undefined,
) => {
  const created = toTime(createdAt)
  const updated = toTime(updatedAt)

  if (created === null || updated === null) {
    return false
  }

  return updated - created > COMMUNITY_EDITED_THRESHOLD_MS
}

type CommunityTargetFields = {
  targetType: CommunityMetadata
  targetCode: string | null
}

/**
 * 지역 칩 링크. 목록과 같은 직렬화(`serializeCommunityListState`)를 써서 mock 을 보존한다.
 * 대상이 없거나 형식을 모르면 null — 칩은 링크 없는 `서울 전체` 라벨이 된다.
 */
export const createCommunityRegionListHref = (
  target: CommunityTargetFields,
  mock: boolean,
) => {
  const targetType = parseCommunityTargetType(target.targetType?.code ?? null)
  const targetCode = target.targetCode?.trim()

  if (!targetType || !targetCode) {
    return null
  }

  const query = serializeCommunityListState({
    view: 'latest',
    keyword: '',
    targetType,
    targetCode,
    period: COMMUNITY_DEFAULT_POPULAR_PERIOD,
    mock,
  }).toString()

  return `/community/list?${query}`
}

/** 칩·레일 제목에 쓰는 지역 이름. 목록 제목(`getCommunityBoardTargetName`)처럼 코드로 내려앉는다. */
export const getCommunityRegionName = (target: {
  targetName: string | null
  targetCode: string | null
}) => target.targetName?.trim() || target.targetCode?.trim() || '서울 전체'

/**
 * 레일 제목·빈 상태 문구에 쓰는 지역 이름. 칩과 달리 코드로 내려앉지 않는다 — `11680 최신 글` 은
 * 읽을 수 없다(목록 제목 `getCommunityBoardResponseName` 과 같은 판단). 대상은 있는데 이름이 없으면
 * `이 지역` 이다.
 */
export const getCommunityRailRegionName = (target: {
  targetName: string | null
  targetCode: string | null
}) =>
  target.targetName?.trim() ||
  (target.targetCode?.trim() ? '이 지역' : '서울 전체')

export type CommunityPostMenuAction = 'edit' | 'delete' | 'report'

/** 더보기 항목(CM-022). 내 글은 수정·삭제, 남의 글은 신고만. 자기 글은 신고하지 않는다. */
export const getCommunityPostMenuActions = (
  isOwner: boolean,
): CommunityPostMenuAction[] => (isOwner ? ['edit', 'delete'] : ['report'])

/** 메뉴 안 화살표 이동. 끝에서 반대쪽으로 돈다. 처리하지 않는 키는 null. */
export const getNextCommunityMenuIndex = (
  length: number,
  current: number,
  key: string,
): number | null => {
  if (length <= 0) {
    return null
  }

  switch (key) {
    case 'ArrowDown':
      return current < 0 ? 0 : (current + 1) % length
    case 'ArrowUp':
      return current <= 0 ? length - 1 : current - 1
    case 'Home':
      return 0
    case 'End':
      return length - 1
    default:
      return null
  }
}

/*
  공유 주소에서 빼는 쿼리. `from` 은 「어느 목록에서 왔는가」라 받는 사람에게 의미가 없고
  인접 글 계산을 엉뚱한 목록으로 돌린다. `mock=1` 은 dev 에서만 켜지는 값이라 남겨 둔다
  (프로덕션에서는 isCommunityMockEnabled 가 무시한다).
*/
const COMMUNITY_SHARE_DROPPED_PARAMS = ['from'] as const

/** 지금 주소에서 목록 맥락과 해시를 뺀 정규 주소. 해석할 수 없으면 그대로 돌려준다. */
export const createCommunityShareUrl = (href: string) => {
  try {
    const url = new URL(href)
    COMMUNITY_SHARE_DROPPED_PARAMS.forEach(name => {
      url.searchParams.delete(name)
    })
    url.hash = ''
    return url.toString()
  } catch {
    return href
  }
}

export type CommunitySharePayload = { title: string; url: string }

/** `navigator` 중 공유에 쓰는 부분. 테스트가 가짜를 넘길 수 있게 좁혀 둔다. */
export type CommunityShareNavigator = {
  share?: (data: CommunitySharePayload) => Promise<void>
  clipboard?: { writeText?: (text: string) => Promise<void> }
}

export type CommunityShareResult = 'shared' | 'copied' | 'cancelled' | 'failed'

/*
  조용히 넘기는 share 실패.
  - AbortError: 사용자가 공유 시트를 닫았다.
  - InvalidStateError: 앞선 공유 시트가 아직 떠 있다(명세상 「이전 share 가 끝나지 않음」).
    이건 실패가 아니라 이미 진행 중이라는 뜻이라, 여기서 클립보드로 넘어가면 시트가 뜬 채로
    「링크를 복사했어요」 토스트가 겹친다.
*/
const SILENT_SHARE_ERRORS = new Set(['AbortError', 'InvalidStateError'])

const isSilentShareError = (error: unknown) =>
  typeof error === 'object' &&
  error !== null &&
  'name' in error &&
  SILENT_SHARE_ERRORS.has(String((error as { name: unknown }).name))

/**
 * 공유 분기(community.md §S4 공유).
 *
 * 1. `navigator.share` 가 있으면 그것. 사용자가 닫거나(AbortError) 앞선 공유가 아직 진행 중이면
 *    (InvalidStateError) 아무것도 하지 않는다.
 * 2. share 가 없거나 다른 이유로 실패하면(권한·제스처 만료 등) 주소를 클립보드에 복사.
 * 3. 복사도 안 되면 failed.
 */
export const shareCommunityPost = async (
  payload: CommunitySharePayload,
  nav: CommunityShareNavigator | undefined,
): Promise<CommunityShareResult> => {
  if (typeof nav?.share === 'function') {
    try {
      await nav.share(payload)
      return 'shared'
    } catch (error) {
      if (isSilentShareError(error)) {
        return 'cancelled'
      }
    }
  }

  const writeText = nav?.clipboard?.writeText

  if (typeof writeText !== 'function') {
    return 'failed'
  }

  try {
    await writeText.call(nav?.clipboard, payload.url)
    return 'copied'
  } catch {
    return 'failed'
  }
}

/**
 * 진행 중 가드를 씌운 공유. `inFlight` 는 컴포넌트의 ref 다(렌더를 다시 일으키지 않아도 된다).
 * 공유 시트가 떠 있는 동안 버튼을 또 누르면 share 를 다시 부르지 않고 null 을 돌려준다 —
 * 호출부는 토스트를 띄우지 않는다.
 */
export const shareCommunityPostOnce = async (
  inFlight: { current: boolean },
  payload: CommunitySharePayload,
  nav: CommunityShareNavigator | undefined,
): Promise<CommunityShareResult | null> => {
  if (inFlight.current) {
    return null
  }

  inFlight.current = true

  try {
    return await shareCommunityPost(payload, nav)
  } finally {
    inFlight.current = false
  }
}

/** 결과별 토스트. 공유 시트가 떴거나 사용자가 닫았으면 알릴 것이 없다. */
export const COMMUNITY_SHARE_TOAST: Record<
  CommunityShareResult,
  { message: string; tone: ToastTone } | null
> = {
  shared: null,
  cancelled: null,
  copied: { message: '링크를 복사했어요', tone: 'success' },
  failed: { message: '링크를 복사하지 못했어요', tone: 'error' },
}
