import type { Metadata } from 'next'
import StatusPage from '@/components/status/status-page'
import { createPageMetadata } from '@/lib/metadata'

export const metadata: Metadata = createPageMetadata({
  title: '구별 상권 Top 10',
  description:
    '서울의 유동인구, 매출, 개업, 폐업 지표별 상위 10개 지역과 상세 상권 정보를 확인합니다.',
  path: '/status',
  index: true,
})

export default function Page() {
  return <StatusPage />
}
