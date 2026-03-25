import type { Metadata } from 'next'
import HomePage from '@/components/home/home-page'
import { createPageMetadata } from '@/lib/metadata'

export const metadata: Metadata = createPageMetadata({
  title: '서울 상권 데이터 분석과 창업 판단을 한 곳에서',
  description:
    '서울 상권 현황 확인부터 상권분석, 추천, 창업 시뮬레이션, 커뮤니티까지 이어지는 흐름을 NowDoBoss에서 한 번에 시작할 수 있습니다.',
  path: '/',
  index: true,
})

export default function Page() {
  return <HomePage />
}
