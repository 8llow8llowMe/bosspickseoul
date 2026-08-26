import type { Metadata } from 'next'

import { createPageMetadata } from '@/lib/metadata'

export const metadata: Metadata = createPageMetadata({
  title: '상권분석',
  description: '서울 상권과 업종을 선택해 상권 데이터를 분석합니다.',
  path: '/analysis',
  index: false,
})

/**
 * `/analysis` — 탐색 화면. 본문이 `null` 인 이유: 지도·선택 패널·바텀시트·AI 슬롯을
 * 전부 지도 셸 레이아웃이 소유하고, 이 라우트는 "셸 위에 올릴 레이어가 없음"만
 * 뜻한다. `Suspense` 경계와 준비 중 폴백은 셸 쪽에 있다.
 */
export default function Page() {
  return null
}
