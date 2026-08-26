import { Suspense } from 'react'
import type { Metadata } from 'next'
import ShareEntryPage from '@/components/share/share-entry-page'
import { createPageMetadata } from '@/lib/metadata'

type PageProps = {
  params: Promise<{ shareCode: string }>
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { shareCode } = await params

  return createPageMetadata({
    title: '공유된 분석 화면',
    description: '공유받은 상권 분석 화면을 엽니다.',
    path: `/s/${shareCode}`,
    index: false,
  })
}

export default async function Page({ params }: PageProps) {
  const { shareCode } = await params

  return (
    <Suspense fallback={null}>
      <ShareEntryPage shareCode={shareCode} />
    </Suspense>
  )
}
