import type { Metadata } from 'next'
import SocialLoadingPage from '@/components/auth/social-loading-page'
import { createPageMetadata } from '@/lib/metadata'

type PageProps = {
  params: Promise<{
    provider: string
  }>
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { provider } = await params

  return createPageMetadata({
    title: '소셜 로그인 확인',
    description:
      '소셜 인증 후 NowDoBoss 세션을 동기화하는 중간 처리 화면입니다.',
    path: `/member/loading/${provider}`,
    index: false,
  })
}

export default async function Page({ params }: PageProps) {
  const { provider } = await params

  return <SocialLoadingPage provider={provider} />
}
