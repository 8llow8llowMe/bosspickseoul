'use client'

import ErrorScreen from '@/components/layout/error-screen'

/* (shell) 레이아웃 안에서 터진 렌더 오류용이다. 레이아웃은 살아 있어 헤더·푸터가 그대로 보인다. */
export default function ShellError(props: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  return <ErrorScreen {...props} />
}
