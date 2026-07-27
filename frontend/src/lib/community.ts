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
