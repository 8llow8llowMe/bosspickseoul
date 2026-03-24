import type { Metadata } from 'next'
import HomePage from '@/components/home/home-page'
import { createPageMetadata } from '@/lib/metadata'

export const metadata: Metadata = createPageMetadata({
  title: '상권 데이터와 창업 의사결정을 연결하는 프론트엔드',
  description:
    'NowDoBoss V2는 상권 데이터 탐색, 창업 분석, 추천, 커뮤니티 기능을 Next.js 기반으로 재구성하는 프론트엔드입니다.',
  path: '/',
  index: true,
})

export default function Page() {
  return <HomePage />
}
