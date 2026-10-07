'use client'

import styled from 'styled-components'

import { Badge } from '@/components/ui/badge'
import type { CommunityMetadata } from '@/types/community'

/*
  말머리 배지(#529) — 목록 행·상세 머리가 같이 쓴다. 공통 Badge 의 grey 톤 그대로다(새 토큰 없음).
  파란 쪽은 지역(행의 지역 글자 · 상세 지역 칩)과 `글쓴이` 배지가 쓰고 있어, 말머리까지 파랗게 하면
  「어디 이야기」와 「무슨 이야기」가 한 색으로 섞인다.
*/
const CategoryBadge = styled(Badge)`
  flex: 0 0 auto;
`

export type CommunityCategoryBadgeProps = {
  /** 응답 `category`. null(말머리 없음)·없음(옛 BE 응답)이면 아무것도 그리지 않는다. */
  category: CommunityMetadata | undefined
}

/**
 * 문구는 서버 `category.name` 을 그대로 적는다 — code 로 분기하지 않으므로 FE 가 모르는 말머리가
 * 와도 이름은 보인다.
 */
export default function CommunityCategoryBadge({
  category,
}: CommunityCategoryBadgeProps) {
  const name = category?.name?.trim()

  if (!category || !name) {
    return null
  }

  return (
    <CategoryBadge $tone="grey" data-community-category={category.code}>
      {name}
    </CategoryBadge>
  )
}
