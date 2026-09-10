const relativeFormatter = new Intl.RelativeTimeFormat('ko', {
  numeric: 'auto',
})

const dateFormatter = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const compactNumberFormatter = new Intl.NumberFormat('ko-KR')

const resolveDate = (value: string) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export const formatCommunityDate = (value: string) => {
  const date = resolveDate(value)

  if (!date) {
    return '날짜 정보 없음'
  }

  return dateFormatter.format(date)
}

export const formatRelativeTime = (value: string) => {
  const date = resolveDate(value)

  if (!date) {
    return '방금 전'
  }

  const diffMs = date.getTime() - Date.now()
  const diffMinutes = Math.round(diffMs / (1000 * 60))

  if (Math.abs(diffMinutes) < 1) {
    return '방금 전'
  }

  if (Math.abs(diffMinutes) < 60) {
    return relativeFormatter.format(diffMinutes, 'minute')
  }

  const diffHours = Math.round(diffMinutes / 60)

  if (Math.abs(diffHours) < 24) {
    return relativeFormatter.format(diffHours, 'hour')
  }

  const diffDays = Math.round(diffHours / 24)

  if (Math.abs(diffDays) < 7) {
    return relativeFormatter.format(diffDays, 'day')
  }

  return formatCommunityDate(value)
}

export const formatCommunityCount = (value: number) =>
  compactNumberFormatter.format(value)

export const getCommunityExcerpt = (value: string, maxLength = 120) => {
  const normalized = value.replace(/\s+/g, ' ').trim()

  if (normalized.length <= maxLength) {
    return normalized
  }

  return `${normalized.slice(0, maxLength).trimEnd()}...`
}

export const buildCommunityMetadataDescription = (
  targetName: string | null | undefined,
  content: string,
) =>
  `${targetName?.trim() || '서울 창업'} 커뮤니티 게시글 · ${getCommunityExcerpt(content, 90)}`

/**
 * 작성자를 알 수 없을 때 적는 말. 백엔드가 `writerNickname` 을 null 로 내리는 경우는
 * 회원 서비스 장애·미존재 회원 두 가지다(BE #271). 둘 다 사용자가 고칠 수 없는 상태라
 * 오류로 보이게 하지 않고, 닉네임이 없던 시절과 같은 호칭으로 자리를 채운다.
 *
 * 탈퇴 회원은 백엔드가 `"탈퇴회원"` 을 **값으로** 내리므로 여기서 다루지 않는다 —
 * 받은 대로 적는다.
 */
export const COMMUNITY_WRITER_FALLBACK = '사장님'

export const formatCommunityWriter = (
  nickname: string | null | undefined,
): string => nickname?.trim() || COMMUNITY_WRITER_FALLBACK

/**
 * 이니셜 아바타의 글자. 프로필 이미지가 없을 때 첫 글자를 보여 준다 — 헤더·프로필의
 * `Avatar` 가 쓰는 규칙과 같다. 닉네임이 없으면 대체 문구의 첫 글자다.
 */
export const getCommunityWriterInitial = (
  nickname: string | null | undefined,
): string => formatCommunityWriter(nickname).slice(0, 1)
