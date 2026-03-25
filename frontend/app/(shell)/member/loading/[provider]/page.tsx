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
    description: '소셜 로그인 정보를 확인하고 가입 또는 홈으로 이어집니다.',
    path: `/member/loading/${provider}`,
    index: false,
  })
}

export default async function Page({ params }: PageProps) {
  const { provider } = await params

  return <SocialLoadingPage provider={provider} />
}
