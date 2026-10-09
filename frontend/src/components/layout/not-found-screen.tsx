'use client'

import { ButtonLink } from '@/components/ui/button'
import { statusScreenCopy as copy } from '@/lib/layout/status-screen-copy'
import StatusScreen from './status-screen'

export default function NotFoundScreen() {
  return (
    <StatusScreen
      description={copy.notFoundDescription}
      primary={<ButtonLink href="/analysis">{copy.analysisAction}</ButtonLink>}
      secondary={
        <ButtonLink href="/" variant="secondary">
          {copy.homeAction}
        </ButtonLink>
      }
      title={copy.notFoundTitle}
    />
  )
}
