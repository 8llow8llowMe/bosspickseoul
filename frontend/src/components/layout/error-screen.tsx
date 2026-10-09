'use client'

import { useEffect } from 'react'
import { Button, ButtonLink } from '@/components/ui/button'
import { statusScreenCopy as copy } from '@/lib/layout/status-screen-copy'
import StatusScreen from './status-screen'

type ErrorScreenProps = {
  error: Error & { digest?: string }
  retry: () => void
}

/* 오류 상세는 화면에 내지 않고 콘솔에만 남긴다. */
export default function ErrorScreen({ error, retry }: ErrorScreenProps) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <StatusScreen
      description={copy.errorDescription}
      primary={<Button onClick={() => retry()}>{copy.retryAction}</Button>}
      secondary={
        <ButtonLink href="/" variant="secondary">
          {copy.homeAction}
        </ButtonLink>
      }
      title={copy.errorTitle}
    />
  )
}
