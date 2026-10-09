import type { Metadata } from 'next'
import NotFoundScreen from '@/components/layout/not-found-screen'
import SiteFooter from '@/components/layout/site-footer'
import SiteHeader from '@/components/layout/site-header'
import SiteShell from '@/components/layout/site-shell'
import { statusScreenCopy } from '@/lib/layout/status-screen-copy'

export const metadata: Metadata = {
  title: statusScreenCopy.notFoundMetaTitle,
}

/*
  매칭되는 라우트가 없는 주소용이다. 루트 레이아웃 안이지만 (shell) 레이아웃 밖이라 셸을 여기서 직접 두른다
  (layout.tsx 의 ShellLayout 과 같은 조합). (shell) 안의 notFound() 는 (shell)/not-found.tsx 가 받아 셸이 두 번 나오지 않는다.
*/
export default function NotFound() {
  return (
    <SiteShell footer={<SiteFooter />} header={<SiteHeader />}>
      <NotFoundScreen />
    </SiteShell>
  )
}
