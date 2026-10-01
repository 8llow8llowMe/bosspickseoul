import { parseCommunityTargetType } from '@/lib/community/community-state'
import type { CommunityTargetType } from '@/types/community'

/*
  좌 내비 「최근 본 지역」(community.md §S4 「목록 3단」, CM-040).

  지역 게시판을 열 때(응답에서 board 이름을 알게 된 뒤) localStorage 에 기록한다. 최근 순으로
  최대 5개, 같은 대상(유형 + 코드)은 앞으로 옮긴다. 이름은 응답의 board.targetName 만 싣는다 —
  코드를 이름 자리에 넣으면 내비에 `11200` 이 박힌다.

  저장소는 브라우저 설정·사생활 모드에 따라 읽기·쓰기 모두 던질 수 있다. 보조 기능이라 실패는
  조용히 빈 목록으로 내려앉는다.
*/

export const COMMUNITY_RECENT_REGIONS_KEY = 'community-recent-regions'
export const COMMUNITY_RECENT_REGIONS_LIMIT = 5

export type CommunityRecentRegion = {
  targetType: CommunityTargetType
  targetCode: string
  targetName: string
}

const isSameRegion = (a: CommunityRecentRegion, b: CommunityRecentRegion) =>
  a.targetType === b.targetType && a.targetCode === b.targetCode

const toRecentRegion = (value: unknown): CommunityRecentRegion | null => {
  if (!value || typeof value !== 'object') {
    return null
  }

  const record = value as Record<string, unknown>
  const targetType = parseCommunityTargetType(
    typeof record.targetType === 'string' ? record.targetType : null,
  )
  const targetCode =
    typeof record.targetCode === 'string' ? record.targetCode.trim() : ''
  const targetName =
    typeof record.targetName === 'string' ? record.targetName.trim() : ''

  return targetType && targetCode && targetName
    ? { targetType, targetCode, targetName }
    : null
}

export const parseCommunityRecentRegions = (
  raw: string | null,
): CommunityRecentRegion[] => {
  if (!raw) {
    return []
  }

  let parsed: unknown

  try {
    parsed = JSON.parse(raw)
  } catch {
    return []
  }

  if (!Array.isArray(parsed)) {
    return []
  }

  return parsed
    .map(toRecentRegion)
    .filter((region): region is CommunityRecentRegion => region !== null)
    .slice(0, COMMUNITY_RECENT_REGIONS_LIMIT)
}

export const addCommunityRecentRegion = (
  regions: CommunityRecentRegion[],
  region: CommunityRecentRegion,
): CommunityRecentRegion[] =>
  [region, ...regions.filter(item => !isSameRegion(item, region))].slice(
    0,
    COMMUNITY_RECENT_REGIONS_LIMIT,
  )

export const readCommunityRecentRegions = (
  storage: Pick<Storage, 'getItem'>,
): CommunityRecentRegion[] => {
  try {
    return parseCommunityRecentRegions(
      storage.getItem(COMMUNITY_RECENT_REGIONS_KEY),
    )
  } catch {
    return []
  }
}

/** 기록하고 갱신된 목록을 돌려준다. 쓰기에 실패해도 이번 화면에는 방금 본 지역을 보여 준다. */
export const saveCommunityRecentRegion = (
  storage: Pick<Storage, 'getItem' | 'setItem'>,
  region: CommunityRecentRegion,
): CommunityRecentRegion[] => {
  const next = addCommunityRecentRegion(
    readCommunityRecentRegions(storage),
    region,
  )

  try {
    storage.setItem(COMMUNITY_RECENT_REGIONS_KEY, JSON.stringify(next))
  } catch {
    // 저장 실패는 보조 기능 실패다 — 화면을 막지 않는다.
  }

  return next
}
