import type { CommunityMetadata } from '@/types/community'

import {
  hasCommunityLocationTarget,
  type CommunityLocationValue,
} from './community-location'
import {
  getCommunityLoginHref,
  parseCommunityTargetType,
  type CommunityListState,
} from './community-state'

/**
 * 글쓰기 지역 프리필(docs/features/community/community.md §S4 「글쓰기 · 수정」 지역 프리필, CM-031).
 *
 * 목록(보던 대상)·상세(글의 대상)가 `?targetType=&targetCode=&targetName=` 로 글쓰기를 연다.
 * 주소는 누구나 고칠 수 있으므로 **형식이 틀린 값은 버린다** — 깨진 칩으로 시작하느니 빈 칩이
 * 낫다. 이름은 표시용이라 없어도 되고(칩이 코드로 내려앉는다), 저장 요청에는 종류·코드만 간다.
 */
export const parseCommunityEditorPrefill = (
  params: URLSearchParams,
): CommunityLocationValue | null => {
  const targetType = parseCommunityTargetType(params.get('targetType'))
  const targetCode = params.get('targetCode')?.trim()

  if (!targetType || !targetCode) {
    return null
  }

  const targetName = params.get('targetName')?.trim()

  return targetName
    ? { targetType, targetCode, targetName }
    : { targetType, targetCode }
}

/**
 * 새 글의 시작 지역. **비교 초안이 이긴다** — 초안의 대상은 행정동으로 고정이고(community.md
 * §S4 「대상 규약」), 사용자는 그 비교로 글을 쓰려고 왔다.
 */
export const resolveCommunityCreateLocation = (
  draftLocation: CommunityLocationValue | null,
  prefill: CommunityLocationValue | null,
): CommunityLocationValue => draftLocation ?? prefill ?? {}

/**
 * 글쓰기 링크. 대상이 있으면 프리필 쿼리를 싣고, `mock` 은 끝에 보존한다. 로그인으로 감싸는 것은
 * 부르는 쪽 몫이다(`getCommunityLoginHref`) — 목록만 판정 전후를 안다.
 */
export const createCommunityWriteHref = (
  target: CommunityLocationValue | null | undefined,
  mock: boolean,
) => {
  const params = new URLSearchParams()

  if (target && hasCommunityLocationTarget(target)) {
    params.set('targetType', target.targetType!)
    params.set('targetCode', target.targetCode!.trim())

    const targetName = target.targetName?.trim()
    if (targetName) {
      params.set('targetName', targetName)
    }
  }

  if (mock) {
    params.set('mock', '1')
  }

  const query = params.toString()
  return query ? `/community/register?${query}` : '/community/register'
}

/** 응답(상세·초안)의 대상 필드를 폼 값으로. 종류 코드는 아는 값만 받는다. */
export const toCommunityLocationValue = (target: {
  targetType: CommunityMetadata | undefined
  targetCode: string | null
  targetName: string | null
}): CommunityLocationValue => ({
  targetType: parseCommunityTargetType(target.targetType?.code ?? null),
  targetCode: target.targetCode ?? undefined,
  targetName: target.targetName ?? undefined,
})

/**
 * 목록의 글쓰기 링크(FAB · 데스크톱 버튼 · 피드 끝). 대상을 고른 목록이면 그 대상을 싣는다(CM-031).
 * 검색 중·좋아요한 글 보기는 지역 칩이 꺼진 「서울 전체」라 싣지 않는다. 이름은 응답의
 * `board.targetName` 만 받는다 — 코드로 내려앉은 제목용 이름을 실으면 칩에 코드가 이름처럼 박힌다.
 *
 * 판정이 끝난 비로그인은 로그인으로 감싼다(돌아올 자리 = 프리필 주소). 목 모드는 감싸지 않는다.
 */
export const createCommunityListWriteHref = ({
  state,
  boardTargetName,
  guest,
}: {
  state: CommunityListState
  boardTargetName: string | undefined
  guest: boolean
}) => {
  const scoped =
    Boolean(state.targetType && state.targetCode) &&
    !state.keyword &&
    state.view !== 'liked'
  const path = createCommunityWriteHref(
    scoped
      ? {
          targetType: state.targetType,
          targetCode: state.targetCode,
          targetName: boardTargetName,
        }
      : null,
    state.mock,
  )

  return !state.mock && guest ? getCommunityLoginHref(path) : path
}
