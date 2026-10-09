import type { Metadata } from 'next'
import NotFoundScreen from '@/components/layout/not-found-screen'
import { statusScreenCopy } from '@/lib/layout/status-screen-copy'

export const metadata: Metadata = {
  title: statusScreenCopy.notFoundMetaTitle,
}

/* (shell) 안에서 notFound() 를 부르면 이 화면이 이미 있는 셸 안에 그려진다. 셸을 다시 두르지 않는다. */
export default function ShellNotFound() {
  return <NotFoundScreen />
}
