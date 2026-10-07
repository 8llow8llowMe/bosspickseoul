import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import SocialSignupConsentPage from '@/components/auth/social-signup-consent-page'
import { resolveSocialSignupQuery } from '@/lib/auth/social-state'
import { createPageMetadata } from '@/lib/metadata'

export const metadata: Metadata = createPageMetadata({
  title: '카카오로 가입',
  description: '약관에 동의하고 카카오 계정으로 BossPickSeoul 가입을 마칩니다.',
  path: '/register/social',
  index: false,
})

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

/**
 * 카카오 첫 가입 동의 화면 (#495). 소셜 콜백이 `AUTH_021`/`AUTH_022` 일 때 보낸다.
 * 쿼리는 서버에서 거른다 — 지원하지 않는 provider 면 이메일 가입으로 보낸다.
 */
export default async function Page({ searchParams }: PageProps) {
  const query = resolveSocialSignupQuery(await searchParams)
  if (!query) redirect('/register')
  return (
    <SocialSignupConsentPage reason={query.reason} returnTo={query.returnTo} />
  )
}
