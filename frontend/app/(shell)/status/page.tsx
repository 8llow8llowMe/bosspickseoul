import type { Metadata } from 'next'
import StatusPage from '@/components/status/status-page'
import { createPageMetadata } from '@/lib/metadata'

export const metadata: Metadata = createPageMetadata({
  title: '구별 상권 현황',
  description:
    '서울 25개 자치구의 유동인구, 평균매출, 개업률, 폐업률과 상세 지표를 한 화면에서 비교합니다.',
  path: '/status',
  index: true,
})

export default function Page() {
  return <StatusPage />
}
