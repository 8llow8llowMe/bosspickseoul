'use client'

import AuthSessionHydrator from '@/components/auth/auth-session-hydrator'
import QueryProvider from '@/providers/query-provider'

type AppProvidersProps = {
  children: React.ReactNode
}

export default function AppProviders({ children }: AppProvidersProps) {
  return (
    <QueryProvider>
      <AuthSessionHydrator />
      {children}
    </QueryProvider>
  )
}
