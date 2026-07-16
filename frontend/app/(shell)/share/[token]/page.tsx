import type { Metadata } from 'next'
import SharedSimulationReportPage from '@/components/simulation/shared-simulation-report-page'
import { createPageMetadata } from '@/lib/metadata'

type PageProps = {
  params: Promise<{
    token: string
  }>
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { token } = await params

  return createPageMetadata({
    title: '공유된 창업 시뮬레이션',
    description: '공유받은 창업 시뮬레이션 리포트를 확인합니다.',
    path: `/share/${token}`,
    index: false,
  })
}

export default async function Page({ params }: PageProps) {
  const { token } = await params

  return <SharedSimulationReportPage token={token} />
}
